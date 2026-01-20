import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Package, AlertTriangle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { AddItemModal } from '@/components/inventory/AddItemModal';

// --- MAIN PAGE ---
export const InventoryPage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const isAdmin = profile?.role === 'admin_pastor';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FETCH DATA (Online First)
  const fetchInventory = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase.from('inventory').select('*, units(name)'); // Join unit name

      // ADMIN: Fetch ALL.  OTHERS: Fetch UNIT only.
      if (!isAdmin) {
        query = query.eq('unit_id', profile.unit_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [profile?.unit_id, isAdmin]);

  const getConditionBadge = (c: string) => {
    if (c === 'new' || c === 'good') return 'bg-green-100 text-green-700 border-green-200';
    if (c === 'fair') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (c === 'faulty' || c === 'bad') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-amber-50 text-amber-700 border-amber-100'; // under_repair
  };

  const getConditionIcon = (c: string) => {
    if (c === 'new' || c === 'good') return <CheckCircle className="mr-1.5 h-3 w-3" />;
    if (c === 'fair') return <HelpCircle className="mr-1.5 h-3 w-3" />;
    return <AlertTriangle className="mr-1.5 h-3 w-3" />;
  };

  // Client-side filtering
  const filteredItems = items.filter(item =>
    (item.item_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (item.notes?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (item.units?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) // Allow admin search by unit
  );

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Global Inventory' : 'Inventory'}</h1>
          <p className="text-slate-500">{isAdmin ? 'View equipment across all units' : 'Manage unit equipment'}</p>
        </div>
        {/* Only Unit Head/Editor can add items. Admin cannot. */}
        {!isAdmin && profile?.role !== 'unit_pastor' && (
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder={isAdmin ? "Search equipment or units..." : "Search equipment..."}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="px-4 py-4 w-12 border-r border-slate-100">S/N</th>
                  {isAdmin && <th className="px-4 py-4 border-r border-slate-100">Unit</th>}
                  <th className="px-4 py-4 border-r border-slate-100">Item Name</th>
                  <th className="px-4 py-4 border-r border-slate-100">Condition</th>
                  <th className="px-4 py-4 border-r border-slate-100 text-center">Qty</th>
                  <th className="px-4 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                   <tr>
                     <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                       <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                       No items found.
                     </td>
                   </tr>
                ) : (
                  filteredItems.map((item, i) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs border-r border-slate-100">
                        {(i + 1).toString().padStart(2, '0')}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100">
                          {item.units?.name}
                        </td>
                      )}
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
          )}
        </div>
      </div>

      <AddItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onItemAdded={fetchInventory}
      />
    </div>
  );
};