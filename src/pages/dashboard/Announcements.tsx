import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CreateAnnouncementModal } from '@/components/dashboard/CreateAnnouncementModal';
import { Plus, CheckCheck, Clock, AlertCircle, Trash2, Loader2, Megaphone, ChevronRight, User } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export const AnnouncementsPage = () => {
  const { data: profile } = useProfile();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null); // For viewing details

  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Role check
  const isSMR = profile?.role === 'smr' || profile?.role === 'admin_pastor';

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch Announcements
      const { data: annData, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:profiles!announcements_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fetch Read Status for Current User
      const { data: readsData } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', profile.id);

      const readSet = new Set(readsData?.map(r => r.announcement_id));
      setReadIds(readSet);
      setAnnouncements(annData || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Handle Opening an Announcement
  const handleView = (announcement: any) => {
    setSelectedAnnouncement(announcement);

    // If regular user (not SMR) and hasn't read it yet, mark as read
    if (!isSMR && !readIds.has(announcement.id)) {
      markAsRead(announcement.id);
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic Update
    const newReads = new Set(readIds);
    newReads.add(id);
    setReadIds(newReads);

    try {
      await supabase.from('announcement_reads').insert({
        announcement_id: id,
        user_id: profile?.id
      });
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await supabase.from('announcements').delete().eq('id', id);
      toast.success("Deleted");
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      if (selectedAnnouncement?.id === id) setSelectedAnnouncement(null);
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500">Official updates from Leadership</p>
        </div>
        {isSMR && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Announcement
          </Button>
        )}
      </div>

      {/* --- LIST VIEW --- */}
      <div className="space-y-2">
        {announcements.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No announcements yet.</p>
          </div>
        ) : (
          announcements.map((ann) => {
            const isRead = readIds.has(ann.id) || isSMR; // SMR always sees as "read" visually (no blue dot)
            const isUrgent = ann.priority === 'urgent';

            return (
              <div
                key={ann.id}
                onClick={() => handleView(ann)}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  !isRead
                    ? 'bg-white border-blue-200 shadow-sm'
                    : 'bg-slate-50 border-slate-200 opacity-90'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon / Status Indicator */}
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${!isRead ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isUrgent && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Urgent
                        </span>
                      )}
                      <h3 className={`font-bold text-base ${!isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                        {ann.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {ann.author?.full_name || 'Leadership'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            );
          })
        )}
      </div>

      {/* --- CREATE MODAL --- */}
      <CreateAnnouncementModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchData}
      />

      {/* --- VIEW DETAIL MODAL --- */}
      {selectedAnnouncement && (
        <Modal
          isOpen={!!selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
          title={selectedAnnouncement.priority === 'urgent' ? 'Urgent Announcement' : 'Announcement'}
        >
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
               <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedAnnouncement.title}</h2>
               <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-full">
                      <User className="h-3 w-3" /> {selectedAnnouncement.author?.full_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Only show 'Read' status to regular users */}
                  {!isSMR && (
                    <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                      <CheckCheck className="h-3 w-3" /> Marked as Read
                    </span>
                  )}
               </div>
            </div>

            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
              {selectedAnnouncement.content}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
               {isSMR && (
                 <Button
                   variant="ghost"
                   className="text-red-500 hover:text-red-700 hover:bg-red-50"
                   onClick={() => handleDelete(selectedAnnouncement.id)}
                 >
                   <Trash2 className="mr-2 h-4 w-4" /> Delete
                 </Button>
               )}
               <Button onClick={() => setSelectedAnnouncement(null)}>
                 Close
               </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};