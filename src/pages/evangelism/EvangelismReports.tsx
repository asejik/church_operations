import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, Phone, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export const EvangelismReports = () => {
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

  // --- FILTER LOGIC ---
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Soul Reports</h1>
        <p className="text-slate-500">Detailed records of every soul won across all units</p>
      </div>

      {/* FILTERS BAR */}
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

      {/* DATA TABLE */}
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
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                 <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No reports found matching filters.</td></tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-pink-50/30 transition-colors align-top">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(report.report_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {report.units?.name || '—'}
                    </td>
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
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-normal leading-relaxed">
                       {report.notes ? (
                          <div className="flex gap-2">
                             <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-pink-400" />
                             <span>{report.notes}</span>
                          </div>
                       ) : <span className="text-slate-300 italic">No notes</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-wide">
                         Won
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};