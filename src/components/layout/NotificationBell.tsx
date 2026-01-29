import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink, Megaphone, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const NotificationBell = () => {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Counters & Data
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0); // For SMR
  const [notifications, setNotifications] = useState<any[]>([]); // For Unit Heads

  const isSMR = profile?.role === 'smr' || profile?.role === 'admin_pastor';

  // 1. Data Fetcher
  const fetchData = async () => {
    if (!profile) return;

    try {
      // A. Unread Announcements (ONLY for non-SMR users)
      if (!isSMR) {
        const { data: reads } = await supabase.from('announcement_reads').select('announcement_id').eq('user_id', profile.id);
        const readIds = new Set(reads?.map(r => r.announcement_id));

        const { data: allAnnouncements } = await supabase.from('announcements').select('id');
        const totalUnread = (allAnnouncements || []).filter(a => !readIds.has(a.id)).length;
        setUnreadAnnouncements(totalUnread);
      } else {
        setUnreadAnnouncements(0);
      }

      // B. Pending Requests (SMR Only)
      if (isSMR) {
        const { count } = await supabase.from('financial_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setPendingRequests(count || 0);
      }

      // C. Personal Notifications (Unit Heads)
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      setNotifications(notifs || []);

    } catch (err) {
      console.error("Notif Error", err);
    }
  };

  // 2. Browser Notification Helper
  const triggerBrowserNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/vite.svg' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/vite.svg' });
        }
      });
    }
  };

  // 3. Realtime Listener
  useEffect(() => {
    if (!profile) return;

    // Initial Fetch
    fetchData();

    // Unique channel for this user to prevent collisions
    const channel = supabase.channel(`bell:${profile.id}`)
      // A. Announcements (IGNORED IF SMR)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, () => {
        if (isSMR) return; // <--- SMRs don't need alerts for this

        setUnreadAnnouncements(prev => prev + 1);
        toast.info("New Announcement", { description: "Leadership posted an update." });
        triggerBrowserNotification("New Announcement", "Leadership posted an update.");
      })
      // B. Read Receipts (Syncs across devices/tabs)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcement_reads', filter: `user_id=eq.${profile.id}` }, () => {
        if (!isSMR) {
           setUnreadAnnouncements(prev => Math.max(0, prev - 1));
        }
      })
      // C. Personal Notifications (Approvals/Rejections)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        toast.info(payload.new.title, { description: payload.new.message });
        triggerBrowserNotification(payload.new.title, payload.new.message);
      })
      // D. SMR Pending Requests
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'financial_requests' }, (payload) => {
        if (isSMR && payload.new.status === 'pending') {
           setPendingRequests(prev => prev + 1);
           toast.info("New Financial Request");
           triggerBrowserNotification("New Financial Request", "A new request needs your review.");
        }
      })
      .subscribe();

    // Backup: Refetch when window regains focus (handles missed packets)
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [profile, isSMR]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- ACTIONS ---

  const markNotificationRead = async (id: string) => {
    // 1. Optimistic Update (Remove red dot immediately)
    setNotifications(prev => prev.filter(n => n.id !== id));

    // 2. Update DB
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const handleNotificationClick = (notif: any) => {
    // 1. Mark as Read
    markNotificationRead(notif.id);

    // 2. Navigate
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const totalCount = unreadAnnouncements + pendingRequests + notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <Bell className="h-6 w-6" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            {totalCount > 0 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{totalCount} New</span>}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {totalCount === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">You're all caught up!</p>
              </div>
            )}

            {/* 1. ANNOUNCEMENTS (Hidden for SMR) */}
            {!isSMR && unreadAnnouncements > 0 && (
              <div
                onClick={() => handleNavigate('/dashboard/announcements')}
                className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Unread Announcements</p>
                    <p className="text-xs text-slate-500 mt-0.5">You have {unreadAnnouncements} new announcements from leadership.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PENDING REQUESTS (SMR Only) */}
            {isSMR && pendingRequests > 0 && (
              <div
                onClick={() => handleNavigate('/smr/finance')}
                className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                    <Inbox className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Pending Requests</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pendingRequests} financial requests await your approval.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PERSONAL NOTIFICATIONS (Unit Heads) */}
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3 cursor-pointer"
              >
                <div className="mt-1">
                  {notif.type === 'finance_update' ? (
                    <div className="bg-green-100 p-1.5 rounded-full text-green-600"><Check className="h-3 w-3" /></div>
                  ) : (
                    <div className="bg-slate-100 p-1.5 rounded-full text-slate-600"><Bell className="h-3 w-3" /></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                       View Details <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};