import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { User, Phone, Calendar, MessageSquare } from 'lucide-react';

interface AddSoulReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export const AddSoulReportModal: React.FC<AddSoulReportModalProps> = ({ isOpen, onClose, onReportSubmitted }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    member_id: '',
    date: new Date().toISOString().split('T')[0],
    convert_name: '',
    convert_phone: '',
    notes: ''
  });

  // Fetch members for the dropdown
  useEffect(() => {
    const fetchMembers = async () => {
      if (!profile?.unit_id || !isOpen) return;

      // Fetch members belonging to this unit
      const { data } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('unit_id', profile.unit_id)
        .order('full_name');

      setMembers(data || []);
    };
    fetchMembers();
  }, [profile?.unit_id, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id) return;
    if (!formData.member_id) {
      toast.error("Please select the Soul Winner");
      return;
    }

    setLoading(true);
    try {
      // 1. Get the Soul Winner's Name for backup (optional but good for quick display)
      const selectedMember = members.find(m => m.id === formData.member_id);

      // 2. Insert Single Record
      const { error } = await supabase.from('soul_reports').insert({
        unit_id: profile.unit_id,
        member_id: formData.member_id,
        soul_winner_name: selectedMember?.full_name, // Backup text name
        count: 1, // Always 1 per row now
        report_date: formData.date,
        convert_name: formData.convert_name,
        convert_phone: formData.convert_phone, // New Field
        notes: formData.notes
      });

      if (error) throw error;

      toast.success("Soul saved successfully!");
      onReportSubmitted();
      onClose();
      // Reset form
      setFormData({
        member_id: '',
        date: new Date().toISOString().split('T')[0],
        convert_name: '',
        convert_phone: '',
        notes: ''
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record New Soul">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 1. Soul Winner (Dropdown) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Soul Winner</label>
          <div className="relative">
             <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
             <select
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm outline-none focus:ring-2 focus:ring-pink-500/20"
                value={formData.member_id}
                onChange={e => setFormData({...formData, member_id: e.target.value})}
                required
              >
                <option value="">-- Select Member --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
          </div>
        </div>

        {/* 2. Date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Date Won</label>
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

        {/* 3. Convert Name */}
        <div>
           <label className="mb-1.5 block text-sm font-medium text-slate-700">Convert Name</label>
           <Input
              placeholder="Full Name of New Believer"
              value={formData.convert_name}
              onChange={e => setFormData({...formData, convert_name: e.target.value})}
              required
           />
        </div>

        {/* 4. Phone Number */}
        <div>
           <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone Number</label>
           <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                  type="tel"
                  className="pl-10"
                  placeholder="080..."
                  value={formData.convert_phone}
                  onChange={e => setFormData({...formData, convert_phone: e.target.value})}
              />
           </div>
        </div>

        {/* 5. Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Testimony / Notes</label>
          <div className="relative">
             <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
             <textarea
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500/20"
                rows={2}
                placeholder="Any key details..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              />
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" isLoading={loading}>
            Save Record
          </Button>
        </div>
      </form>
    </Modal>
  );
};