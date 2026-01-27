import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Heart, Trophy, User, Calendar, Phone, Trash2, Loader2, X, Medal } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { AddSoulReportModal } from '@/components/souls/AddSoulReportModal';

// --- MAIN PAGE ---
export const SoulsPage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // FILTERS
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to Current Month

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // FETCH DATA
  const fetchData = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('soul_reports')
        .select(`
          *,
          members ( full_name, image_url )
        `)
        .eq('unit_id', profile.unit_id)
        .order('report_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load soul reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.unit_id]);

  // DELETE FUNCTION
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    setDeleteLoading(id);
    try {
      const { error } = await supabase.from('soul_reports').delete().eq('id', id);
      if (error) throw error;
      toast.success("Record deleted");
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setDeleteLoading(null);
    }
  };

  // --- STATS CALCULATION ---
  const totalSouls = records.length;
  // This month souls (based on current date, not filter)
  const currentMonthISO = new Date().toISOString().slice(0, 7);
  const monthSouls = records.filter(r => r.report_date.startsWith(currentMonthISO)).length;

  // --- TOP 3 SOUL WINNERS ---
  const winnerCounts: Record<string, number> = {};
  records.forEach(r => {
    const name = r.members?.full_name || r.soul_winner_name || "Unknown";
    winnerCounts[name] = (winnerCounts[name] || 0) + 1;
  });

  // Convert to array, sort, and take top 3
  const topWinners = Object.entries(winnerCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // --- FILTERING ---
  const filteredRecords = records.filter(r => {
    // 1. Text Search
    const winnerName = r.members?.full_name || r.soul_winner_name || '';
    const convertName = r.convert_name || '';
    const search = searchQuery.toLowerCase();
    const matchesSearch = winnerName.toLowerCase().includes(search) || convertName.toLowerCase().includes(search);

    // 2. Month Filter
    const matchesMonth = selectedMonth ? r.report_date.startsWith(selectedMonth) : true;

    return matchesSearch && matchesMonth;
  });

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Souls Won</h1><p className="text-slate-500">Track evangelism and kingdom expansion</p></div>
        {profile?.role !== 'unit_pastor' && (
          <Button onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Report Soul</Button>
        )}
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TOTAL CARD */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 border-b border-white/20 pb-3 mb-3">
             <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-pink-200" />
                <h3 className="font-bold opacity-90 text-xs uppercase tracking-wide">Total Souls (All Time)</h3>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{totalSouls}</span>
                <span className="text-sm opacity-80">lives touched</span>
             </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-pink-200" />
                <h3 className="font-bold opacity-90 text-xs uppercase tracking-wide">This Month ({new Date().toLocaleString('default', { month: 'long' })})</h3>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{monthSouls}</span>
                <span className="text-xs opacity-80">added</span>
             </div>
          </div>
          <Heart className="absolute -bottom-4 -right-4 h-32 w-32 text-white opacity-20 rotate-12" />
        </div>

        {/* TOP 3 WINNERS CARD */}
        <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm flex flex-col">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-50 pb-2">
             <Trophy className="h-4 w-4 text-amber-500" /> Leading Soul Winners
           </h3>

           <div className="flex-1 space-y-3">
             {topWinners.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-4">No data yet.</div>
             ) : (
                topWinners.map((winner, idx) => (
                  <div key={winner.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-50' :
                        idx === 1 ? 'bg-slate-100 text-slate-600' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {idx === 0 ? <Medal className="h-4 w-4" /> : idx + 1}
                      </div>
                      <span className={`font-semibold text-sm ${idx === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                        {winner.name}
                      </span>
                    </div>
                    <div className="text-xs font-bold bg-slate-50 px-2 py-1 rounded text-slate-600 group-hover:bg-pink-50 group-hover:text-pink-600 transition-colors">
                      {winner.count} <span className="font-normal text-slate-400">souls</span>
                    </div>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search soul winner or convert..."
            className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 border border-slate-100"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* MONTH FILTER (Added to Unit Dashboard) */}
        <div className="flex gap-2">
          <input
            type="month"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-500"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />

          {(selectedMonth || searchQuery) && (
             <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setSelectedMonth(''); }}>
               <X className="h-4 w-4" />
             </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="px-4 py-4 w-12 border-r border-slate-100 text-center">S/N</th>
                  <th className="px-4 py-4 border-r border-slate-100 w-48">Soul Winner</th>
                  <th className="px-4 py-4 border-r border-slate-100 w-40">Convert Name</th>
                  <th className="px-4 py-4 border-r border-slate-100 w-32">Phone</th>
                  <th className="px-4 py-4 border-r border-slate-100">Notes</th>
                  <th className="px-4 py-4 w-24 text-right">Date</th>
                  <th className="px-4 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                   <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center"><Heart className="h-10 w-10 text-slate-300 mb-2" /><p>No souls found for this period.</p></div></td></tr>
                ) : (
                  filteredRecords.map((record, i) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors align-top">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs border-r border-slate-100">{(i + 1).toString().padStart(2, '0')}</td>

                      {/* Soul Winner */}
                      <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100 whitespace-normal">
                        <div className="flex items-center gap-2">
                          {record.members?.image_url ? (
                            <img src={record.members.image_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><User className="h-3 w-3" /></div>
                          )}
                          <span>
                            {record.members?.full_name || record.soul_winner_name || "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* Convert Name (Text Wrap) */}
                      <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 whitespace-normal">
                        {record.convert_name || "—"}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 text-slate-500 text-xs border-r border-slate-100 whitespace-nowrap">
                        {record.convert_phone ? (
                          <div className="flex items-center gap-1">
                             <Phone className="h-3 w-3" /> {record.convert_phone}
                          </div>
                        ) : "—"}
                      </td>

                      {/* Notes (Text Wrap) */}
                      <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-100 whitespace-normal leading-relaxed">
                        {record.notes || "—"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-right text-slate-500 text-xs whitespace-nowrap">
                        {new Date(record.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>

                      {/* Delete Action */}
                      <td className="px-4 py-3 text-right">
                         <Button
                           variant="ghost"
                           size="sm"
                           className="text-slate-400 hover:text-red-500 h-8 w-8 p-0"
                           onClick={() => handleDelete(record.id)}
                           isLoading={deleteLoading === record.id}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <AddSoulReportModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onReportSubmitted={fetchData}
      />
    </div>
  );
};