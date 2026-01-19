import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Send, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { CreateRequestModal } from '@/components/finance/CreateRequestModal';

// --- MODAL: ADD LEDGER TRANSACTION (Local Component) ---
const AddLedgerModal = ({ isOpen, onClose, onComplete }: { isOpen: boolean; onClose: () => void; onComplete: () => void }) => {
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
          <button onClick={() => setFormData({ ...formData, type: 'income' })} className={`py-2 text-sm font-bold rounded-md transition-all ${formData.type === 'income' ? 'bg-white text-green-700 shadow' : 'text-slate-500'}`}>Income (Credit)</button>
          <button onClick={() => setFormData({ ...formData, type: 'expense' })} className={`py-2 text-sm font-bold rounded-md transition-all ${formData.type === 'expense' ? 'bg-white text-red-700 shadow' : 'text-slate-500'}`}>Expense (Debit)</button>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Amount (₦)</label>
          <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:border-blue-500" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Item Name / Title</label>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder={formData.type === 'income' ? "e.g. Sunday Offering" : "e.g. Fuel for Bus"} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="" disabled>Select...</option>
              {formData.type === 'income' ? (
                <><option>Offering</option><option>Donation</option><option>Fundraising</option><option>Other</option></>
              ) : (
                <><option>Transport</option><option>Welfare</option><option>Equipment</option><option>Refreshment</option><option>Other</option></>
              )}
            </select>
          </div>
          <div>
             <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
             <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} isLoading={loading}>Save</Button></div>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE ---
export const FinancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<'ledger' | 'requests'>('ledger');
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [ledgerItems, setLedgerItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FETCH DATA (Online First)
  const fetchData = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      // 1. Fetch Ledger
      const { data: ledgerData } = await supabase
        .from('finances')
        .select('*')
        .eq('unit_id', profile.unit_id)
        .order('date', { ascending: false });

      setLedgerItems(ledgerData || []);

      // 2. Fetch Requests
      // Note: We read from 'financial_requests' to match the new Modal
      const { data: reqData } = await supabase
        .from('financial_requests')
        .select('*')
        .eq('unit_id', profile.unit_id)
        .order('request_date', { ascending: false });

      setRequests(reqData || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.unit_id]);

  // Filter Logic
  const filteredLedger = ledgerItems.filter(t =>
    (t.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter(r =>
    (r.purpose?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalIncome = ledgerItems.filter(t => t.type === 'income').reduce((a, c) => a + Number(c.amount), 0);
  const totalExpense = ledgerItems.filter(t => t.type === 'expense').reduce((a, c) => a + Number(c.amount), 0);
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Finances & Budget</h1><p className="text-slate-500">Manage unit funds and admin requests</p></div>
        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
           <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'ledger' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Unit Ledger</button>
           <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'requests' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Admin Requests</button>
        </div>
      </div>

      {activeTab === 'ledger' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-slate-500 mb-1"><Wallet className="h-4 w-4" /><span className="text-xs font-bold uppercase">Net Balance</span></div><p className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{formatCurrency(balance)}</p></div>
            <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 shadow-sm"><div className="flex items-center gap-2 text-green-600 mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs font-bold uppercase">Total Income</span></div><p className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</p></div>
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm"><div className="flex items-center gap-2 text-red-600 mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs font-bold uppercase">Total Expense</span></div><p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpense)}</p></div>
          </div>
          <div className="flex justify-between items-center mt-4">
             <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search ledger..." className="h-9 w-full rounded-lg bg-slate-50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
             {profile?.role !== 'unit_pastor' && ( <Button size="sm" onClick={() => setIsLedgerModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Record</Button> )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
            {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : (
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="px-4 py-3 w-12 text-center border-r border-slate-100">S/N</th><th className="px-4 py-3 w-24 text-center border-r border-slate-100">Type</th><th className="px-4 py-3 border-r border-slate-100">Item Name</th><th className="px-4 py-3 border-r border-slate-100">Category</th><th className="px-4 py-3 border-r border-slate-100 text-right">Amount</th><th className="px-4 py-3 w-24 text-right">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger.length === 0 ? ( <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr> ) : ( filteredLedger.map((t, index) => (
                      <tr key={t.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100">{(index + 1).toString().padStart(2, '0')}</td><td className="px-4 py-3 text-center border-r border-slate-100">{t.type === 'income' ? <span className="inline-flex items-center gap-1 text-green-600"><ArrowUpRight className="h-3 w-3" /> In</span> : <span className="inline-flex items-center gap-1 text-red-600"><ArrowDownLeft className="h-3 w-3" /> Out</span>}</td><td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">{t.title || "—"}</td><td className="px-4 py-3 text-slate-500 border-r border-slate-100">{t.category}</td><td className={`px-4 py-3 text-right font-mono font-bold border-r border-slate-100 ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'expense' && '- '}{formatCurrency(t.amount)}</td><td className="px-4 py-3 text-right text-slate-500 text-xs">{formatDate(t.date)}</td></tr>
                    )))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <>
          <div className="flex justify-between items-center mt-4">
             <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Search requests..." className="h-9 w-full rounded-lg bg-slate-50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
             {profile?.role !== 'unit_pastor' && ( <Button size="sm" onClick={() => setIsRequestModalOpen(true)}><Send className="mr-2 h-4 w-4" /> New Request</Button> )}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
            {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : (
              <table className="w-full text-left text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold"><th className="px-4 py-3 w-12 text-center border-r border-slate-100">S/N</th><th className="px-4 py-3 w-32 border-r border-slate-100 text-center">Status</th><th className="px-4 py-3 border-r border-slate-100">Purpose</th><th className="px-4 py-3 border-r border-slate-100">Details</th><th className="px-4 py-3 border-r border-slate-100 text-right">Amount</th><th className="px-4 py-3 w-24 text-right">Date</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.length === 0 ? ( <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No requests sent yet.</td></tr> ) : ( filteredRequests.map((req, index) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100">{(index + 1).toString().padStart(2, '0')}</td>
                        <td className="px-4 py-3 text-center border-r border-slate-100">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${req.status === 'approved' || req.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                             {req.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                             {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                             {req.status === 'pending' && <Clock className="h-3 w-3" />}
                             {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">{req.purpose || req.title}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs border-r border-slate-100 max-w-[200px] truncate" title={req.description}>{req.description || "—"}</td>
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

      <AddLedgerModal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} onComplete={fetchData} />
      <CreateRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} onRequestCreated={fetchData} />
    </div>
  );
};