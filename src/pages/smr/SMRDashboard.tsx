import { useSMRStats } from '@/hooks/useSMRStats';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import {
  Users, TrendingUp, AlertCircle, Award,
  Heart, HelpCircle
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

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
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">

      {/* PAGE TITLE */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
        <p className="text-sm text-slate-500">High-level overview of global operations</p>
      </div>

      {/* 1. HERO KPI ROW (2 cols on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          title="Workforce"
          value={stats.workforce.total}
          sub={`+${stats.workforce.joinedMonth} this month`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          title="Souls (YTD)"
          value={stats.souls.year}
          sub={`${stats.souls.month} this month`}
          icon={Heart}
          color="bg-pink-50 text-pink-600"
        />
        <KpiCard
          title="Avg. Sunday"
          value={Math.round(stats.attendance.sunday / 4)}
          sub="Last 30 Days"
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
        <KpiCard
          title="Approvals"
          value={stats.finance.pendingCount}
          sub="Pending"
          icon={AlertCircle}
          color="bg-amber-50 text-amber-600"
          highlight={stats.finance.pendingCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* 2. MAIN CHART: ATTENDANCE TRENDS (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-4">Attendance Trends</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.attendance.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} width={30} />
                <ChartTooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="count" name="Attendance" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. FINANCE: SPENDING BY UNIT (Donut) */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-4">Monthly Spending</h3>
          <div className="h-[250px] md:h-[300px] w-full flex items-center justify-center">
            {stats.finance.spendingByUnit.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.finance.spendingByUnit}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.finance.spendingByUnit.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip formatter={(value) => `₦${Number(value).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs md:text-sm">No spending data this month</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. OPERATIONAL INSIGHTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

        {/* A. ABSENCE REPORT */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> Top Absence Reasons
          </h3>
          <div className="h-[200px] w-full">
            {stats.attendance.absenceReasons.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={stats.attendance.absenceReasons}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="reason" type="category" width={80} tick={{fontSize: 10}} interval={0} />
                  <ChartTooltip />
                  <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs md:text-sm">
                No absence data yet
              </div>
            )}
          </div>
        </div>

        {/* B. Gender & Marital Ratio */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-4">Demographics</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-slate-600">Gender Ratio (M:F)</span>
              <span className="text-sm font-bold text-slate-900">{stats.workforce.gender.ratio}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 md:h-2 mb-6">
              <div
                className="bg-blue-500 h-1.5 md:h-2 rounded-full"
                style={{ width: `${(stats.workforce.gender.male / stats.workforce.total) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-slate-600">Marital Ratio (S:M)</span>
              <span className="text-sm font-bold text-slate-900">{stats.workforce.marital.ratio}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 md:h-2">
              <div
                className="bg-pink-500 h-1.5 md:h-2 rounded-full"
                style={{ width: `${(stats.workforce.marital.single / stats.workforce.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">CES Completion</span>
              <span className="text-base md:text-lg font-bold text-amber-600">{stats.workforce.cesRatio}%</span>
            </div>
          </div>
        </div>

        {/* C. Performance Watchlist */}
        <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-100 shadow-sm">
          <h3 className="text-xs md:text-sm font-bold text-red-800 uppercase mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Watchlist
          </h3>
          {stats.performance.lowPerformers.length > 0 ? (
            <div className="space-y-2 md:space-y-3">
              {stats.performance.lowPerformers.map((p, i) => (
                <div key={i} className="bg-white p-2.5 md:p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 truncate">{p.unit}</p>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-md shrink-0">
                    {p.rating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[150px] flex flex-col items-center justify-center text-red-300">
              <Award className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs md:text-sm text-center px-4">All ratings healthy across units</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. SOUL WINNING LEADERBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <LeaderboardCard
          title="Top Soul Winners"
          data={stats.souls.topWinners}
          icon={Award}
          color="text-amber-500"
        />
        <LeaderboardCard
          title="Top Units (Souls)"
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
  <div className={`p-3 md:p-6 rounded-2xl border flex flex-col justify-between ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'} shadow-sm transition-all hover:shadow-md h-full`}>
    <div className="flex justify-between items-start mb-2 md:mb-3">
      <div className={`p-1.5 md:p-3 rounded-lg md:rounded-xl shrink-0 ${color}`}>
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <p className="text-[9px] md:text-xs text-slate-400 text-right leading-tight max-w-[60px] md:max-w-none">{sub}</p>
    </div>
    <div>
      <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-none">{typeof value === 'number' ? value.toLocaleString() : value}</h3>
      <p className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-wide md:tracking-wider mt-1.5 line-clamp-1">{title}</p>
    </div>
  </div>
);

const LeaderboardCard = ({ title, data, icon: Icon, color }: any) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
    <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} /> {title}
    </h3>
    <div className="space-y-3 md:space-y-4">
      {data.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-3 md:gap-4">
          <div className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full font-bold text-xs md:text-sm shrink-0 ${
            i === 0 ? 'bg-amber-100 text-amber-700' :
            i === 1 ? 'bg-slate-100 text-slate-600' :
            'bg-orange-50 text-orange-600'
          }`}>
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="h-1.5 md:h-2 bg-slate-50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                style={{ width: `${(item.count / (data[0].count || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="w-20 md:w-24 text-right shrink-0">
            <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{item.name}</p>
            <p className="text-[10px] md:text-xs text-slate-500">{item.count} souls</p>
          </div>
        </div>
      ))}
      {data.length === 0 && (
         <div className="text-center py-6 text-slate-400 text-xs md:text-sm italic">
           No data available
         </div>
      )}
    </div>
  </div>
);