import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPLOYMENT_OPTIONS = ['Student', 'Employed', 'Self-employed', 'Unemployed'];
const NYSC_OPTIONS = ['Completed', 'Ongoing', 'Not Yet'];

export const AddMemberModal = ({ isOpen, onClose, onSuccess }: AddMemberModalProps) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    gender: 'male',
    role_in_unit: 'member',
    employment_status: [] as string[], // Array for checkboxes
    nysc_status: ''
  });

  const toggleEmployment = (option: string) => {
    setFormData(prev => {
      const current = prev.employment_status;
      if (current.includes(option)) {
        return { ...prev, employment_status: current.filter(i => i !== option) };
      } else {
        return { ...prev, employment_status: [...current, option] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!profile?.unit_id) return;
    if (!formData.full_name) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('members').insert({
        ...formData,
        unit_id: profile.unit_id,
        joined_clc: new Date().toISOString().split('T')[0],
        joined_workforce: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      toast.success("Member added successfully");
      onSuccess();
      onClose();
      setFormData({ full_name: '', phone_number: '', gender: 'male', role_in_unit: 'member', employment_status: [], nysc_status: '' });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add member: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Member">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
          <input
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={formData.full_name}
            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="e.g. John Doe"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
          <input
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={formData.phone_number}
            onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="080..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
            <select
              className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              value={formData.gender}
              onChange={e => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
            <select
              className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              value={formData.role_in_unit}
              onChange={e => setFormData({ ...formData, role_in_unit: e.target.value })}
            >
              <option value="member">Member</option>
              <option value="subunit_head">Subunit Head</option>
              <option value="unit_head">Unit Head</option>
            </select>
          </div>
        </div>

        {/* EMPLOYMENT STATUS (Checkboxes) */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Employment Status</label>
          <div className="grid grid-cols-2 gap-2">
            {EMPLOYMENT_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.employment_status.includes(opt)}
                  onChange={() => toggleEmployment(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* NYSC STATUS (Select) */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">NYSC Status</label>
          <select
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            value={formData.nysc_status}
            onChange={e => setFormData({ ...formData, nysc_status: e.target.value })}
          >
            <option value="">-- Select Status --</option>
            {NYSC_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save Member</Button>
        </div>
      </div>
    </Modal>
  );
};