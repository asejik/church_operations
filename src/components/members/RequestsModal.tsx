import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Check, X, ArrowRightLeft, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

interface RequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const RequestsModal = ({ isOpen, onClose, onUpdate }: RequestsModalProps) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  // Is the current user an Approver? (Pastor)
  const isApprover = profile?.role === 'unit_pastor';

  const fetchRequests = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      // FIX: We strictly define the relationship using the syntax from the error log
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
      console.error("Fetch Error:", err);
      // Only toast if it's a real error, not a cancellation
      if (err.message) toast.error("Failed to load requests: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen]);

  const handleApprove = async (req: any) => {
    if (!confirm("Are you sure you want to approve this request?")) return;
    setLoading(true);

    try {
      // 1. EXECUTE ACTION
      if (req.request_type === 'removal') {
        // Delete from cloud
        await supabase.from('members').delete().eq('id', req.member_id);
        // Delete from local
        await db.members.delete(req.member_id);
      }
      else if (req.request_type === 'transfer') {
        // Update Cloud
        const { error: moveError } = await supabase
          .from('members')
          .update({
             unit_id: req.target_unit_id,
             subunit_id: null,
             role_in_unit: 'member'
          })
          .eq('id', req.member_id);

        if (moveError) throw moveError;

        // Remove from local (Since they moved to another unit)
        await db.members.delete(req.member_id);
      }

      // 2. UPDATE REQUEST STATUS
      const { error: reqError } = await supabase
        .from('member_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (reqError) throw reqError;

      toast.success("Request approved");
      fetchRequests(); // Reload list
      onUpdate();      // Reload parent members list
    } catch (err: any) {
      toast.error("Operation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (req: any) => {
    if (!confirm("Reject this request?")) return;
    setLoading(true);
    try {
      await supabase.from('member_requests').update({ status: 'rejected' }).eq('id', req.id);
      toast.success("Request rejected");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Member Requests">
      <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>No active requests found.</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                  req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  req.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {req.status}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                   req.request_type === 'removal' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                }`}>
                  {req.request_type === 'removal' ? <Trash2 className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
                </div>

                <div className="flex-1">
                   <h4 className="text-sm font-bold text-slate-900">
                     {req.request_type === 'removal' ? 'Removal Request' : 'Transfer Request'}
                   </h4>
                   <p className="text-xs text-slate-500 mt-1">
                     <span className="font-medium text-slate-700">
                       {req.member ? req.member.full_name : 'Unknown/Deleted Member'}
                     </span>
                     {req.request_type === 'transfer' && (
                       <> to <span className="font-bold text-blue-600">{req.target_unit?.name || 'Unknown Unit'}</span></>
                     )}
                   </p>

                   <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600 italic border border-slate-100">
                     "{req.reason}"
                   </div>

                   {/* ACTIONS (Only for Pastor & Pending) */}
                   {isApprover && req.status === 'pending' && (
                     <div className="mt-3 flex gap-2">
                       <Button size="sm" onClick={() => handleApprove(req)} isLoading={loading} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
                         <Check className="mr-1 h-3 w-3" /> Approve
                       </Button>
                       <Button size="sm" variant="ghost" onClick={() => handleReject(req)} disabled={loading} className="text-red-600 hover:bg-red-50 h-8 text-xs">
                         <X className="mr-1 h-3 w-3" /> Reject
                       </Button>
                     </div>
                   )}

                   {/* INFO FOR UNIT HEAD */}
                   {!isApprover && req.status === 'pending' && (
                     <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                       <Clock className="h-3 w-3" /> Awaiting Pastor's approval
                     </p>
                   )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};