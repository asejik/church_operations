import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onItemAdded }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '1',
    condition: 'good',
    date_purchased: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        item_name: '',
        quantity: '1',
        condition: 'good',
        date_purchased: new Date().toISOString().slice(0, 10),
        notes: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('inventory').insert({
        unit_id: profile.unit_id,
        item_name: formData.item_name,
        quantity: parseInt(formData.quantity),
        condition: formData.condition,
        date_purchased: formData.date_purchased,
        notes: formData.notes
      });

      if (error) throw error;

      toast.success("Item added to inventory");
      onItemAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Equipment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Item Name</label>
          <Input
            required
            placeholder="e.g. Bass Guitar Amp"
            value={formData.item_name}
            onChange={e => setFormData({...formData, item_name: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Quantity</label>
            <Input
              type="number"
              min="1"
              required
              value={formData.quantity}
              onChange={e => setFormData({...formData, quantity: e.target.value})}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Date Purchased</label>
            <Input
              type="date"
              required
              value={formData.date_purchased}
              onChange={e => setFormData({...formData, date_purchased: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Condition</label>
          <select
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            value={formData.condition}
            onChange={e => setFormData({...formData, condition: e.target.value})}
          >
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="faulty">Faulty</option>
            <option value="under_repair">Under Repair</option>
            <option value="bad">Completely Bad</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
          <Input
            placeholder="Serial number, location, etc."
            value={formData.notes}
            onChange={e => setFormData({...formData, notes: e.target.value})}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full" isLoading={loading}>
            Save Item
          </Button>
        </div>
      </form>
    </Modal>
  );
};