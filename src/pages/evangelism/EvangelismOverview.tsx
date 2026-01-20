import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Heart,
  Users,
  TrendingUp,
  Loader2,
  Trophy,
  Calendar,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export const EvangelismOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSouls: 0,
    monthSouls: 0,
    activeWinners: 0,
    weeklySouls: 0,
    topUnit: { name: '—', count: 0 },
    topIndividual: { name: '—', count: 0 },
    unitLeaderboard: [] as { name: string; count: number }[]
  });

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchStats();
  }, [selectedMonth]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch all reports
      const { data, error } = await supabase
        .from('soul_reports')
        .select(`
          count,
          report_date,
          units ( name ),
          members ( full_name ),
          soul_winner_name
        `);

      if (error) throw error;
      const reports = data || [];

      // --- CALCULATIONS ---

      // 1. Filter by Month
      const monthReports = reports.filter(r => r.report_date.startsWith(selectedMonth));

      // 2. Weekly Velocity (Last 7 Days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklySouls = reports.filter(r => new Date(r.report_date) >= oneWeekAgo).length;

      // 3. Top Unit Calculation
      const unitCounts: Record<string, number> = {};
      monthReports.forEach(r => {
        // FIX: Cast to 'any' to handle TS array vs object inference error
        const unitData: any = r.units;
        // robust check: handles if Supabase returns object OR array
        const name = unitData?.name || unitData?.[0]?.name || 'Unknown';

        unitCounts[name] = (unitCounts[name] || 0) + 1;
      });

      const sortedUnits = Object.entries(unitCounts)
        .sort((a,b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      // 4. Top Individual Calculation
      const peopleCounts: Record<string, number> = {};
      monthReports.forEach(r => {
        // FIX: Cast to 'any' for members as well
        const memberData: any = r.members;
        const memberName = memberData?.full_name || memberData?.[0]?.full_name || r.soul_winner_name || 'Unknown';

        peopleCounts[memberName] = (peopleCounts[memberName] || 0) + 1;
      });
      const topPersonEntry = Object.entries(peopleCounts).sort((a,b) => b[1] - a[1])[0];

      // 5. Active Soul Winners (Unique count)
      const uniqueWinners = new Set(monthReports.map(r => {
         const m: any = r.members;
         return m?.full_name || m?.[0]?.full_name || r.soul_winner_name;
      })).size;

      setStats({
        totalSouls: reports.length, // All Time
        monthSouls: monthReports.length, // This Month
        activeWinners: uniqueWinners,
        weeklySouls,
        topUnit: sortedUnits[0] || { name: '—', count: 0 },
        topIndividual: topPersonEntry ? { name: topPersonEntry[0], count: topPersonEntry[1] } : { name: '—', count: 0 },
        unitLeaderboard: sortedUnits.slice(0, 3) // Top 3
      });

    } catch (err) {
      console.error(err);
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-pink-500" /></div>;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Evangelism Oversight</h1>
          <p className="text-slate-500">Tracking the heartbeat of the ministry</p>
        </div>
        <input
          type="month"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-500 shadow-sm"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        />
      </div>

      {/* --- HERO STATS --- */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Card */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg shadow-pink-200 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-pink-100">Total Souls Won</p>
                <h4 className="text-3xl font-bold">{stats.totalSouls}</h4>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-pink-100 bg-white/10 w-fit px-3 py-1.5 rounded-lg">
               <Calendar className="h-3 w-3" />
               {stats.monthSouls} in {selectedMonth}
            </div>
          </div>
          <Heart className="absolute -bottom-4 -right-4 h-32 w-32 text-white opacity-10 rotate-12" />
        </div>

        {/* Leading Unit */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Leading Unit</p>
              <h4 className="text-xl font-bold text-slate-900 leading-tight">
                {stats.topUnit.name}
              </h4>
              <p className="text-xs text-slate-400 mt-1">{stats.topUnit.count} souls contributed</p>
            </div>
          </div>
        </div>

        {/* Active Winners */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Soul Winners</p>
              <h4 className="text-2xl font-bold text-slate-900">{stats.activeWinners}</h4>
              <p className="text-xs text-slate-400 mt-1">Laborers in the vineyard</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- INTELLIGENT SECONDARY STATS --- */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* 1. Top Soul Winner (Individual Spotlight) */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
           <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Trophy className="h-5 w-5 text-amber-500" />
                 Top Soul Winner
              </h3>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded-full uppercase">
                 Month Champion
              </span>
           </div>
           <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 border-2 border-white shadow-sm">
                 {stats.topIndividual.name[0]}
              </div>
              <div>
                 <p className="text-lg font-bold text-slate-900">{stats.topIndividual.name}</p>
                 <p className="text-sm text-slate-500">{stats.topIndividual.count} souls won this month</p>
              </div>
           </div>
        </div>

        {/* 2. Unit Leaderboard & Velocity */}
        <div className="space-y-4">
           {/* Velocity Card */}
           <div className="rounded-xl bg-slate-900 p-5 text-white flex items-center justify-between shadow-lg">
              <div>
                 <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Momentum (Last 7 Days)</p>
                 <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-bold">{stats.weeklySouls}</span>
                    <span className="text-sm text-slate-400">souls added</span>
                 </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                 <Activity className="h-5 w-5 text-green-400" />
              </div>
           </div>

           {/* Mini Leaderboard */}
           <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase mb-3">Unit Rankings (Top 3)</p>
              <div className="space-y-3">
                 {stats.unitLeaderboard.map((unit, idx) => (
                    <div key={unit.name} className="flex items-center justify-between text-sm">
                       <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${idx === 0 ? 'text-amber-500' : 'text-slate-300'}`}>0{idx + 1}</span>
                          <span className="font-medium text-slate-700 truncate max-w-[150px]">{unit.name}</span>
                       </div>
                       <span className="font-bold text-slate-900">{unit.count}</span>
                    </div>
                 ))}
                 {stats.unitLeaderboard.length === 0 && <p className="text-slate-400 text-xs italic">No data yet</p>}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};