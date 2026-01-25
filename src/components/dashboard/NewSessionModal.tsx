import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Save, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  members: any[];
  onSuccess: () => void;
  defaultDate?: string;
  initialStatuses?: Record<string, 'present' | 'absent'>;
  initialReasons?: Record<string, string>; // <--- NEW PROP
  existingEventId?: string;
}

const ABSENCE_REASONS = ['Work', 'School', 'Travelled', 'Health', 'Official', 'None', 'Other'];

export const NewSessionModal = ({
  isOpen,
  onClose,
  unitId,
  members,
  onSuccess,
  defaultDate,
  initialStatuses,
  initialReasons, // <--- Destructure here
  existingEventId
}: NewSessionModalProps) => {

  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState('sunday_service');

  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent', reason: string }>>({});
  const [loading, setLoading] = useState(false);

  // Initialize Data
  useEffect(() => {
    if (isOpen) {
      setSessionDate(defaultDate || new Date().toISOString().split('T')[0]);

      const initialMap: Record<string, { status: 'present' | 'absent', reason: string }> = {};
      members.forEach(m => {
        const status = initialStatuses?.[m.id] || 'present';
        // USE SAVED REASON OR DEFAULT TO EMPTY
        const reason = initialReasons?.[m.id] || '';
        initialMap[m.id] = { status, reason };
      });
      setAttendanceMap(initialMap);
    }
  }, [isOpen, members, defaultDate, initialStatuses, initialReasons]);

  const setStatus = (memberId: string, status: 'present' | 'absent') => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        status,
        // Keep previous reason if switching back to absent, else clear
        reason: status === 'present' ? '' : prev[memberId].reason
      }
    }));
  };

  const setReason = (memberId: string, reason: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], reason }
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    const newMap: Record<string, { status: 'present' | 'absent', reason: string }> = {};
    members.forEach(m => {
      newMap[m.id] = { status, reason: status === 'present' ? '' : 'None' };
    });
    setAttendanceMap(newMap);
  };

  const handleSave = async () => {
    if (!unitId) return;
    setLoading(true);

    try {
      let targetEventId = existingEventId;

      // STEP 1: Ensure an EVENT exists
      if (!targetEventId) {
        let title = "Sunday Service";
        if (serviceType === 'midweek_service') title = "Midweek Service";
        if (serviceType === 'unit_meeting') title = "Unit Meeting";
        if (serviceType === 'family_meeting') title = "Family Meeting";
        if (serviceType === 'other') title = "Special Event";

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            unit_id: unitId,
            date: sessionDate,
            event_type: serviceType,
            title: title
          })
          .select()
          .single();

        if (eventError) throw eventError;
        targetEventId = eventData.id;
      }

      // STEP 2: Clean up old logs if editing
      if (existingEventId) {
         await supabase.from('attendance').delete().eq('event_id', targetEventId);
      }

      // STEP 3: Prepare Payload
      const logsToSave = members.map(m => {
        const record = attendanceMap[m.id];
        return {
          event_id: targetEventId,
          unit_id: unitId,
          member_id: m.id,
          status: record.status,
          reason: record.status === 'absent' ? record.reason : null,
          event_date: sessionDate
        };
      });

      const { error: attError } = await supabase.from('attendance').insert(logsToSave);
      if (attError) throw attError;

      toast.success("Session saved successfully");
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter(s => s.status === 'present').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingEventId ? "Edit Session" : "New Attendance Session"}>
      <div className="space-y-4 max-h-[80vh] flex flex-col">

        {/* CONTROLS HEADER */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
             <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  className="w-full pl-9 pr-2 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white"
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                />
             </div>
           </div>

           <div>
             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Service Type</label>
             <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  className="w-full pl-9 pr-2 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-blue-500 bg-white appearance-none"
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  disabled={!!existingEventId}
                >
                  <option value="sunday_service">Sunday Service</option>
                  <option value="midweek_service">Midweek Service</option>
                  <option value="unit_meeting">Unit Meeting</option>
                  <option value="family_meeting">Family Meeting</option>
                  <option value="other">Other</option>
                </select>
             </div>
           </div>
        </div>

        {/* STATS & BULK ACTIONS */}
        <div className="flex items-center justify-between px-1">
           <div className="text-sm font-bold text-slate-700">
             {presentCount} <span className="text-slate-400 font-normal">Present</span>
           </div>
           <div className="flex gap-3 text-xs font-bold">
             <button onClick={() => markAll('absent')} className="text-slate-400 hover:text-slate-600 transition-colors">Mark All Absent</button>
             <button onClick={() => markAll('present')} className="text-blue-600 hover:text-blue-700 transition-colors">Mark All Present</button>
           </div>
        </div>

        {/* MEMBER LIST */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar min-h-[300px]">
          {members.map(member => {
            const record = attendanceMap[member.id] || { status: 'present', reason: '' };
            const isPresent = record.status === 'present';
            const isAbsent = record.status === 'absent';

            const isCustomReason = isAbsent && record.reason && !ABSENCE_REASONS.includes(record.reason) && record.reason !== 'Other';
            const showCustomInput = record.reason === 'Other' || isCustomReason;

            return (
              <div
                key={member.id}
                className={`flex flex-col border-b border-slate-50 last:border-none rounded-lg transition-colors group ${isAbsent ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}
              >
                {/* ROW MAIN CONTENT */}
                <div className="flex items-center justify-between py-3 px-2">
                  <span className={`font-medium text-sm ${isPresent ? 'text-slate-900' : 'text-slate-500'}`}>
                    {member.full_name}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus(member.id, 'present')}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border ${
                        isPresent
                          ? 'bg-green-600 border-green-600 text-white shadow-sm scale-105'
                          : 'bg-white border-slate-200 text-slate-300 hover:border-green-200 hover:text-green-500'
                      }`}
                    >
                      P
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatus(member.id, 'absent')}
                      className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all border ${
                        isAbsent
                          ? 'bg-slate-500 border-slate-500 text-white shadow-sm scale-105'
                          : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-500'
                      }`}
                    >
                      A
                    </button>
                  </div>
                </div>

                {/* ABSENCE REASONS TRAY */}
                {isAbsent && (
                  <div className="px-2 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ABSENCE_REASONS.map(reason => {
                        const isActive = record.reason === reason || (reason === 'Other' && isCustomReason);
                        return (
                          <button
                            key={reason}
                            onClick={() => setReason(member.id, reason)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                              isActive
                                ? 'bg-slate-700 text-white border-slate-700'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {reason}
                          </button>
                        );
                      })}
                    </div>

                    {showCustomInput && (
                      <input
                        type="text"
                        placeholder="Specify reason..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
                        autoFocus
                        value={isCustomReason ? record.reason : ''}
                        onChange={(e) => setReason(member.id, e.target.value || 'Other')}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} isLoading={loading} className="bg-slate-900 hover:bg-slate-800">
            <Save className="mr-2 h-4 w-4" />
            Save Session
          </Button>
        </div>
      </div>
    </Modal>
  );
};