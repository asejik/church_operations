import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { Heart, Calendar } from 'lucide-react';

interface AddSoulReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export const AddSoulReportModal: React.FC<AddSoulReportModalProps> = ({ isOpen, onClose, onReportSubmitted }) => {
  const { data: profile } = useProfile();
  const members = useLiveQuery(() => db.members.toArray()); // Load members locally
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '',
    count: '',
    date: new Date().toISOString().split('T')[0],
    names: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id) return;
    if (!formData.member_id) {
      toast.error("Please select the member who won the souls");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('soul_reports').insert({
        unit_id: profile.unit_id,
        member_id: formData.member_id, // Link to specific member
        reporter_id: profile.id,
        count: parseInt(formData.count),
        report_date: formData.date,
        convert_names: formData.names,
        notes: formData.notes
      });

      if (error) throw error;

      toast.success("Hallelujah! Report submitted.");
      onReportSubmitted();
      onClose();
      // Reset form
      setFormData({
        member_id: '',
        count: '',
        date: new Date().toISOString().split('T')[0],
        names: '',
        notes: ''
      });
    } catch (err: any) {
      toast.error("Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Souls Won">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Member Selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Soul Winner (Member)</label>
          <select
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            value={formData.member_id}
            onChange={e => setFormData({...formData, member_id: e.target.value})}
            required
          >
            <option value="">-- Select Member --</option>
            {members?.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Number of Souls</label>
            <div className="relative">
              <Heart className="absolute left-3 top-3 h-5 w-5 text-pink-500" />
              <Input
                type="number"
                min="1"
                required
                className="pl-10"
                placeholder="0"
                value={formData.count}
                onChange={e => setFormData({...formData, count: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="date"
                className="pl-10"
                required
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Names of Converts</label>
          <Input
            placeholder="e.g. Mary, Emmanuel"
            value={formData.names}
            onChange={e => setFormData({...formData, names: e.target.value})}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Testimony / Notes</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={2}
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" isLoading={loading}>
            Submit Report
          </Button>
        </div>
      </form>
    </Modal>
  );
};