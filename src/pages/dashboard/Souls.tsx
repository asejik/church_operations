import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Heart, Trophy, User, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { AddSoulReportModal } from '@/components/souls/AddSoulReportModal';

// --- MAIN PAGE ---
export const SoulsPage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');

  const [records, setRecords] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FETCH DATA (Online First)
  const fetchData = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      // 1. Fetch Members
      const { data: memberData } = await supabase
        .from('members')
        .select('id, full_name, image_url')
        .eq('unit_id', profile.unit_id);
      setMembers(memberData || []);

      // 2. Fetch Reports
      const { data: reportData } = await supabase
        .from('soul_reports')
        .select('*')
        .eq('unit_id', profile.unit_id)
        .order('report_date', { ascending: false });
      setRecords(reportData || []);

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

  // PROCESS DATA (Aggregating individual reports into Monthly Stats)
  const processedData = useMemo(() => {
    if (records.length === 0 || members.length === 0) return { months: [], grouped: {} };

    const grouped: Record<string, any[]> = {};
    const monthsSet = new Set<string>();

    // We aggregate reports by Month + Member
    // If a member has 3 reports in Jan, they show as one row with the total sum
    records.forEach(r => {
      const member = members.find(m => m.id === r.member_id);
      if (!member) return;
      if (searchQuery && !member.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return;

      const dateObj = new Date(r.report_date);
      const monthKey = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      monthsSet.add(monthKey);
      if (!grouped[monthKey]) grouped[monthKey] = [];

      // Check if we already have an entry for this member in this month
      const existingEntry = grouped[monthKey].find(e => e.member_id === r.member_id);

      if (existingEntry) {
        existingEntry.total_count += r.count;
        // Merge names
        if (r.convert_names) {
           existingEntry.converts_names = existingEntry.converts_names
             ? `${existingEntry.converts_names}, ${r.convert_names}`
             : r.convert_names;
        }
        // Keep latest date
        if (new Date(r.report_date) > new Date(existingEntry.record_date)) {
           existingEntry.record_date = r.report_date;
        }
      } else {
        grouped[monthKey].push({
          id: r.id,
          member_id: r.member_id,
          member_name: member.full_name,
          member_img: member.image_url,
          total_count: r.count,
          converts_names: r.convert_names,
          record_date: r.report_date
        });
      }
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Sort winners by count desc
    Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => b.total_count - a.total_count);
    });

    return { months: sortedMonths, grouped };
  }, [records, members, searchQuery]);

  // Default Tab
  useEffect(() => {
    if (!activeTab && processedData.months.length > 0) {
      setActiveTab(processedData.months[0]);
    }
  }, [processedData.months, activeTab]);

  const currentRecords = activeTab ? (processedData.grouped[activeTab] || []) : [];

  // --- CALCULATE STATS ---
  const monthlyTotal = currentRecords.reduce((acc, curr) => acc + curr.total_count, 0);

  const currentYear = activeTab ? activeTab.split(' ')[1] : new Date().getFullYear().toString();

  const yearlyTotal = records.reduce((acc, curr) => {
    const recYear = new Date(curr.report_date).getFullYear().toString();
    if (recYear === currentYear) {
      return acc + curr.count;
    }
    return acc;
  }, 0);

  const topWinners = currentRecords.slice(0, 3);

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Souls Won</h1><p className="text-slate-500">Track evangelism and kingdom expansion</p></div>
        {profile?.role !== 'unit_pastor' && (
          <Button onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Report Souls</Button>
        )}
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 border-b border-white/20 pb-3 mb-3">
             <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-pink-200" />
                <h3 className="font-bold opacity-90 text-xs uppercase tracking-wide">Total Souls ({currentYear})</h3>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{yearlyTotal}</span>
                <span className="text-sm opacity-80">lives touched this year</span>
             </div>
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-pink-200" />
                <h3 className="font-bold opacity-90 text-xs uppercase tracking-wide">Contribution ({activeTab || 'This Month'})</h3>
             </div>
             <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{monthlyTotal}</span>
                <span className="text-xs opacity-80">added this month</span>
             </div>
          </div>
          <Heart className="absolute -bottom-4 -right-4 h-32 w-32 text-white opacity-20 rotate-12" />
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
           <div className="flex items-center gap-2 mb-4">
             <TrendingUp className="h-5 w-5 text-amber-500" />
             <h3 className="font-bold text-slate-800">Top Soul Winners ({activeTab ? activeTab.split(' ')[0] : 'Month'})</h3>
           </div>
           <div className="space-y-3">
             {topWinners.length === 0 ? (
               <p className="text-sm text-slate-400 italic">No records yet.</p>
             ) : (
               topWinners.map((winner, idx) => (
                 <div key={winner.member_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                       <span className={`font-bold w-4 ${idx===0 ? 'text-amber-500': idx===1 ? 'text-slate-400': 'text-amber-700'}`}>#{idx+1}</span>
                       <span className="text-slate-700 font-medium">{winner.member_name}</span>
                    </div>
                    <span className="font-bold text-pink-600">{winner.total_count}</span>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input type="text" placeholder="Search member..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {processedData.months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {processedData.months.map(month => (
            <button key={month} onClick={() => setActiveTab(month)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === month ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-pink-200'}`}>{month}</button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="px-4 py-4 w-12 border-r border-slate-100 text-center">S/N</th>
                  <th className="px-4 py-4 border-r border-slate-100">Soul Winner</th>
                  <th className="px-4 py-4 border-r border-slate-100 text-center">Total Souls</th>
                  <th className="px-4 py-4 border-r border-slate-100">Converts Names</th>
                  <th className="px-4 py-4 w-32 text-right">Latest Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRecords.length === 0 ? (
                   <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center"><Heart className="h-10 w-10 text-slate-300 mb-2" /><p>No evangelism records for {activeTab || 'this month'}.</p></div></td></tr>
                ) : (
                  currentRecords.map((record, i) => (
                    <tr key={record.member_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs border-r border-slate-100">{(i + 1).toString().padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          {record.member_img ? <img src={record.member_img} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="h-3 w-3" /></div>}
                          {record.member_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-pink-600 border-r border-slate-100 text-lg">
                        {record.total_count}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-100 max-w-[200px] truncate" title={record.converts_names}>
                        {record.converts_names || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs">
                        {new Date(record.record_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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