import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Package, AlertTriangle, CheckCircle, HelpCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { AddItemModal } from '@/components/inventory/AddItemModal';

export const InventoryPage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();

  // FIX: SMR counts as Admin for Global View
  const isAdmin = profile?.role === 'admin_pastor' || profile?.role === 'smr';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInventory = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let query = supabase.from('inventory').select('*, units(name)');

      if (!isAdmin) {
        query = query.eq('unit_id', profile.unit_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);

      if (isAdmin) {
        const { data: unitsData } = await supabase.from('units').select('id, name').order('name');
        setUnits(unitsData || []);
      }

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
    return 'bg-amber-50 text-amber-700 border-amber-100';
  };

  const getConditionIcon = (c: string) => {
    if (c === 'new' || c === 'good') return <CheckCircle className="mr-1.5 h-3 w-3" />;
    if (c === 'fair') return <HelpCircle className="mr-1.5 h-3 w-3" />;
    return <AlertTriangle className="mr-1.5 h-3 w-3" />;
  };

  const formatDate = (date: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredItems = items
    .filter(item => {
      const matchesSearch =
        (item.item_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.notes?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.units?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (isAdmin && selectedUnit !== 'all' && item.unit_id !== selectedUnit) return false;

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Global Inventory' : 'Inventory'}</h1>
          <p className="text-slate-500">{isAdmin ? 'View equipment across all units' : 'Manage unit equipment'}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search equipment or units..." : "Search equipment..."}
              className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
         </div>

         <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {isAdmin && (
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 min-w-[140px]"
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
              >
                <option value="all">All Units</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}

            <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
            </select>

            {(selectedUnit !== 'all' || searchQuery || sortOrder !== 'newest') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-slate-500 hover:text-red-500"
                onClick={() => { setSelectedUnit('all'); setSortOrder('newest'); setSearchQuery(''); }}
              >
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}

            {!isAdmin && profile?.role !== 'unit_pastor' && (
              <Button size="sm" className="h-10" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
         </div>
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
                  <th className="px-4 py-4 border-r border-slate-100">Date Purchased</th> {/* NEW COLUMN */}
                  <th className="px-4 py-4 border-r border-slate-100">Condition</th>
                  <th className="px-4 py-4 border-r border-slate-100 text-center">Qty</th>
                  <th className="px-4 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                   <tr>
                     <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
                       <Package className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                       No items found matching filters.
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
                      {/* DATE PURCHASED CELL */}
                      <td className="px-4 py-3 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {formatDate(item.date_purchased)}
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