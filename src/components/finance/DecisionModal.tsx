import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onComplete: () => void;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({ isOpen, onClose, request, onComplete }) => {
  const { data: profile } = useProfile();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | 'acknowledge' | null>(null);

  if (!request) return null;

  const handleAcknowledge = async () => {
    setLoading('acknowledge');
    try {
      const { error } = await supabase
        .from('financial_requests')
        .update({
          is_acknowledged: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      // Silently attempt to send a notification to the requester without breaking the app
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: request.requester_id,
        title: 'Request Acknowledged',
        message: `Your financial request for "${request.purpose}" has been seen and is under review.`,
        type: 'finance',
        is_read: false
      });

      if (notifError) {
        console.warn("Failed to send notification, but acknowledgement succeeded:", notifError);
      }

      toast.success("Request acknowledged successfully");
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error("Failed to acknowledge request");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !comment) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    // Guard clause to ensure we have the reviewer's ID
    if (!profile?.id) {
      toast.error("User profile not loaded. Please try again.");
      return;
    }

    setLoading(status === 'approved' ? 'approve' : 'reject');
    try {
      const { error } = await supabase
        .from('financial_requests')
        .update({
          status: status,
          admin_comment: comment,
          reviewed_by: profile.id, // <--- CRITICAL: Saving who did it
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (error) throw error;

      toast.success(`Request ${status} successfully`);
      onComplete();
      onClose();
      setComment('');
    } catch (err: any) {
      toast.error("Failed to update request");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Request">
      <div className="space-y-6">
        {/* Request Summary Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Unit</p>
              <p className="font-semibold text-slate-900">{request.units?.name}</p>
              <p className="text-xs text-slate-500">{request.profiles?.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-500 uppercase">Amount</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(request.amount)}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Purpose</p>
            <p className="text-sm font-medium text-slate-900">
              {request.is_urgent && <span className="mr-2 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-100">URGENT</span>}
              {request.purpose}
            </p>
            <p className="text-xs text-slate-600 mt-1">{request.description}</p>
          </div>
        </div>

        {/* Acknowledge Button (Only shows if pending and NOT yet acknowledged) */}
        {request.status === 'pending' && !request.is_acknowledged && (
          <div className="pb-4 border-b border-slate-100">
            <Button
              onClick={handleAcknowledge}
              isLoading={loading === 'acknowledge'}
              className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              variant="outline"
            >
              <Eye className="mr-2 h-4 w-4" /> Acknowledge Receipt
            </Button>
          </div>
        )}

        {/* Admin Input */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Admin Comment</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 min-h-[80px]"
            placeholder="e.g. Approved. Funds will be disbursed on Friday."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <AlertCircle className="h-3 w-3" />
            <span>Comment is required if rejecting.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => handleDecision('rejected')}
            isLoading={loading === 'reject'}
            className="flex-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          >
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button
            onClick={() => handleDecision('approved')}
            isLoading={loading === 'approve'}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
};