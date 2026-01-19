import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  full_name: string;
}

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  members: Member[];
  onSuccess: () => void;
  // NEW PROPS FOR EDITING
  defaultDate?: string;
  initialStatuses?: Record<string, 'present' | 'absent'>;
}

export const NewSessionModal = ({
  isOpen,
  onClose,
  unitId,
  members,
  onSuccess,
  defaultDate,
  initialStatuses
}: NewSessionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, 'present' | 'absent'>>({});

  // Reset or Pre-fill when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultDate && initialStatuses) {
        // EDIT MODE: Use passed data
        setDate(defaultDate);
        setStatuses(initialStatuses);
      } else {
        // NEW MODE: Reset to today & empty
        setDate(new Date().toISOString().slice(0, 10));
        setStatuses({});
      }
    }
  }, [isOpen, defaultDate, initialStatuses]);

  const markAll = (status: 'present' | 'absent') => {
    const newStatuses: Record<string, 'present' | 'absent'> = {};
    members.forEach(m => {
      newStatuses[m.id] = status;
    });
    setStatuses(newStatuses);
  };

  const handleSubmit = async () => {
    const missing = members.filter(m => !statuses[m.id]);
    if (missing.length > 0) {
      toast.error(`Please mark attendance for: ${missing[0].full_name}`);
      return;
    }

    setLoading(true);
    try {
      const sessionId = crypto.randomUUID();

      const rows = members.map(m => ({
        unit_id: unitId,
        member_id: m.id,
        event_date: date,
        status: statuses[m.id],
        event_id: sessionId
      }));

      // Delete existing records for this date (overwrite)
      await supabase
        .from('attendance')
        .delete()
        .eq('unit_id', unitId)
        .eq('event_date', date);

      // Insert New/Updated Records
      const { error } = await supabase.from('attendance').insert(rows);
      if (error) throw error;

      toast.success("Attendance saved successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={defaultDate ? "Edit Session" : "New Attendance Session"}>
      <div className="space-y-4 max-h-[70vh] flex flex-col">
        {/* DATE PICKER (Disabled if editing to prevent conflicts) */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
          <input
            type="date"
            disabled={!!defaultDate} // Lock date if editing
            className="w-full rounded-md border-slate-200 text-sm p-2 outline-none focus:border-blue-500 border disabled:bg-slate-200 disabled:text-slate-500"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* BULK ACTIONS */}
        <div className="flex gap-2 justify-end">
          <button onClick={() => markAll('absent')} className="text-xs font-medium text-slate-400 hover:text-slate-600">Mark All Absent</button>
          <button onClick={() => markAll('present')} className="text-xs font-bold text-blue-600 hover:text-blue-700">Mark All Present</button>
        </div>

        {/* MEMBER LIST */}
        <div className="flex-1 overflow-y-auto border rounded-lg border-slate-100 divide-y divide-slate-100">
          {members.map(member => {
            const status = statuses[member.id];
            return (
              <div key={member.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                <span className="text-sm font-medium text-slate-700">{member.full_name}</span>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setStatuses(p => ({ ...p, [member.id]: 'present' }))}
                    className={`p-1.5 rounded-md transition-all ${status === 'present' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setStatuses(p => ({ ...p, [member.id]: 'absent' }))}
                    className={`p-1.5 rounded-md transition-all ${status === 'absent' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="pt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save Session</Button>
        </div>
      </div>
    </Modal>
  );
};