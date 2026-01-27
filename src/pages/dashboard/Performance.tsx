import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Star, User, MessageSquare, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { ReviewModal } from '@/components/performance/ReviewModal';

export const PerformancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();

  // --- 1. ROLE LOGIC ---
  const isGlobalViewer = profile?.role === 'smr' || profile?.role === 'admin_pastor';
  const isEditor = profile?.role === 'unit_head';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');

  // --- 2. DATA STATE ---
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  const [reviews, setReviews] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 3. INITIALIZE UNIT SELECTION ---
  useEffect(() => {
    const initUnits = async () => {
      if (!profile) return;
      if (isGlobalViewer) {
        const { data } = await supabase.from('units').select('id, name').order('name');
        if (data && data.length > 0) {
          setUnits(data);
          if (!selectedUnitId) setSelectedUnitId(data[0].id);
        }
      } else if (profile.unit_id) {
        setSelectedUnitId(profile.unit_id);
      }
    };
    initUnits();
  }, [profile, isGlobalViewer]);

  // --- 4. FETCH DATA ---
  const fetchData = async () => {
    if (!selectedUnitId) return;
    setLoading(true);
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('id, full_name, image_url')
        .eq('unit_id', selectedUnitId);

      setMembers(memberData || []);

      const { data: reviewData } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('unit_id', selectedUnitId)
        .order('review_date', { ascending: false });

      setReviews(reviewData || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedUnitId]);

  // --- 5. PROCESS DATA (Grouping by Month) ---
  const processedData = useMemo(() => {
    if (reviews.length === 0 || members.length === 0) return { months: [], grouped: {} };

    const grouped: Record<string, any[]> = {};
    const monthsSet = new Set<string>();

    reviews.forEach(r => {
      const member = members.find(m => m.id === r.member_id);
      if (!member) return;
      if (searchQuery && !member.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return;

      const dateObj = new Date(r.review_date);
      const monthKey = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

      monthsSet.add(monthKey);
      if (!grouped[monthKey]) grouped[monthKey] = [];

      // Calculate Average (Updated for 6 Categories)
      const scoreSum =
        (r.rating_punctuality || 0) +
        (r.rating_communication || 0) +
        (r.rating_commitment || 0) +
        (r.rating_teamwork || 0) +
        (r.rating_responsibility || 0) +
        (r.rating_spiritual || 0);

      const avg = scoreSum / 6;

      grouped[monthKey].push({
        ...r,
        member_name: member.full_name,
        average_score: avg.toFixed(1)
      });
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return { months: sortedMonths, grouped };
  }, [reviews, members, searchQuery]);

  useEffect(() => {
    if (!activeTab && processedData.months.length > 0) {
      setActiveTab(processedData.months[0]);
    }
  }, [processedData.months, activeTab]);

  const currentReviews = activeTab ? (processedData.grouped[activeTab] || []) : [];

  const ScoreBadge = ({ label, score }: { label: string, score: number }) => (
    <div className="flex flex-col items-center min-w-[30px]">
      <span className={`text-[10px] font-bold ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-blue-600' : 'text-red-500'}`}>{score || '-'}</span>
      <span className="text-[7px] text-slate-400 uppercase tracking-tighter">{label}</span>
    </div>
  );

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">

      {/* HEADER & UNIT SELECTOR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Performance</h1>
              <p className="text-slate-500">Holistic member evaluation</p>
            </div>

            {isGlobalViewer && (
             <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-1.5 rounded-lg w-fit">
               <Building2 className="h-4 w-4 text-amber-600 ml-2" />
               <select
                 className="bg-transparent border-none text-sm font-bold text-amber-900 focus:ring-0 cursor-pointer min-w-[200px]"
                 value={selectedUnitId}
                 onChange={(e) => setSelectedUnitId(e.target.value)}
               >
                 {units.map(u => (
                   <option key={u.id} value={u.id}>{u.name}</option>
                 ))}
               </select>
             </div>
           )}
        </div>

        {isEditor && (
          <Button onClick={() => setIsAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Review</Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <input type="text" placeholder="Search by member name..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* MONTH TABS */}
      {processedData.months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {processedData.months.map(month => (
            <button key={month} onClick={() => setActiveTab(month)} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === month ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'}`}>{month}</button>
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
                  <th className="px-4 py-4 border-r border-slate-100">Member Name</th>
                  <th className="px-4 py-4 border-r border-slate-100 text-center">Score Breakdown</th>
                  <th className="px-4 py-4 border-r border-slate-100 text-center w-24">Avg</th>
                  <th className="px-4 py-4 w-32 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentReviews.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                       <div className="flex flex-col items-center">
                         <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
                         <p>No reviews found for {activeTab || "this unit"}.</p>
                         {isGlobalViewer && <p className="text-xs mt-1">Select a unit to view their performance logs.</p>}
                       </div>
                     </td>
                   </tr>
                ) : (
                  currentReviews.map((review, i) => (
                    <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs border-r border-slate-100">{(i + 1).toString().padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="h-3 w-3" /></div>
                          <div className="flex flex-col">
                              <span>{review.member_name}</span>
                              {review.comment && <span className="text-[10px] text-slate-400 font-normal italic truncate max-w-[150px]">"{review.comment}"</span>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 border-r border-slate-100">
                        <div className="flex justify-center gap-2">
                           <ScoreBadge label="Punc" score={review.rating_punctuality} />
                           <ScoreBadge label="Comm" score={review.rating_communication} />
                           <ScoreBadge label="Svc" score={review.rating_commitment} />
                           <ScoreBadge label="Team" score={review.rating_teamwork} />
                           <ScoreBadge label="Resp" score={review.rating_responsibility} />
                           <ScoreBadge label="Spirit" score={review.rating_spiritual} />
                        </div>
                      </td>

                      <td className="px-4 py-3 border-r border-slate-100 text-center">
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-100 font-bold text-xs">
                          <span>{review.average_score}</span>
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right text-slate-500 text-xs">
                        {new Date(review.review_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ReviewModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onReviewSubmitted={fetchData}
        members={members}       // <--- Passed Members
        unitId={selectedUnitId} // <--- Passed Unit ID
      />
    </div>
  );
};