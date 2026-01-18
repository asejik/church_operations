import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type InventoryItem } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, Package, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

// --- ADD ITEM MODAL ---
const AddInventoryModal = ({ isOpen, onClose, onComplete }: { isOpen: boolean; onClose: () => void; onComplete: () => void }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    item_name: '',
    condition: 'good',
    quantity: 1,
    date_purchased: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = async () => {
    if (!profile?.unit_id || !formData.item_name) return;
    setLoading(true);
    try {
      const newItem = {
        unit_id: profile.unit_id,
        item_name: formData.item_name,
        condition: formData.condition || 'good',
        quantity: Number(formData.quantity),
        date_purchased: formData.date_purchased,
        notes: formData.notes,
      };

      // 1. Save to Cloud (Removed unused 'data')
      const { error } = await supabase.from('inventory').insert(newItem);
      if (error) throw error;

      // 2. Save to Local
      await db.inventory.add({ ...newItem, synced: 1 });

      toast.success("Item saved to cloud");
      onComplete();
      onClose();
      // Reset Form
      setFormData({
        item_name: '',
        condition: 'good',
        quantity: 1,
        date_purchased: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Item">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={formData.item_name}
            onChange={e => setFormData({ ...formData, item_name: e.target.value })}
            placeholder="e.g. Sony Camera"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Condition</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={formData.condition}
              onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="faulty">Faulty</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            rows={2}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Serial number, location, etc."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save Item</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE ---
export const InventoryPage = () => {
  const { data: profile } = useProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Live Query (Local Data)
  const items = useLiveQuery(() => {
    if (!searchQuery) return db.inventory.toArray();
    return db.inventory.filter(i => i.item_name.toLowerCase().includes(searchQuery.toLowerCase())).toArray();
  }, [searchQuery]);

  // 2. Sync Logic (Fetch Cloud Data)
  useEffect(() => {
    const syncInventory = async () => {
      if (!profile?.unit_id) return;

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('unit_id', profile.unit_id);

      if (error) {
        console.error("Sync error:", error); // Used 'error' here to fix warning
        return;
      }

      if (data) {
        await db.inventory.clear();
        await db.inventory.bulkPut(data.map((i: any) => ({ ...i, synced: 1 })));
      }
    };
    syncInventory();
  }, [profile?.unit_id]);

  const getConditionBadge = (c: string) => {
    if (c === 'new' || c === 'good') return 'bg-green-100 text-green-700 border-green-200';
    if (c === 'fair') return 'bg-blue-50 text-blue-700 border-blue-100';
    return 'bg-red-50 text-red-700 border-red-100';
  };

  const getConditionIcon = (c: string) => {
    if (c === 'new' || c === 'good') return <CheckCircle className="mr-1.5 h-3 w-3" />;
    if (c === 'fair') return <HelpCircle className="mr-1.5 h-3 w-3" />;
    return <AlertTriangle className="mr-1.5 h-3 w-3" />;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500">Manage unit equipment</p>
        </div>
        {profile?.role !== 'unit_pastor' && ( <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button> )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search equipment..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <th className="px-4 py-4 w-12 border-r border-slate-100">S/N</th>
                <th className="px-4 py-4 border-r border-slate-100">Item Name</th>
                <th className="px-4 py-4 border-r border-slate-100">Condition</th>
                <th className="px-4 py-4 border-r border-slate-100 text-center">Qty</th>
                <th className="px-4 py-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items?.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                     <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                     No items found.
                   </td>
                 </tr>
              ) : (
                items?.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 text-xs border-r border-slate-100">
                      {(i + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                      {item.item_name}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-100">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border capitalize ${getConditionBadge(item.condition)}`}>
                        {getConditionIcon(item.condition)}
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700 border-r border-slate-100">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={item.notes}>
                      {item.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddInventoryModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onComplete={() => {}} />
    </div>
  );
};