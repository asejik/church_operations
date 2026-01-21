import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  Users,
  Wallet,
  Heart,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SMRDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSouls: 0,
    financeBalance: 0,
    pendingRequests: 0,
    totalMembers: 0,
    recentActivity: [] as any[]
  });

  useEffect(() => {
    const fetchExecutiveStats = async () => {
      setLoading(true);
      try {
        // 1. Finance Stats
        const { data: financeData } = await supabase.from('finances').select('amount, type');
        const income = financeData?.filter(f => f.type === 'income').reduce((a, c) => a + c.amount, 0) || 0;
        const expense = financeData?.filter(f => f.type === 'expense').reduce((a, c) => a + c.amount, 0) || 0;

        // 2. Pending Requests
        const { count: pendingCount } = await supabase
          .from('financial_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // 3. Souls Stats
        const { count: soulsCount } = await supabase
          .from('soul_reports')
          .select('*', { count: 'exact', head: true });

        // 4. Members Stats
        const { count: membersCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalSouls: soulsCount || 0,
          financeBalance: income - expense,
          pendingRequests: pendingCount || 0,
          totalMembers: membersCount || 0,
          recentActivity: [] // Can be expanded later
        });

      } catch (err) {
        console.error("SMR Load Error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutiveStats();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Executive Overview</h1>
        <p className="text-slate-500">Welcome, Pastor. Here is the ministry's current standing.</p>
      </div>

      {/* --- EXECUTIVE METRICS --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Finance Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
               <Wallet className="h-6 w-6" />
             </div>
             <div>
               <p className="text-sm font-medium text-slate-500">Net Position</p>
               <h3 className="text-xl font-bold text-slate-900">{formatCurrency(stats.financeBalance)}</h3>
             </div>
           </div>
           {stats.pendingRequests > 0 && (
             <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
               <AlertCircle className="h-4 w-4" />
               <span className="font-bold">{stats.pendingRequests} requests pending</span>
             </div>
           )}
        </div>

        {/* Souls Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
               <Heart className="h-6 w-6" />
             </div>
             <div>
               <p className="text-sm font-medium text-slate-500">Total Souls</p>
               <h3 className="text-2xl font-bold text-slate-900">{stats.totalSouls}</h3>
             </div>
           </div>
           <Link to="/smr/souls" className="mt-4 text-xs font-bold text-slate-400 hover:text-pink-600 flex items-center gap-1">
             View Reports <ArrowRight className="h-3 w-3" />
           </Link>
        </div>

        {/* Members Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
               <Users className="h-6 w-6" />
             </div>
             <div>
               <p className="text-sm font-medium text-slate-500">Workforce</p>
               <h3 className="text-2xl font-bold text-slate-900">{stats.totalMembers}</h3>
             </div>
           </div>
        </div>

        {/* Action Card */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 p-6 text-white shadow-lg shadow-amber-200">
           <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-amber-100" /> Quick Actions
           </h3>
           <div className="space-y-2">
             <Link to="/smr/finance" className="block bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-2 rounded-lg text-sm transition-colors">
                Review Budgets
             </Link>
             <Link to="/smr/attendance" className="block bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-2 rounded-lg text-sm transition-colors">
                Check Attendance
             </Link>
           </div>
        </div>

      </div>

      {/* --- DASHBOARD SECTIONS --- */}
      <div className="grid gap-8 md:grid-cols-2">
         {/* Pending Approvals Section */}
         <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-slate-900">Pending Financial Approvals</h3>
               <Link to="/smr/finance" className="text-sm text-amber-600 hover:underline">View All</Link>
            </div>
            {stats.pendingRequests === 0 ? (
               <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <CheckCircle2 className="h-12 w-12 text-green-100 mb-2" />
                  <p>All clear. No pending requests.</p>
               </div>
            ) : (
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800">
                  You have <span className="font-bold">{stats.pendingRequests} financial requests</span> awaiting your review.
               </div>
            )}
         </div>

         {/* Growth Chart Placeholder */}
         <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-center items-center text-center">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
               <BarChart3 className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900">Statistical Management Reports</h3>
            <p className="text-slate-500 text-sm max-w-xs mt-1">Detailed growth analysis and PDF report generation coming soon.</p>
         </div>
      </div>
    </div>
  );
};