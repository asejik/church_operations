import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { ArrowRightLeft, Trash2, RefreshCw, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export const RequestsTab = () => {
  const { data: profile } = useProfile();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isApprover = profile?.role === 'unit_pastor';

  const fetchRequests = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_requests')
        .select(`*, target_unit:units!member_requests_target_unit_id_fkey (id, name)`)
        .eq('unit_id', profile.unit_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [profile?.unit_id]);

  const handleApprove = async (req: any) => {
    if (!confirm("Approve this request?")) return;
    setProcessingId(req.id);
    try {
      if (req.request_type === 'removal') {
        const { error } = await supabase.from('members').delete().eq('id', req.member_id);
        if (error) throw error;
      } else if (req.request_type === 'transfer') {
        const { error } = await supabase.rpc('approve_transfer', {
          p_member_id: req.member_id,
          p_target_unit_id: req.target_unit_id
        });
        if (error) throw error;
      }
      await supabase.from('member_requests').update({ status: 'approved' }).eq('id', req.id);
      toast.success("Approved successfully");
      fetchRequests();
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: any) => {
    if (!confirm("Reject this request?")) return;
    setProcessingId(req.id);
    try {
      await supabase.from('member_requests').update({ status: 'rejected' }).eq('id', req.id);
      toast.success("Request rejected");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">Request History</h2>
        <button onClick={fetchRequests} className="flex items-center gap-1 text-sm text-blue-600 active:scale-95 transition-transform">
           <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No requests found.</div>
      ) : (
        <>
          {/* --- MOBILE: CARD LIST (< md) --- */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        req.request_type === 'removal' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {req.request_type === 'removal' ? <Trash2 className="h-3 w-3" /> : <ArrowRightLeft className="h-3 w-3" />}
                      {req.request_type}
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900 text-sm">{req.member_name || "Unknown Member"}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {req.request_type === 'transfer' && <span className="font-bold text-blue-600">To: {req.target_unit?.name} • </span>}
                      "{req.reason}"
                    </p>
                 </div>
                 <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                       <Calendar className="h-3 w-3" /> {formatDate(req.created_at)}
                    </div>
                    {isApprover && req.status === 'pending' && (
                      <div className="flex gap-2">
                         <Button size="sm" variant="ghost" className="h-7 px-3 text-red-600 bg-red-50 hover:bg-red-100 text-[10px]" onClick={() => handleReject(req)} disabled={!!processingId}>Reject</Button>
                         <Button size="sm" className="h-7 px-3 bg-green-600 hover:bg-green-700 text-[10px]" onClick={() => handleApprove(req)} isLoading={processingId === req.id}>Approve</Button>
                      </div>
                    )}
                 </div>
              </div>
            ))}
          </div>

          {/* --- DESKTOP: TABLE (>= md) --- */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Reason / Details</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          req.request_type === 'removal' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {req.request_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{req.member_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                       {req.request_type === 'transfer' ? `To: ${req.target_unit?.name}` : req.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(req.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                          req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          req.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isApprover && req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-50 text-[10px]" onClick={() => handleReject(req)} disabled={!!processingId}>Reject</Button>
                          <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 text-[10px]" onClick={() => handleApprove(req)} isLoading={processingId === req.id}>Approve</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};