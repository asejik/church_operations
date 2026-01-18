import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle } from 'lucide-react';

interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'approve' | 'reject';
  onConfirm: (comment: string) => void;
  isLoading: boolean;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen, onClose, type, onConfirm, isLoading
}) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(comment);
  };

  const isApprove = type === 'approve';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? "Approve Request" : "Reject Request"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          You are about to <strong className={isApprove ? "text-green-600" : "text-red-600"}>
            {isApprove ? "approve" : "reject"}
          </strong> this financial request.
          Please add a note for the Unit Head (optional but recommended).
        </p>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Admin Note</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={3}
            placeholder={isApprove ? "e.g. Approved, proceed with purchase." : "e.g. Budget exceeded, please revise."}
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className={`flex-1 ${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            isLoading={isLoading}
          >
            {isApprove ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
            Confirm {isApprove ? "Approval" : "Rejection"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};