import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { SessionEditor } from '@/components/attendance/SessionEditor';
import { Plus, History, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

// Helper to group logs by event
const useAttendanceMatrix = () => {
  // 1. Fetch Members Sorted Alphabetically
  const members = useLiveQuery(() => db.members.orderBy('full_name').toArray(), []);
  const logs = useLiveQuery(() => db.attendanceLogs.toArray(), []);

  return useMemo(() => {
    if (!members || !logs) return { headers: [], rows: [] };

    // 2. Get Unique Sessions (Events)
    const sessionsMap = new Map();
    logs.forEach(log => {
      if (!sessionsMap.has(log.event_id)) {
        // Calculate Stats for this session
        const sessionLogs = logs.filter(l => l.event_id === log.event_id);
        const presentCount = sessionLogs.filter(l => l.status === 'present').length;
        const absentCount = sessionLogs.filter(l => l.status === 'absent').length;

        sessionsMap.set(log.event_id, {
          id: log.event_id,
          date: log.event_date,
          present: presentCount,
          absent: absentCount
        });
      }
    });

    // Sort sessions by date (Oldest -> Newest) for correct rendering order
    const headers = Array.from(sessionsMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Build Rows (Member + Their Logs)
    const rows = members.map(member => {
      const memberLogs: any = {};
      logs.filter(l => l.member_id === member.id).forEach(l => {
        memberLogs[l.event_id] = l;
      });
      return { member, attendance: memberLogs };
    });

    return { headers, rows };
  }, [members, logs]);
};

export const AttendancePage = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [view, setView] = useState<'matrix' | 'history'>('matrix');
  const [activeTab, setActiveTab] = useState<string>(''); // For Month Tabs

  const { headers, rows } = useAttendanceMatrix();

  // --- SYNC ON MOUNT ---
  useEffect(() => {
    const syncAttendance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('unit_id').eq('id', user.id).single();
      if (!profile?.unit_id) return;

      const { data: logs } = await supabase.from('attendance').select('*').eq('unit_id', profile.unit_id);

      if (logs) {
        await db.attendanceLogs.bulkPut(logs.map((l: any) => ({ ...l, synced: 1 })));
      }
    };
    syncAttendance();
  }, []);

  // --- MONTH GROUPING LOGIC ---
  const processedData = useMemo(() => {
    const monthsSet = new Set<string>();

    // Extract unique months from headers
    headers.forEach(h => {
      const dateObj = new Date(h.date);
      const monthKey = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      monthsSet.add(monthKey);
    });

    // Sort months (Newest first)
    const sortedMonths = Array.from(monthsSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return { months: sortedMonths };
  }, [headers]);

  // Set default tab
  useEffect(() => {
    if (!activeTab && processedData.months.length > 0) {
      setActiveTab(processedData.months[0]);
    }
  }, [processedData.months, activeTab]);

  // Filter Headers based on Active Tab
  const filteredHeaders = useMemo(() => {
    if (!activeTab) return [];
    return headers.filter(h => {
      const monthKey = new Date(h.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      return monthKey === activeTab;
    });
  }, [headers, activeTab]);

  // Pagination for columns (Matrix View)
  const [page, setPage] = useState(0);
  const SESSIONS_PER_PAGE = 5;

  // Logic to show LATEST sessions first within the month
  // We want to slice from the end of the array because headers are sorted Oldest->Newest
  // But usually, we want to see the latest dates on the right or left.
  // Let's simply slice the filtered headers.
  // To make it intuitive: For "Jan 2026", we usually want to see 1st Jan -> 31st Jan.

  const startIndex = Math.max(0, filteredHeaders.length - SESSIONS_PER_PAGE - (page * SESSIONS_PER_PAGE));
  const visibleHeaders = filteredHeaders.slice(startIndex, startIndex + SESSIONS_PER_PAGE);

  const handleEditSession = (sessionId: string) => {
    setEditingSessionId(sessionId);
    setIsEditorOpen(true);
  };

  const handleNewSession = () => {
    setEditingSessionId(null);
    setIsEditorOpen(true);
  };

  const { data: profile } = useProfile();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500">Track presence and consistency</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-slate-100 p-1 rounded-lg">
              {profile?.role !== 'unit_pastor' && (
                <button onClick={() => setView('matrix')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'matrix' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Matrix</button>
              )}
              {profile?.role !== 'unit_pastor' && (
                <button onClick={() => setView('history')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>History</button>
              )}
           </div>
           {profile?.role !== 'unit_pastor' && (
            <Button onClick={handleNewSession}>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
            )}
        </div>
      </div>

      {/* --- MONTH TABS --- */}
      {processedData.months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {processedData.months.map(month => (
            <button
              key={month}
              onClick={() => { setActiveTab(month); setPage(0); }}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === month
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      )}

      {view === 'matrix' ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Scroll Controls */}
          {filteredHeaders.length > SESSIONS_PER_PAGE && (
            <div className="flex justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
              <button
                 disabled={startIndex <= 0}
                 onClick={() => setPage(p => p + 1)}
                 className="flex items-center text-xs font-medium text-slate-500 disabled:opacity-30 hover:text-blue-600"
              >
                <ChevronLeft className="h-4 w-4" /> Older
              </button>
              <span className="text-xs font-bold text-slate-400">Showing {visibleHeaders.length} of {filteredHeaders.length} sessions</span>
              <button
                 disabled={startIndex + SESSIONS_PER_PAGE >= filteredHeaders.length}
                 onClick={() => setPage(p => p - 1)}
                 className="flex items-center text-xs font-medium text-slate-500 disabled:opacity-30 hover:text-blue-600"
              >
                Newer <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold w-12 text-center border-r border-slate-100">S/N</th>
                  <th className="px-4 py-3 font-semibold border-r border-slate-100 min-w-[200px]">Member Name</th>

                  {visibleHeaders.map(h => (
                    <th key={h.id} className="px-2 py-2 text-center min-w-[100px] border-r border-slate-100 last:border-0">
                      <div className="flex flex-col items-center gap-1 cursor-pointer hover:bg-slate-200 rounded p-1 transition-colors" onClick={() => handleEditSession(h.id)}>
                        <span className="text-xs font-bold text-slate-900">
                          {new Date(h.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-green-600 font-medium">P: {h.present}</span>
                          <span className="text-red-500 font-medium">A: {h.absent}</span>
                        </div>
                      </div>
                    </th>
                  ))}
                  {visibleHeaders.length === 0 && <th className="px-4 py-4 text-center text-slate-400 font-normal italic">No sessions this month</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={row.member.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs border-r border-slate-100">{(index + 1).toString().padStart(2, '0')}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 group-hover:text-blue-700 transition-colors">{row.member.full_name}</td>

                    {visibleHeaders.map(h => {
                      const log = row.attendance[h.id];
                      if (!log) return <td key={h.id} className="px-2 py-3 text-center text-slate-300 border-r border-slate-100 last:border-0">-</td>;
                      const isPresent = log.status === 'present';
                      return (
                        <td key={h.id} className="px-2 py-3 text-center border-r border-slate-100 last:border-0">
                          <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-xs font-bold border cursor-default group/cell relative ${isPresent ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700 cursor-help'}`}>
                            {isPresent ? 'P' : 'A'}
                            {!isPresent && log.reason && (
                              <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 w-max max-w-[150px] rounded bg-slate-900 px-2 py-1 text-[10px] font-normal text-white shadow-lg group-hover/cell:block z-20">
                                {log.reason}<div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900"></div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* HISTORY VIEW (Filtered by Month) */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHeaders.length === 0 ? (
             <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
                <Calendar className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p>No attendance sessions found for {activeTab}.</p>
             </div>
          ) : (
             filteredHeaders.slice().reverse().map(session => (
               <div key={session.id} onClick={() => handleEditSession(session.id)} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                     <span className="text-lg font-bold text-slate-900">
                       {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                     </span>
                     <History className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded"><span className="font-bold">{session.present}</span> Present</div>
                    <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-1 rounded"><span className="font-bold">{session.absent}</span> Absent</div>
                  </div>
               </div>
            ))
          )}
        </div>
      )}

      {isEditorOpen && (
        <SessionEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          existingSessionId={editingSessionId}
          onSaveComplete={() => {}}
        />
      )}
    </div>
  );
};