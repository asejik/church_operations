import { useSMRStats } from '@/hooks/useSMRStats';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, TrendingUp, AlertCircle, Award,
  Briefcase, GraduationCap, Heart
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444']; // Amber, Blue, Green, Red

export const SMRDashboard = () => {
  const { stats, loading } = useSMRStats();

  if (loading || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">

      {/* 1. HERO KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Workforce"
          value={stats.workforce.total}
          sub={`+${stats.workforce.joinedMonth} this month`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          title="Souls Won (YTD)"
          value={stats.souls.year}
          sub={`${stats.souls.month} in current month`}
          icon={Heart}
          color="bg-pink-50 text-pink-600"
        />
        <KpiCard
          title="Avg. Sunday Service"
          value={Math.round(stats.attendance.sunday / 4)}
          sub="Last 30 Days"
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
        <KpiCard
          title="Pending Approvals"
          value={stats.finance.pendingCount}
          sub="Requires Attention"
          icon={AlertCircle}
          color="bg-amber-50 text-amber-600"
          highlight={stats.finance.pendingCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 2. MAIN CHART: ATTENDANCE TRENDS (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Attendance Trends</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.attendance.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="count" name="Attendance" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. FINANCE: SPENDING BY UNIT (Donut) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Spending</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {stats.finance.spendingByUnit.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.finance.spendingByUnit}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.finance.spendingByUnit.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm">No spending data this month</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. WORKFORCE DEMOGRAPHICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* A. Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Employment Status</h3>
          <div className="space-y-4">
            <StatRow label="Students" value={stats.workforce.status.student} icon={GraduationCap} color="text-blue-500" />
            <StatRow label="NYSC" value={stats.workforce.status.nysc} icon={Briefcase} color="text-green-500" />
            <StatRow label="Employed" value={stats.workforce.status.employed} icon={Briefcase} color="text-slate-700" />
            <StatRow label="Unemployed" value={stats.workforce.status.unemployed} icon={AlertCircle} color="text-red-500" />
          </div>
        </div>

        {/* B. Gender & Marital Ratio */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Demographics</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Gender Ratio (M:F)</span>
              <span className="font-bold text-slate-900">{stats.workforce.gender.ratio}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(stats.workforce.gender.male / stats.workforce.total) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Marital Ratio (S:M)</span>
              <span className="font-bold text-slate-900">{stats.workforce.marital.ratio}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-pink-500 h-2 rounded-full"
                style={{ width: `${(stats.workforce.marital.single / stats.workforce.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">CES Completion</span>
              <span className="text-lg font-bold text-amber-600">{stats.workforce.cesRatio}%</span>
            </div>
          </div>
        </div>

        {/* C. Performance Watchlist */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
          <h3 className="text-sm font-bold text-red-800 uppercase mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Performance Watchlist
          </h3>
          {stats.performance.lowPerformers.length > 0 ? (
            <div className="space-y-3">
              {stats.performance.lowPerformers.map((p, i) => (
                <div key={i} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.unit}</p>
                  </div>
                  <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-md">
                    {p.rating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-red-300">
              <Award className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">All ratings healthy</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. SOUL WINNING LEADERBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LeaderboardCard
          title="Top Soul Winners (Year)"
          data={stats.souls.topWinners}
          icon={Award}
          color="text-amber-500"
        />
        <LeaderboardCard
          title="Top Performing Units (Souls)"
          data={stats.souls.topUnits}
          icon={Users}
          color="text-blue-500"
        />
      </div>

    </div>
  );
};

// --- SUB-COMPONENTS for Clean Code ---

const KpiCard = ({ title, value, sub, icon: Icon, color, highlight }: any) => (
  <div className={`p-6 rounded-2xl border ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'} shadow-sm transition-all hover:shadow-md`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const StatRow = ({ label, value, icon: Icon, color }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
    <span className="text-sm font-bold text-slate-900">{value}</span>
  </div>
);

const LeaderboardCard = ({ title, data, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Icon className={`h-5 w-5 ${color}`} /> {title}
    </h3>
    <div className="space-y-4">
      {data.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
            i === 0 ? 'bg-amber-100 text-amber-700' :
            i === 1 ? 'bg-slate-100 text-slate-600' :
            'bg-orange-50 text-orange-600'
          }`}>
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                style={{ width: `${(item.count / (data[0].count || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-24 text-right">
            <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
            <p className="text-xs text-slate-500">{item.count} souls</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);