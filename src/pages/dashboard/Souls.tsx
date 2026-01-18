import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, Heart, Trophy, User, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

// --- REPORT SOULS MODAL ---
const ReportSoulsModal = ({ isOpen, onClose, onComplete }: { isOpen: boolean; onClose: () => void; onComplete: () => void }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '',
    count: 1,
    converts_names: '',
    date: new Date().toISOString().split('T')[0]
  });

  const members = useLiveQuery(() => db.members.orderBy('full_name').toArray(), []);

  const handleSubmit = async () => {
    if (!profile?.unit_id || !formData.member_id) {
      toast.error("Please select a member");
      return;
    }
    if (formData.count < 1) {
      toast.error("Count must be at least 1");
      return;
    }

    setLoading(true);
    try {
      // 1. Determine the Month Key for the selected date
      const selectedDate = new Date(formData.date);
      const selectedMonth = selectedDate.getMonth(); // 0-11
      const selectedYear = selectedDate.getFullYear();

      // 2. Check Local DB for existing record for this Member + Month
      const existingRecords = await db.souls.where('member_id').equals(formData.member_id).toArray();
      const match = existingRecords.find(r => {
        const rDate = new Date(r.record_date);
        return rDate.getMonth() === selectedMonth && rDate.getFullYear() === selectedYear;
      });

      if (match) {
        // --- UPDATE EXISTING RECORD ---
        const updatedCount = match.total_count + Number(formData.count);

        let updatedNames = match.converts_names;
        if (formData.converts_names.trim()) {
           updatedNames = updatedNames ? `${updatedNames}, ${formData.converts_names}` : formData.converts_names;
        }

        // Cloud Update: Find match by date range
        const { data: cloudMatch } = await supabase.from('souls_won')
          .select('id')
          .eq('member_id', formData.member_id)
          .gte('record_date', `${selectedYear}-${String(selectedMonth+1).padStart(2, '0')}-01`)
          .lte('record_date', `${selectedYear}-${String(selectedMonth+1).padStart(2, '0')}-31`)
          .single();

        if (cloudMatch) {
             await supabase.from('souls_won').update({
               total_count: updatedCount,
               converts_names: updatedNames,
               record_date: formData.date
             }).eq('id', cloudMatch.id);
        } else {
             // Fallback insert
             await supabase.from('souls_won').insert({
               unit_id: profile.unit_id,
               member_id: formData.member_id,
               total_count: updatedCount,
               converts_names: updatedNames,
               record_date: formData.date
             });
        }

        // Local Update
        await db.souls.update(match.id!, {
           total_count: updatedCount,
           converts_names: updatedNames,
           record_date: formData.date,
           synced: 1
        });

        toast.success("Record updated! Souls added.");

      } else {
        // --- CREATE NEW RECORD ---
        const newRecord = {
          unit_id: profile.unit_id,
          member_id: formData.member_id,
          total_count: Number(formData.count),
          converts_names: formData.converts_names,
          record_date: formData.date
        };

        const { error } = await supabase.from('souls_won').insert(newRecord);
        if (error) throw error;

        await db.souls.add({ ...newRecord, synced: 1 });
        toast.success("New monthly record created");
      }

      onComplete();
      onClose();
      setFormData({ member_id: '', count: 1, converts_names: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Souls Won">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Soul Winner</label>
          <select
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            value={formData.member_id}
            onChange={e => setFormData({ ...formData, member_id: e.target.value })}
          >
            <option value="">-- Select Member --</option>
            {members?.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Souls Won (Qty)</label>
            <input
               type="number" min="1"
               className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
               value={formData.count}
               onChange={e => setFormData({ ...formData, count: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
            <input
               type="date"
               className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
               value={formData.date}
               onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Names of Converts</label>
          <textarea
             className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
             rows={3}
             placeholder="e.g. Mary, John, Peter (Separate with commas)"
             value={formData.converts_names}
             onChange={e => setFormData({ ...formData, converts_names: e.target.value })}
          />
          <p className="text-[10px] text-slate-400 mt-1">If this member already has a record for this month, these names will be added to the list.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save Report</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE ---
export const SoulsPage = () => {
  const { data: profile } = useProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');

  const records = useLiveQuery(() => db.souls.orderBy('record_date').reverse().toArray(), []);
  const members = useLiveQuery(() => db.members.toArray(), []);

  // Sync Logic
  useEffect(() => {
    const syncSouls = async () => {
      if (!profile?.unit_id) return;
      const { data } = await supabase.from('souls_won').select('*').eq('unit_id', profile.unit_id);
      if (data) {
        await db.souls.clear();
        await db.souls.bulkPut(data.map((i: any) => ({ ...i, synced: 1 })));
      }
    };
    syncSouls();
  }, [profile?.unit_id]);

  // Process Data
  const processedData = useMemo(() => {
    if (!records || !members) return { months: [], grouped: {} };

    const grouped: Record<string, any[]> = {};
    const monthsSet = new Set<string>();

    records.forEach(r => {
      const member = members.find(m => m.id === r.member_id);
      if (!member) return;
      if (searchQuery && !member.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return;

      const dateObj = new Date(r.record_date);
      const monthKey = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      monthsSet.add(monthKey);
      if (!grouped[monthKey]) grouped[monthKey] = [];

      grouped[monthKey].push({
        ...r,
        member_name: member.full_name,
        member_img: member.image_url
      });
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
  // 1. Monthly Total (Sub Total)
  const monthlyTotal = currentRecords.reduce((acc, curr) => acc + curr.total_count, 0);

  // 2. Yearly Total (General Total)
  // We extract the year from the active tab string (e.g. "January 2026")
  const currentYear = activeTab ? activeTab.split(' ')[1] : new Date().getFullYear().toString();

  const yearlyTotal = records?.reduce((acc, curr) => {
    // Only count if record date matches the current Tab's year
    const recYear = new Date(curr.record_date).getFullYear().toString();
    if (recYear === currentYear) {
      return acc + curr.total_count;
    }
    return acc;
  }, 0) || 0;

  const topWinners = currentRecords.slice(0, 3);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Souls Won</h1><p className="text-slate-500">Track evangelism and kingdom expansion</p></div>
        {profile?.role !== 'unit_pastor' && ( <Button onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Report Souls</Button> )}
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Card (Split Year vs Month) */}
        <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">

          {/* Yearly Stat */}
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

          {/* Monthly Stat */}
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

        {/* Top Winners Card */}
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
                 <div key={winner.id} className="flex items-center justify-between text-sm">
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

      {/* --- MONTH TABS --- */}
      {processedData.months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {processedData.months.map(month => (
            <button key={month} onClick={() => setActiveTab(month)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === month ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-pink-200'}`}>{month}</button>
          ))}
        </div>
      )}

      {/* --- TABLE --- */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                <th className="px-4 py-4 w-12 border-r border-slate-100 text-center">S/N</th>
                <th className="px-4 py-4 border-r border-slate-100">Soul Winner</th>
                <th className="px-4 py-4 border-r border-slate-100 text-center">Total Souls</th>
                <th className="px-4 py-4 border-r border-slate-100">Converts Names</th>
                <th className="px-4 py-4 w-32 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRecords.length === 0 ? (
                 <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center"><Heart className="h-10 w-10 text-slate-300 mb-2" /><p>No evangelism records for {activeTab || 'this month'}.</p></div></td></tr>
              ) : (
                currentRecords.map((record, i) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
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
        </div>
      </div>
      <ReportSoulsModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onComplete={() => {}} />
    </div>
  );
};