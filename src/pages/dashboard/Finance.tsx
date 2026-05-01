import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import {
  Plus, Search, CheckCircle, XCircle, Clock, Loader2,
  MessageSquare, X, ChevronLeft, ChevronRight, FileText, Settings2, Calendar, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { CreateRequestModal } from '@/components/finance/CreateRequestModal';
import { DecisionModal } from '@/components/finance/DecisionModal';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export const FinancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();

  const isAdmin = profile?.role === 'admin_pastor' || profile?.role === 'smr';

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [requests, setRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let reqQuery = supabase
        .from('financial_requests')
        .select(`
          id, amount, purpose, description, status, created_at, unit_id, requester_id, reviewed_by, is_archived,
          admin_comment, is_acknowledged, is_urgent, receipt_url,
          units(name),
          profiles:requester_id(full_name),
          reviewer:reviewed_by(full_name, role)
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isAdmin) {
        reqQuery = reqQuery.eq('unit_id', profile.unit_id);
      }

      const { data: reqData, error } = await reqQuery;
      if (error) throw error;
      setRequests(reqData || []);

      if (isAdmin) {
        const { data: unitsData } = await supabase.from('units').select('id, name').order('name');
        setUnits(unitsData || []);
      }

    } catch (err) {
      logger.error(err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.unit_id, isAdmin]);

  // --- SOFT DELETE HANDLER ---
  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Remove this request from the view? (It will be kept safely on the server)")) return;

    try {
      const { error } = await supabase
        .from('financial_requests')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
      toast.success("Record removed from view");
      fetchData();
    } catch (err) {
      toast.error("Failed to remove record");
    }
  };

  // --- FILTER LOGIC ---
  const filterRequests = (item: any) => {
    const searchMatch =
      (item.purpose || item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.units?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!searchMatch) return false;

    if (isAdmin && selectedUnit !== 'all') {
      if (item.unit_id !== selectedUnit) return false;
    }

    const itemDate = new Date(item.created_at);
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    if (itemDate < start || itemDate > end) return false;

    return true;
  };

  const filteredRequests = requests.filter(filterRequests);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const handleMonthChange = (dir: 'prev' | 'next') => {
    setCurrentDate(curr => dir === 'prev' ? subMonths(curr, 1) : addMonths(curr, 1));
  };

  const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

  const getReviewerLabel = (role?: string) => {
    if (role === 'smr') return 'SMR';
    if (role === 'admin_pastor') return 'Admin';
    return 'Admin';
  };

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Financial Requests' : 'My Requests'}</h1>
           <p className="text-slate-500">{isAdmin ? 'Review and approve funding requests' : 'Track your submitted funding requests'}</p>
        </div>

        {!isAdmin && profile?.role !== 'unit_pastor' && (
           <Button onClick={() => setIsRequestModalOpen(true)}>
             <Plus className="mr-2 h-4 w-4" /> New Request
           </Button>
        )}
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

         <div className="flex gap-2 w-full md:w-auto overflow-x-auto items-center">
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

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
               <button onClick={() => handleMonthChange('prev')} className="p-1.5 hover:bg-white rounded-md text-slate-500 shadow-sm transition-all"><ChevronLeft className="h-4 w-4" /></button>
               <div className="px-3 text-sm font-bold text-slate-700 min-w-[100px] text-center select-none">
                 {format(currentDate, 'MMM yyyy')}
               </div>
               <button onClick={() => handleMonthChange('next')} className="p-1.5 hover:bg-white rounded-md text-slate-500 shadow-sm transition-all"><ChevronRight className="h-4 w-4" /></button>
            </div>

            {(selectedUnit !== 'all' || searchQuery || !isCurrentMonth) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-slate-500 hover:text-red-500"
                onClick={() => { setSelectedUnit('all'); setCurrentDate(new Date()); setSearchQuery(''); }}
              >
                <X className="h-4 w-4 mr-1" /> Reset
              </Button>
            )}
         </div>
      </div>

      {/* --- MOBILE: CARD LIST (< md) --- */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : (
          filteredRequests.length === 0 ? (
             <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No requests found.</p>
             </div>
          ) : (
            filteredRequests.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3 active:scale-[0.99] transition-transform" onClick={() => isAdmin && req.status === 'pending' && setSelectedRequest(req)}>

                 {/* Top Row: Purpose + Amount */}
                 <div className="flex justify-between items-start">
                   <div>
                     <h3 className="font-bold text-slate-900 line-clamp-1">
                       {req.is_urgent && <span className="mr-2 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-100">URGENT</span>}
                       {req.purpose || req.title}
                     </h3>
                     {isAdmin && <p className="text-[10px] text-slate-500 uppercase font-medium mt-0.5">{req.units?.name} • {req.profiles?.full_name}</p>}
                   </div>
                   <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded text-sm">{formatCurrency(req.amount)}</span>
                 </div>

                 {/* Middle: Status Badge */}
                 <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      req.status === 'approved' ? 'bg-green-50 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                        {req.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                        {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {req.status === 'pending' && <Clock className="h-3 w-3" />}
                        {req.status}
                    </span>

                    {/* NEW: Mobile Acknowledged Tag */}
                    {req.status === 'pending' && req.is_acknowledged && (
                      <span className="inline-flex items-center px-1.5 py-1 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                        Acknowledged
                      </span>
                    )}

                    {req.reviewer && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        by {getReviewerLabel(req.reviewer.role)}
                      </span>
                    )}
                 </div>

                 {/* Bottom: Date + Action hint */}
                 <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                       <Calendar className="h-3 w-3" /> {formatDate(req.created_at)}
                    </div>
                    {isAdmin && (
                       <div className="flex items-center gap-3">
                         <button onClick={(e) => handleArchive(e, req.id)} className="text-slate-300 hover:text-red-500" title="Remove from view">
                           <Trash2 className="h-4 w-4" />
                         </button>
                         {req.status === 'pending' && (
                           <span className="text-xs font-bold text-blue-600 flex items-center gap-1" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}>
                              Review <ChevronRight className="h-3 w-3" />
                           </span>
                         )}
                       </div>
                    )}
                 </div>
              </div>
            ))
          )
        )}
      </div>

      {/* --- DESKTOP: TABLE (>= md) --- */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mt-4">
        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-4 py-3 w-12 text-center border-r border-slate-100">S/N</th>
                  {isAdmin && <th className="px-4 py-3 border-r border-slate-100">Unit</th>}
                  <th className="px-4 py-3 w-32 border-r border-slate-100 text-center">Status</th>
                  <th className="px-4 py-3 border-r border-slate-100">Purpose</th>
                  <th className="px-4 py-3 border-r border-slate-100">Details</th>
                  <th className="px-4 py-3 border-r border-slate-100 text-right">Amount</th>
                  <th className="px-4 py-3 w-24 text-right">Date</th>
                  {isAdmin && <th className="px-4 py-3 w-24 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-10 w-10 text-slate-300" />
                        <p>No requests found for {format(currentDate, 'MMMM')}.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req, index) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100">{(index + 1).toString().padStart(2, '0')}</td>

                      {isAdmin && (
                        <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                            {req.units?.name}
                            <div className="text-[10px] text-slate-500 font-normal">{req.profiles?.full_name}</div>
                        </td>
                      )}

                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                            req.status === 'approved' || req.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                              {req.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                              {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                              {req.status === 'pending' && <Clock className="h-3 w-3" />}
                              {req.status}
                          </span>

                          {/* NEW: Desktop Acknowledged Tag */}
                          {req.status === 'pending' && req.is_acknowledged && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tight mt-0.5">
                              Acknowledged
                            </span>
                          )}

                          {req.status !== 'pending' && req.reviewer && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                              by {getReviewerLabel(req.reviewer.role)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                        {req.is_urgent && <span className="mr-2 inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-100">URGENT</span>}
                        {req.purpose}
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-xs border-r border-slate-100 max-w-[250px]" title={req.description}>
                        <div className="truncate mb-1">{req.description || "—"}</div>
                        {req.admin_comment && (
                          <div className="mt-1 flex items-start gap-1 bg-amber-50 border border-amber-100 p-1.5 rounded-md text-[10px] text-amber-800">
                              <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                              <span className="font-medium">Admin: {req.admin_comment}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 border-r border-slate-100">{formatCurrency(req.amount)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs border-r border-slate-100">{formatDate(req.request_date || req.created_at)}</td>

                      {/* Action Column for Admins/SMR */}
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {req.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                              >
                                <Settings2 className="h-3 w-3 mr-1" /> Review
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => handleArchive(e, req.id)}
                              title="Remove from view"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onRequestCreated={fetchData}
      />

      <DecisionModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onComplete={fetchData}
      />
    </div>
  );
};