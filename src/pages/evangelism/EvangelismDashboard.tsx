import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Heart,
  Users,
  Search,
  TrendingUp,
  Loader2,
  Phone,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export const EvangelismDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Filters
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGlobalSouls = async () => {
    setLoading(true);
    try {
      const { data: reportsData, error } = await supabase
        .from('soul_reports')
        .select(`
          *,
          units ( name ),
          members ( full_name )
        `)
        .order('report_date', { ascending: false });

      if (error) throw error;
      setReports(reportsData || []);

      const { data: unitsData } = await supabase
        .from('units').select('id, name').order('name');
      setUnits(unitsData || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load soul reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalSouls();
  }, []);

  // --- FILTER & STATS ---
  const filteredReports = reports.filter(report => {
    const winnerName = report.members?.full_name || report.soul_winner_name || '';
    const convertName = report.convert_name || '';

    const searchMatch =
      convertName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      winnerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!searchMatch) return false;
    if (selectedUnit !== 'all' && report.unit_id !== selectedUnit) return false;
    if (selectedMonth && report.report_date.slice(0, 7) !== selectedMonth) return false;

    return true;
  });

  const totalSouls = filteredReports.length;

  const unitCounts: Record<string, number> = {};
  filteredReports.forEach(r => {
    const unitName = r.units?.name || 'Unknown';
    unitCounts[unitName] = (unitCounts[unitName] || 0) + 1;
  });
  const topUnit = Object.entries(unitCounts).sort((a,b) => b[1] - a[1])[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Evangelism Oversight</h1>
        <p className="text-slate-500">Tracking the heartbeat of the ministry</p>
      </div>

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg shadow-pink-200">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-pink-100">Total Souls Won</p>
              <h4 className="text-3xl font-bold">{totalSouls}</h4>
            </div>
          </div>
          <div className="mt-4 text-xs font-medium text-pink-100 bg-white/10 inline-block px-2 py-1 rounded-lg">
             {selectedMonth ? `In ${selectedMonth}` : 'All Time'}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
           <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Leading Unit</p>
              {/* ALLOW TEXT WRAP for long unit names */}
              <h4 className="text-xl font-bold text-slate-900 leading-tight">
                {topUnit ? topUnit[0] : '—'}
              </h4>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
             {topUnit ? `${topUnit[1]} souls contributed` : 'No data yet'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
           <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Soul Winners</p>
              <h4 className="text-2xl font-bold text-slate-900">
                {new Set(filteredReports.map(r => r.member_id)).size}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search convert or soul winner..."
              className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-4 text-sm outline-none border border-slate-100 focus:border-pink-300"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
             <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-500 min-w-[140px]"
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
              >
                <option value="all">All Units</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <input
                type="month"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-500"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-pink-300" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="px-4 py-3 w-24">Date</th>
                  <th className="px-4 py-3 w-32">Unit</th>
                  <th className="px-4 py-3 w-40">Convert Name</th>
                  <th className="px-4 py-3 w-32">Contact</th>
                  <th className="px-4 py-3 w-40">Soul Winner</th>
                  {/* REPLACED STATUS WITH NOTES */}
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                   <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No reports found.</td></tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-pink-50/30 transition-colors align-top">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(report.report_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {report.units?.name || '—'}
                      </td>
                      {/* TEXT WRAPPING ENABLED: Removed truncate */}
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-normal">
                        {report.convert_name}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {report.convert_phone ? (
                          <div className="flex items-center gap-1">
                             <Phone className="h-3 w-3" /> {report.convert_phone}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-normal">
                         {report.members?.full_name || report.soul_winner_name || '—'}
                      </td>
                      {/* NOTES COLUMN with wrapping */}
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-normal leading-relaxed">
                         {report.notes ? (
                            <div className="flex gap-2">
                               <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-pink-400" />
                               <span>{report.notes}</span>
                            </div>
                         ) : <span className="text-slate-300 italic">No notes</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};