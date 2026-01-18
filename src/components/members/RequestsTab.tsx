import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { ArrowRightLeft, Trash2, RefreshCw, Loader2 } from 'lucide-react';
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
      // Fetch requests with Member and Target Unit details
      const { data, error } = await supabase
        .from('member_requests')
        .select(`
          *,
          member:members (id, full_name, image_url),
          target_unit:units!member_requests_target_unit_id_fkey (id, name)
        `)
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

  // --- ACTION LOGIC ---
  const handleApprove = async (req: any) => {
    if (!confirm("Are you sure you want to approve this request?")) return;
    setProcessingId(req.id);

    try {
      // STEP 1: Update the Request Status FIRST
      // (We do this first so the UI updates immediately, even if the member is deleted momentarily)
      const { error: reqError } = await supabase
        .from('member_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (reqError) throw reqError;

      // STEP 2: Perform the Action (Delete or Move)
      if (req.request_type === 'removal') {
        // DELETE MEMBER
        const { error: delError } = await supabase
          .from('members')
          .delete()
          .eq('id', req.member_id);

        if (delError) throw delError;
        toast.success("Member removed from database.");
      }
      else if (req.request_type === 'transfer') {
        // TRANSFER MEMBER
        if (!req.target_unit_id) throw new Error("Target unit is missing.");

        const { error: moveError } = await supabase
          .from('members')
          .update({
             unit_id: req.target_unit_id,
             subunit_id: null,       // Reset subunit (they are new in that unit)
             role_in_unit: 'member'  // Reset role to regular member
          })
          .eq('id', req.member_id);

        if (moveError) throw moveError;
        toast.success(`Transferred to ${req.target_unit?.name || 'new unit'}.`);
      }

      fetchRequests(); // Refresh table
    } catch (err: any) {
      console.error(err);
      toast.error("Action failed: " + err.message);
      // If it failed, try to revert status (optional, but good practice)
      await supabase.from('member_requests').update({ status: 'pending' }).eq('id', req.id);
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">Request History</h2>
        <button onClick={fetchRequests} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
           <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Details / Reason</th>
                  <th className="px-4 py-3">Status</th>
                  {isApprover && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No requests found.</td></tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{formatDate(req.created_at)}</td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          req.request_type === 'removal' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {req.request_type === 'removal' ? <Trash2 className="h-3 w-3" /> : <ArrowRightLeft className="h-3 w-3" />}
                          {req.request_type}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-900">
                         {req.member ? req.member.full_name : <span className="text-slate-400 italic">Deleted Member</span>}
                      </td>

                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate text-slate-600">
                           {req.request_type === 'transfer' && (
                             <span className="font-bold text-blue-600 mr-2">To: {req.target_unit?.name || 'Unknown'}</span>
                           )}
                           <span className="italic">"{req.reason}"</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                          req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          req.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      </td>

                      {/* ACTIONS (Only for Pastors on Pending items) */}
                      {isApprover && (
                        <td className="px-4 py-3 text-right">
                          {req.status === 'pending' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-7 px-2 bg-green-600 hover:bg-green-700 text-[10px]"
                                onClick={() => handleApprove(req)}
                                isLoading={processingId === req.id}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-600 hover:bg-red-50 text-[10px]"
                                onClick={() => handleReject(req)}
                                disabled={!!processingId}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
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
    </div>
  );
};