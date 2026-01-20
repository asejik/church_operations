import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, Clock, Loader2, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { CreateRequestModal } from '@/components/finance/CreateRequestModal';

// --- INTERFACE DEFINITION ---
interface AddLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

// --- MODAL: ADD LEDGER TRANSACTION (Unit Head Only) ---
const AddLedgerModal: React.FC<AddLedgerModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: 'expense',
    title: '',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async () => {
    if (!profile?.unit_id || !formData.amount || !formData.title) {
      toast.error("Please fill in Amount and Item Name");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('finances').insert({
        unit_id: profile.unit_id,
        type: formData.type,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        date: formData.date,
        status: 'approved'
      });
      if (error) throw error;
      toast.success("Saved to Cloud Ledger");
      onComplete();
      onClose();
      setFormData({ ...formData, amount: '', title: '', description: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Unit Ledger">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setFormData({ ...formData, type: 'income' })} className={`py-2 text-sm font-bold rounded-md transition-all ${formData.type === 'income' ? 'bg-white text-green-700 shadow' : 'text-slate-500'}`}>Income</button>
          <button onClick={() => setFormData({ ...formData, type: 'expense' })} className={`py-2 text-sm font-bold rounded-md transition-all ${formData.type === 'expense' ? 'bg-white text-red-700 shadow' : 'text-slate-500'}`}>Expense</button>
        </div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">Amount</label><input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold text-slate-900" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
        <div><label className="text-xs font-bold text-slate-500 uppercase">Item Name</label><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="" disabled>Select...</option>
              {formData.type === 'income' ? <><option>Offering</option><option>Donation</option><option>Other</option></> : <><option>Transport</option><option>Welfare</option><option>Equipment</option><option>Other</option></>}
            </select>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Date</label><input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} isLoading={loading}>Save</Button></div>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE ---
export const FinancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const isAdmin = profile?.role === 'admin_pastor';

  // Changed default state to 'requests' so it comes first
  const [activeTab, setActiveTab] = useState<'ledger' | 'requests'>('requests');
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  // Data
  const [ledgerItems, setLedgerItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]); // For filter dropdown
  const [loading, setLoading] = useState(false);

  // Redundant but safe: ensure admin always sees requests
  useEffect(() => {
    if (isAdmin) setActiveTab('requests');
  }, [isAdmin]);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch Ledger (Only if NOT admin)
      if (!isAdmin) {
        let query = supabase.from('finances').select('*').eq('unit_id', profile.unit_id);
        const { data: ledgerData } = await query.order('date', { ascending: false });
        setLedgerItems(ledgerData || []);
      }

      // 2. Fetch Requests (Global)
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

      // 3. Fetch Units List (For Admin Filters)
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
  const filterByUnitAndDate = (item: any, dateField: string) => {
    // 1. Search Query
    const searchMatch =
      (item.purpose || item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.units?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!searchMatch) return false;

    // 2. Unit Filter (Admin only)
    if (isAdmin && selectedUnit !== 'all') {
      if (item.unit_id !== selectedUnit) return false;
    }

    // 3. Date Filter
    if (selectedDate) {
      const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
      if (itemDate !== selectedDate) return false;
    }

    return true;
  };

  const filteredLedger = ledgerItems.filter(item => filterByUnitAndDate(item, 'date'));
  const filteredRequests = requests.filter(item => filterByUnitAndDate(item, 'created_at'));

  // Stats (Unit Only)
  const totalIncome = ledgerItems.filter(t => t.type === 'income').reduce((a, c) => a + Number(c.amount), 0);
  const totalExpense = ledgerItems.filter(t => t.type === 'expense').reduce((a, c) => a + Number(c.amount), 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Global Finances' : 'Finances & Budget'}</h1>
           <p className="text-slate-500">{isAdmin ? 'Review requests across all units' : 'Manage unit funds and admin requests'}</p>
        </div>

        {!isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
             {/* Swapped Button Order: Admin Requests First */}
             <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'requests' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Admin Requests</button>
             <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'ledger' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Unit Ledger</button>
          </div>
        )}
      </div>

      {/* --- FILTERS BAR --- */}
      <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={isAdmin ? "Search by unit, purpose..." : "Search records..."}
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

            <input
              type="date"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />

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

            {!isAdmin && profile?.role !== 'unit_pastor' && (
               <Button size="sm" className="h-10" onClick={() => activeTab === 'ledger' ? setIsLedgerModalOpen(true) : setIsRequestModalOpen(true)}>
                 <Plus className="mr-2 h-4 w-4" /> New
               </Button>
             )}
         </div>
      </div>

      {/* --- MOVED REQUESTS BLOCK TO TOP (Since it's the first tab now) --- */}
      {activeTab === 'requests' && (
        <>
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
                        <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">{req.purpose || req.title}</td>

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
                        <td className="px-4 py-3 text-right text-slate-500 text-xs">{formatDate(req.request_date || req.created_at)}</td>
                      </tr>
                    )))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'ledger' && !isAdmin && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500 mb-1"><Wallet className="h-4 w-4" /><span className="text-xs font-bold uppercase">Net Balance</span></div><p className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{formatCurrency(balance)}</p></div>
            <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 shadow-sm"><div className="flex items-center gap-2 text-green-600 mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs font-bold uppercase">Total Income</span></div><p className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</p></div>
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm"><div className="flex items-center gap-2 text-red-600 mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs font-bold uppercase">Total Expense</span></div><p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpense)}</p></div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
            {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : (
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="px-4 py-3 w-12 text-center border-r border-slate-100">S/N</th><th className="px-4 py-3 w-24 text-center border-r border-slate-100">Type</th><th className="px-4 py-3 border-r border-slate-100">Item Name</th><th className="px-4 py-3 border-r border-slate-100">Category</th><th className="px-4 py-3 border-r border-slate-100 text-right">Amount</th><th className="px-4 py-3 w-24 text-right">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.length === 0 ? ( <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No records found matching filters.</td></tr> ) : ( filteredLedger.map((t, index) => (
                      <tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100">{(index + 1).toString().padStart(2, '0')}</td><td className="px-4 py-3 text-center border-r border-slate-100">{t.type === 'income' ? <span className="inline-flex items-center gap-1 text-green-600"><ArrowUpRight className="h-3 w-3" /> In</span> : <span className="inline-flex items-center gap-1 text-red-600"><ArrowDownLeft className="h-3 w-3" /> Out</span>}</td><td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">{t.title || "—"}</td><td className="px-4 py-3 text-slate-500 border-r border-slate-100">{t.category}</td><td className={`px-4 py-3 text-right font-mono font-bold border-r border-slate-100 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'expense' && '- '}{formatCurrency(t.amount)}</td><td className="px-4 py-3 text-right text-slate-500 text-xs">{formatDate(t.date)}</td></tr>
                    )))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <AddLedgerModal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} onComplete={fetchData} />
      <CreateRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} onRequestCreated={fetchData} />
    </div>
  );
};