import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Plus, Search, Star, User, MessageSquare, BarChart2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

// --- INTERNAL COMPONENT: STAR RATING ---
const StarInput = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`p-1 transition-transform hover:scale-110 focus:outline-none`}
        >
          <Star
            className={`h-5 w-5 ${star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
          />
        </button>
      ))}
    </div>
  </div>
);

// --- MODAL: ADD REVIEW (ONLINE ONLY) ---
const AddReviewModal = ({ isOpen, onClose, onComplete, members }: { isOpen: boolean; onClose: () => void; onComplete: () => void, members: any[] }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    member_id: '',
    rating_punctuality: 3,
    rating_availability: 3,
    rating_skill: 3,
    rating_teamwork: 3,
    rating_spiritual: 3,
    comment: '',
    review_date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async () => {
    if (!profile?.unit_id || !formData.member_id) {
      toast.error("Please select a member");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('performance_reviews').insert({
        unit_id: profile.unit_id,
        member_id: formData.member_id,
        rating_punctuality: formData.rating_punctuality,
        rating_availability: formData.rating_availability,
        rating_skill: formData.rating_skill,
        rating_teamwork: formData.rating_teamwork,
        rating_spiritual: formData.rating_spiritual,
        comment: formData.comment,
        review_date: formData.review_date,
      });

      if (error) throw error;

      toast.success("Review saved successfully");
      onComplete();
      onClose();
      // Reset Form
      setFormData(prev => ({
        ...prev,
        member_id: '',
        comment: '',
        rating_punctuality: 3, rating_availability: 3, rating_skill: 3, rating_teamwork: 3, rating_spiritual: 3
      }));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Performance Review">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Select Member</label>
            <select
              className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              value={formData.member_id}
              onChange={e => setFormData({ ...formData, member_id: e.target.value })}
            >
              <option value="">-- Choose Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
            <input
              type="date"
              className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={formData.review_date}
              onChange={e => setFormData({ ...formData, review_date: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
             <BarChart2 className="h-4 w-4 text-blue-600" />
             <h3 className="text-sm font-bold text-slate-800">Scorecard</h3>
          </div>
          <div className="space-y-1">
            <StarInput label="Punctuality" value={formData.rating_punctuality} onChange={v => setFormData({...formData, rating_punctuality: v})} />
            <StarInput label="Availability" value={formData.rating_availability} onChange={v => setFormData({...formData, rating_availability: v})} />
            <StarInput label="Skill Proficiency" value={formData.rating_skill} onChange={v => setFormData({...formData, rating_skill: v})} />
            <StarInput label="Teamwork" value={formData.rating_teamwork} onChange={v => setFormData({...formData, rating_teamwork: v})} />
            <StarInput label="Spiritual Growth" value={formData.rating_spiritual} onChange={v => setFormData({...formData, rating_spiritual: v})} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">General Comment</label>
          <textarea
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            rows={2}
            placeholder="Key observations..."
            value={formData.comment}
            onChange={e => setFormData({ ...formData, comment: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save Review</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN PAGE ---
export const PerformancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');

  const [reviews, setReviews] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FETCH DATA (Online First)
  const fetchData = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      // 1. Fetch Members (for names/images)
      const { data: memberData } = await supabase
        .from('members')
        .select('id, full_name, image_url') // Added image_url if you have it
        .eq('unit_id', profile.unit_id);

      setMembers(memberData || []);

      // 2. Fetch Reviews
      const { data: reviewData } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('unit_id', profile.unit_id)
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
  }, [profile?.unit_id]);

  // PROCESS DATA (Grouping by Month)
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

      // Calculate Average
      const avg = (r.rating_punctuality + r.rating_availability + r.rating_skill + r.rating_teamwork + r.rating_spiritual) / 5;

      grouped[monthKey].push({
        ...r,
        member_name: member.full_name,
        // member_img: member.image_url, // Uncomment if you have images
        average_score: avg.toFixed(1)
      });
    });

    const sortedMonths = Array.from(monthsSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Newest months first

    return { months: sortedMonths, grouped };
  }, [reviews, members, searchQuery]);

  // Set default tab to newest month
  useEffect(() => {
    if (!activeTab && processedData.months.length > 0) {
      setActiveTab(processedData.months[0]);
    }
  }, [processedData.months, activeTab]);

  const currentReviews = activeTab ? (processedData.grouped[activeTab] || []) : [];

  const ScoreBadge = ({ label, score }: { label: string, score: number }) => (
    <div className="flex flex-col items-center">
      <span className={`text-[10px] font-bold ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-blue-600' : 'text-red-500'}`}>{score}</span>
      <span className="text-[8px] text-slate-400 uppercase">{label}</span>
    </div>
  );

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Performance</h1><p className="text-slate-500">Holistic member evaluation</p></div>
        {profile?.role !== 'unit_pastor' && (
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
                  <th className="px-4 py-4 border-r border-slate-100 text-center">Breakdown</th>
                  <th className="px-4 py-4 border-r border-slate-100 text-center w-24">Avg</th>
                  <th className="px-4 py-4 w-32 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentReviews.length === 0 ? (
                   <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><div className="flex flex-col items-center"><MessageSquare className="h-10 w-10 text-slate-300 mb-2" /><p>No reviews found for this month.</p></div></td></tr>
                ) : (
                  currentReviews.map((review, i) => (
                    <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400 text-xs border-r border-slate-100">{(i + 1).toString().padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User className="h-3 w-3" /></div>
                          <div className="flex flex-col">
                              <span>{review.member_name}</span>
                              <span className="text-[10px] text-slate-400 font-normal italic">"{review.comment}"</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 border-r border-slate-100">
                        <div className="flex justify-center gap-3">
                           <ScoreBadge label="Punc" score={review.rating_punctuality} />
                           <ScoreBadge label="Avail" score={review.rating_availability} />
                           <ScoreBadge label="Skill" score={review.rating_skill} />
                           <ScoreBadge label="Team" score={review.rating_teamwork} />
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

      {/* Pass members to the modal so it doesn't need to fetch them again */}
      <AddReviewModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onComplete={fetchData}
        members={members}
      />
    </div>
  );
};