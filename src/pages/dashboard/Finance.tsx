import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Search, CheckCircle, XCircle, Clock, Loader2, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { CreateRequestModal } from '@/components/finance/CreateRequestModal';

export const FinancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();

  // Logic: SMR and Admin see ALL requests. Unit Heads see ONLY theirs.
  const isAdmin = profile?.role === 'admin_pastor' || profile?.role === 'smr';

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  // Data
  const [requests, setRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch Requests (Global or Unit-Specific)
      let reqQuery = supabase
        .from('financial_requests')
        .select(`
          *,
          units(name),
          profiles:requester_id(full_name)
        `);

      if (!isAdmin) {
        reqQuery = reqQuery.eq('unit_id', profile.unit_id);
      }

      const { data: reqData, error } = await reqQuery.order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(reqData || []);

      // 2. Fetch Units List (For Admin Filters)
      if (isAdmin) {
        const { data: unitsData } = await supabase.from('units').select('id, name').order('name');
        setUnits(unitsData || []);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.unit_id, isAdmin]);

  // --- FILTER LOGIC ---
  const filteredRequests = requests.filter(item => {
    // 1. Search Query
    const searchMatch =
      (item.purpose || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.units?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!searchMatch) return false;

    // 2. Unit Filter (Admin only)
    if (isAdmin && selectedUnit !== 'all') {
      if (item.unit_id !== selectedUnit) return false;
    }

    // 3. Date Filter
    if (selectedDate) {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      if (itemDate !== selectedDate) return false;
    }

    return true;
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Global Requests' : 'Financial Requests'}</h1>
           <p className="text-slate-500">{isAdmin ? 'Review and approve requests across all units' : 'Submit and track your funding requests'}</p>
        </div>
      </div>

      {/* --- FILTERS BAR --- */}
      <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search by unit, purpose..." : "Search requests..."}
              className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
         </div>

         <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {/* UNIT FILTER (Admin Only) */}
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

            {/* DATE FILTER */}
            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />

            {/* CLEAR FILTERS */}
            {(selectedUnit !== 'all' || selectedDate || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-slate-500 hover:text-red-500"
                onClick={() => { setSelectedUnit('all'); setSelectedDate(''); setSearchQuery(''); }}
              >
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}

            {/* NEW REQUEST BUTTON (Unit Pastors/Heads) */}
            {!isAdmin && profile?.role !== 'unit_pastor' && (
               <Button size="sm" className="h-10" onClick={() => setIsRequestModalOpen(true)}>
                 <Plus className="mr-2 h-4 w-4" /> New Request
               </Button>
             )}
         </div>
      </div>

      {/* --- REQUESTS TABLE --- */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : (
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <th className="px-4 py-3 w-12 text-center border-r border-slate-100">S/N</th>
              {isAdmin && <th className="px-4 py-3 border-r border-slate-100">Unit</th>}
              <th className="px-4 py-3 w-32 border-r border-slate-100 text-center">Status</th>
              <th className="px-4 py-3 border-r border-slate-100">Purpose</th>
              <th className="px-4 py-3 border-r border-slate-100">Details</th>
              <th className="px-4 py-3 border-r border-slate-100 text-right">Amount</th>
              <th className="px-4 py-3 w-24 text-right">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? ( <tr><td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">No requests found matching filters.</td></tr> ) : ( filteredRequests.map((req, index) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100">{(index + 1).toString().padStart(2, '0')}</td>

                    {isAdmin && (
                      <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                          {req.units?.name}
                          <div className="text-[10px] text-slate-500 font-normal">{req.profiles?.full_name}</div>
                      </td>
                    )}

                    <td className="px-4 py-3 text-center border-r border-slate-100">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${req.status === 'approved' || req.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {req.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                          {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {req.status === 'pending' && <Clock className="h-3 w-3" />}
                          {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">{req.purpose}</td>

                    <td className="px-4 py-3 text-slate-500 text-xs border-r border-slate-100 max-w-[200px]" title={req.description}>
                      <div className="truncate mb-1">{req.description || "—"}</div>
                      {req.admin_comment && (
                        <div className="mt-1 flex items-start gap-1 bg-amber-50 border border-amber-100 p-1.5 rounded-md text-[10px] text-amber-800">
                            <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                            <span className="font-medium">Admin: {req.admin_comment}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">{formatCurrency(req.amount)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs">{formatDate(req.created_at)}</td>
                  </tr>
                )))}
            </tbody>
          </table>
        )}
      </div>

      <CreateRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} onRequestCreated={fetchData} />
    </div>
  );
};