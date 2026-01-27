import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Star, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: () => void;
  members: any[];
  unitId: string;
}

// Internal Component for a single Rating Row
const RatingRow = ({
  label,
  value,
  comment,
  onChangeValue,
  onChangeComment
}: {
  label: string;
  value: number;
  comment: string;
  onChangeValue: (v: number) => void;
  onChangeComment: (v: string) => void;
}) => {
  const [showComment, setShowComment] = useState(!!comment);

  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChangeValue(star)}
              className="p-1 focus:outline-none transition-transform hover:scale-110"
            >
              <Star className={`h-5 w-5 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
            </button>
          ))}
        </div>
      </div>

      {!showComment && (
        <button
          type="button"
          onClick={() => setShowComment(true)}
          className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          <MessageSquare className="h-3 w-3" /> Add Note
        </button>
      )}

      {showComment && (
        <input
          type="text"
          placeholder={`Comment for ${label}...`}
          className="w-full mt-1 text-xs border-b border-slate-200 bg-transparent py-1 outline-none focus:border-blue-400 placeholder:text-slate-300"
          value={comment}
          onChange={(e) => onChangeComment(e.target.value)}
        />
      )}
    </div>
  );
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  onReviewSubmitted,
  members,
  unitId
}) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM

    // Ratings
    rating_punctuality: 0,
    rating_communication: 0,
    rating_commitment: 0,
    rating_teamwork: 0,
    rating_responsibility: 0,
    rating_spiritual: 0,

    // Specific Comments
    comment_punctuality: '',
    comment_communication: '',
    comment_commitment: '',
    comment_teamwork: '',
    comment_responsibility: '',
    comment_spiritual: '',

    comment: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId || !formData.member_id) {
      toast.error("Please select a member");
      return;
    }

    if (
      !formData.rating_punctuality || !formData.rating_communication ||
      !formData.rating_commitment || !formData.rating_teamwork ||
      !formData.rating_responsibility || !formData.rating_spiritual
    ) {
      toast.error("Please rate all 6 categories");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('performance_reviews').insert({
        unit_id: unitId,
        member_id: formData.member_id,
        reviewer_id: profile?.id,
        review_date: new Date().toISOString().split('T')[0], // Today
        month: `${formData.month}-01`, // Target Review Month

        rating_punctuality: formData.rating_punctuality,
        rating_communication: formData.rating_communication,
        rating_commitment: formData.rating_commitment,
        rating_teamwork: formData.rating_teamwork,
        rating_responsibility: formData.rating_responsibility,
        rating_spiritual: formData.rating_spiritual,

        comment_punctuality: formData.comment_punctuality,
        comment_communication: formData.comment_communication,
        comment_commitment: formData.comment_commitment,
        comment_teamwork: formData.comment_teamwork,
        comment_responsibility: formData.comment_responsibility,
        comment_spiritual: formData.comment_spiritual,

        comment: formData.comment
      });

      if (error) throw error;

      toast.success("Review submitted successfully");
      onReviewSubmitted();
      onClose();

      // Reset form
      setFormData(prev => ({
        ...prev, member_id: '', comment: '',
        rating_punctuality: 0, rating_communication: 0, rating_commitment: 0,
        rating_teamwork: 0, rating_responsibility: 0, rating_spiritual: 0,
        comment_punctuality: '', comment_communication: '', comment_commitment: '',
        comment_teamwork: '', comment_responsibility: '', comment_spiritual: ''
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Performance Review">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
           <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase">Member</label>
            <select
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
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
            <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase">Review Month</label>
            <Input
              type="month"
              value={formData.month}
              onChange={e => setFormData({...formData, month: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase text-slate-400">Scorecard</h3>
          <div className="space-y-1">
            <RatingRow
              label="Punctuality"
              value={formData.rating_punctuality}
              comment={formData.comment_punctuality}
              onChangeValue={v => setFormData(p => ({...p, rating_punctuality: v}))}
              onChangeComment={v => setFormData(p => ({...p, comment_punctuality: v}))}
            />
            <RatingRow
              label="Communication"
              value={formData.rating_communication}
              comment={formData.comment_communication}
              onChangeValue={v => setFormData(p => ({...p, rating_communication: v}))}
              onChangeComment={v => setFormData(p => ({...p, comment_communication: v}))}
            />
            <RatingRow
              label="Commitment to Service"
              value={formData.rating_commitment}
              comment={formData.comment_commitment}
              onChangeValue={v => setFormData(p => ({...p, rating_commitment: v}))}
              onChangeComment={v => setFormData(p => ({...p, comment_commitment: v}))}
            />
            <RatingRow
              label="Teamwork"
              value={formData.rating_teamwork}
              comment={formData.comment_teamwork}
              onChangeValue={v => setFormData(p => ({...p, rating_teamwork: v}))}
              onChangeComment={v => setFormData(p => ({...p, comment_teamwork: v}))}
            />
            <RatingRow
              label="Responsibility & Reliability"
              value={formData.rating_responsibility}
              comment={formData.comment_responsibility}
              onChangeValue={v => setFormData(p => ({...p, rating_responsibility: v}))}
              onChangeComment={v => setFormData(p => ({...p, comment_responsibility: v}))}
            />
            <RatingRow
              label="Spiritual Attitude"
              value={formData.rating_spiritual}
              comment={formData.comment_spiritual}
              onChangeValue={v => setFormData(p => ({...p, rating_spiritual: v}))}
              onChangeComment={v => setFormData(p => ({...p, comment_spiritual: v}))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase">General Comments</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            rows={2}
            value={formData.comment}
            onChange={e => setFormData({...formData, comment: e.target.value})}
            placeholder="Overall observations..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Submit Review</Button>
        </div>
      </form>
    </Modal>
  );
};