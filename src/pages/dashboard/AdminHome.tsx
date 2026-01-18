import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Users, Heart, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminHome = () => {
  // 1. Fetch High-Level Stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch Recent Flags (Performance Alerts)
  const { data: flags } = useQuery({
    queryKey: ['recent_flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flagged_members')
        .select(`
          *,
          members ( full_name ),
          units ( name )
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading Ministry Data...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ministry Overview</h1>
        <p className="text-slate-500">Global metrics across all {stats?.units} units</p>
      </div>

      {/* STATS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Membership"
          value={stats?.members}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          label="Souls Won (Total)"
          value={stats?.souls}
          icon={Heart}
          color="bg-pink-500"
        />
        <StatCard
          label="Avg. Weekly Attendance"
          value={stats?.attendance_avg}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          label="Performance Alerts"
          value={stats?.flags}
          icon={AlertTriangle}
          color="bg-orange-500"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* RECENT ALERTS */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Attention Needed</h3>
            <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
              {stats?.flags} Active
            </span>
          </div>

          <div className="space-y-3">
            {flags?.length === 0 ? (
              <p className="text-sm text-slate-500">No active alerts. All good!</p>
            ) : (
              flags?.map((flag: any) => (
                <div key={flag.id} className="flex items-start gap-3 rounded-lg bg-orange-50/50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {flag.members?.full_name}
                      <span className="font-normal text-slate-500"> ({flag.units?.name})</span>
                    </p>
                    <p className="text-xs text-orange-700">{flag.reason}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <Building2 className="h-6 w-6 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Manage Units</span>
            </button>
             <button className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 transition-colors hover:bg-slate-100">
              <Users className="h-6 w-6 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">All Members</span>
            </button>
            {/* Add more shortcuts here */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Sub-component for Cards
const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100"
  >
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} text-white shadow-md`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h4 className="text-2xl font-bold text-slate-900">{value || 0}</h4>
      </div>
    </div>
  </motion.div>
);