import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Check, X, Save, Calendar } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface SessionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  existingSessionId?: string | null;
  onSaveComplete?: () => void;
}

export const SessionEditor = ({ isOpen, onClose, existingSessionId, onSaveComplete }: SessionEditorProps) => {
  const { data: profile } = useProfile();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent', reason: string }>>({});
  const [loading, setLoading] = useState(false);

  // Fetch Members for this Unit
  const members = useLiveQuery(() =>
    profile?.unit_id ? db.members.where('unit_id').equals(profile.unit_id).toArray() : [],
  [profile]);

  // Load Initial Data (for Edit Mode)
  useEffect(() => {
    if (!members) return;

    const loadData = async () => {
      const initialMap: Record<string, { status: 'present' | 'absent', reason: string }> = {};

      // If editing, load logs from local DB first
      if (existingSessionId) {
        const logs = await db.attendanceLogs.where('event_id').equals(existingSessionId).toArray();
        if (logs.length > 0) setSessionDate(logs[0].event_date);

        logs.forEach(log => {
          initialMap[log.member_id] = { status: log.status, reason: log.reason || '' };
        });
      }

      // Initialize missing members as Present
      members.forEach(m => {
        if (!initialMap[m.id]) {
          initialMap[m.id] = { status: 'present', reason: '' };
        }
      });

      setAttendanceMap(initialMap);
    };

    loadData();
  }, [members, existingSessionId, isOpen]);

  // Handle Toggles
  const toggleStatus = (memberId: string) => {
    setAttendanceMap(prev => {
      const current = prev[memberId];
      const newStatus = current.status === 'present' ? 'absent' : 'present';
      return {
        ...prev,
        [memberId]: {
          ...current,
          status: newStatus,
          reason: newStatus === 'present' ? '' : current.reason
        }
      };
    });
  };

  const updateReason = (memberId: string, text: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], reason: text }
    }));
  };

  // Save Logic (Cloud + Local)
  const handleSave = async () => {
    if (!profile?.unit_id || !members) return;
    setLoading(true);

    try {
      const eventId = existingSessionId || `session-${Date.now()}`;

      // 1. Prepare Data Payload
      const logsToSave = members.map(m => ({
        member_id: m.id,
        unit_id: profile.unit_id!, // Non-null assertion since we checked above
        event_id: eventId,
        event_date: sessionDate,
        status: attendanceMap[m.id].status,
        reason: attendanceMap[m.id].reason,
      }));

      // 2. Sync to Supabase (Cloud)
      // Strategy: Delete existing cloud records for this session, then insert new ones.
      if (existingSessionId) {
         await supabase.from('attendance').delete().eq('event_id', existingSessionId);
      }

      const { error } = await supabase.from('attendance').insert(logsToSave);
      if (error) throw error;

      // 3. Update Dexie (Local Cache)
      if (existingSessionId) {
        const oldLogs = await db.attendanceLogs.where('event_id').equals(existingSessionId).toArray();
        // @ts-ignore - Dexie types can be strict about undefined IDs, but bulkDelete handles arrays of keys
        await db.attendanceLogs.bulkDelete(oldLogs.map(l => l.id));
      }

      // Mark as synced locally
      await db.attendanceLogs.bulkPut(logsToSave.map(l => ({ ...l, synced: 1 })));

      toast.success("Session saved successfully!");
      if (onSaveComplete) onSaveComplete();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to sync. Check internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(x => x.status === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(x => x.status === 'absent').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingSessionId ? "Edit Session" : "New Attendance Session"}>
      <div className="space-y-4 max-h-[80vh] flex flex-col">
        {/* Header Stats */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Session Date</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <span className="block font-bold text-green-600">{presentCount}</span>
              <span className="text-xs text-slate-500">Present</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-red-600">{absentCount}</span>
              <span className="text-xs text-slate-500">Absent</span>
            </div>
          </div>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {members?.map(member => {
            const state = attendanceMap[member.id] || { status: 'present', reason: '' };
            const isPresent = state.status === 'present';

            return (
              <div key={member.id} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${isPresent ? 'bg-white border-slate-100' : 'bg-red-50 border-red-100'}`}>
                <button
                  onClick={() => toggleStatus(member.id)}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all ${
                    isPresent
                      ? 'bg-green-100 border-green-200 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 border-red-200 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {isPresent ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </button>

                <div className="flex-1 pt-1">
                  <p className={`font-medium ${isPresent ? 'text-slate-900' : 'text-red-900'}`}>{member.full_name}</p>

                  {!isPresent && (
                    <input
                      type="text"
                      placeholder="Reason (e.g. Sick, Traveled)"
                      className="mt-2 w-full rounded border border-red-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-red-400 placeholder:text-red-200"
                      value={state.reason}
                      onChange={(e) => updateReason(member.id, e.target.value)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} isLoading={loading}>
            <Save className="mr-2 h-4 w-4" />
            Save Session
          </Button>
        </div>
      </div>
    </Modal>
  );
};