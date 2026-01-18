import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Upload, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, onRequestCreated }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id) return;

    setLoading(true);
    try {
      let receiptUrl = null;

      // 1. Upload Image (if selected)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile.unit_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
      }

      // 2. Insert Database Record
      const { error: dbError } = await supabase
        .from('financial_requests')
        .insert({
          unit_id: profile.unit_id,
          requester_id: profile.id,
          amount: parseFloat(formData.amount),
          purpose: formData.purpose,
          description: formData.description,
          receipt_url: receiptUrl
        });

      if (dbError) throw dbError;

      toast.success("Request submitted successfully!");
      onRequestCreated();
      onClose();
      // Reset form
      setFormData({ amount: '', purpose: '', description: '' });
      setFile(null);

    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Financial Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Amount (₦)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              type="number"
              className="pl-10"
              placeholder="0.00"
              required
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Purpose</label>
          <Input
            placeholder="e.g. Battery for Mic"
            required
            value={formData.purpose}
            onChange={e => setFormData({...formData, purpose: e.target.value})}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Details</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            rows={3}
            placeholder="Additional context..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Attach Receipt (Optional)</label>
          <div className="relative">
            <input
              type="file"
              className="hidden"
              id="file-upload"
              accept="image/*"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            />
            <label
              htmlFor="file-upload"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-4 text-sm text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : "Tap to upload image"}
            </label>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full" isLoading={loading}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};