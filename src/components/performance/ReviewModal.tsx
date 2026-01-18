import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/Input';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void; // <--- Added callback to refresh dashboard
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onReviewSubmitted }) => {
  const { data: profile } = useProfile();
  const members = useLiveQuery(() => db.members.toArray());
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '',
    month: new Date().toISOString().slice(0, 7), // Default to current YYYY-MM
    punctuality: 0,
    commitment: 0,
    teamwork: 0,
    reliability: 0,
    spiritual_attitude: 0,
    comment: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id || !formData.member_id) {
      toast.error("Please select a member");
      return;
    }

    if (formData.punctuality === 0 || formData.commitment === 0 ||
        formData.teamwork === 0 || formData.reliability === 0 ||
        formData.spiritual_attitude === 0) {
      toast.error("Please rate all categories");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('performance_reviews').insert({
        unit_id: profile.unit_id,
        member_id: formData.member_id,
        reviewer_id: profile.id,
        month: `${formData.month}-01`, // Convert YYYY-MM to YYYY-MM-DD
        punctuality: formData.punctuality,
        commitment: formData.commitment,
        teamwork: formData.teamwork,
        reliability: formData.reliability,
        spiritual_attitude: formData.spiritual_attitude,
        comment: formData.comment
      });

      if (error) throw error;

      toast.success("Review submitted successfully");
      onReviewSubmitted();
      onClose();
      // Reset form (keep month same as it's likely they are doing batch entry)
      setFormData(prev => ({
        ...prev,
        member_id: '', punctuality: 0, commitment: 0, teamwork: 0,
        reliability: 0, spiritual_attitude: 0, comment: ''
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Monthly Performance Review">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Member</label>
            <select
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={formData.member_id}
              onChange={e => setFormData({...formData, member_id: e.target.value})}
            >
              <option value="">-- Choose Member --</option>
              {members?.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Review Month</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="month"
                className="pl-10"
                value={formData.month}
                onChange={e => setFormData({...formData, month: e.target.value})}
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <StarRating label="Punctuality" value={formData.punctuality} onChange={v => setFormData({...formData, punctuality: v})} />
          <StarRating label="Commitment" value={formData.commitment} onChange={v => setFormData({...formData, commitment: v})} />
          <StarRating label="Teamwork" value={formData.teamwork} onChange={v => setFormData({...formData, teamwork: v})} />
          <StarRating label="Reliability" value={formData.reliability} onChange={v => setFormData({...formData, reliability: v})} />
          <StarRating label="Spiritual Attitude" value={formData.spiritual_attitude} onChange={v => setFormData({...formData, spiritual_attitude: v})} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">General Comment</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={2}
            value={formData.comment}
            onChange={e => setFormData({...formData, comment: e.target.value})}
            placeholder="e.g. Needs to improve punctuality..."
          />
        </div>

        <Button type="submit" className="w-full" isLoading={loading}>
          Submit Review
        </Button>
      </form>
    </Modal>
  );
};