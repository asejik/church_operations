import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DecisionModal } from '@/components/finance/DecisionModal';

export const AdminDashboard = () => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(true);

  // Stats State (Only Inventory & Finance)
  const [stats, setStats] = useState({
    inventory: 0,
    pending_requests: 0
  });

  const [requests, setRequests] = useState<any[]>([]);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Parallel Fetching (Only Global Inventory & Requests)
      const [
        { count: inventoryCount },
        { data: reqData }
      ] = await Promise.all([
        supabase.from('inventory').select('*', { count: 'exact', head: true }),
        supabase.from('financial_requests')
          .select(`*, profiles:requester_id (full_name), units:unit_id (name)`)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
      ]);

      setStats({
        inventory: inventoryCount || 0,
        pending_requests: reqData?.length || 0
      });

      setRequests(reqData || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (comment: string) => {
    if (!selectedRequest || !decisionType) return;
    setProcessing(true);

    try {
      const status = decisionType === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase.from('financial_requests')
        .update({ status, admin_comment: comment })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      toast.success(`Request ${status} successfully`);
      setDecisionType(null);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ministry Overview</h1>
        <p className="text-slate-500">Global financial and logistical oversight for {profile?.full_name}</p>
      </div>

      {/* STATS GRID (Reduced to 2 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
            label="Global Inventory"
            value={stats.inventory}
            icon={Package}
            color="bg-indigo-500"
        />
        <StatCard
            label="Pending Requests"
            value={stats.pending_requests}
            icon={Wallet}
            color={stats.pending_requests > 0 ? "bg-orange-500" : "bg-green-500"}
        />
      </div>

      {/* PENDING REQUESTS TABLE (Full Width) */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Attention Needed
          </h3>
          {stats.pending_requests > 0 && <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">{stats.pending_requests} Active</span>}
        </div>

        {requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle className="mx-auto h-10 w-10 text-green-100 mb-2" />
            <p>All clear! No financial requests pending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Unit</th>
                  <th className="px-6 py-3">Purpose</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{req.units?.name}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{req.purpose}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                          {req.profiles?.full_name} • {format(new Date(req.created_at), 'MMM d')}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">₦{req.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => { setSelectedRequest(req); setDecisionType('reject'); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><XCircle className="h-5 w-5" /></button>
                      <button onClick={() => { setSelectedRequest(req); setDecisionType('approve'); }} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Approve"><CheckCircle className="h-5 w-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DecisionModal
        isOpen={!!selectedRequest}
        type={decisionType || 'approve'}
        isLoading={processing}
        onClose={() => { setSelectedRequest(null); setDecisionType(null); }}
        onConfirm={handleDecision}
      />
    </div>
  );
};

// Sub-component for Stats
const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-white shadow-md`}>
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
    </div>
  </div>
);