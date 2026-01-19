import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2, ChevronLeft, ChevronRight, LayoutGrid, List, Pencil } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { NewSessionModal } from '@/components/dashboard/NewSessionModal';

export const AttendancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();

  // VIEW STATE
  const [viewMode, setViewMode] = useState<'matrix' | 'history'>('matrix');
  const [currentDate, setCurrentDate] = useState(new Date());

  // DATA STATE
  const [members, setMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSessionDate, setEditSessionDate] = useState<string | undefined>(undefined);
  const [editSessionStatuses, setEditSessionStatuses] = useState<Record<string, 'present' | 'absent'> | undefined>(undefined);

  // ROLE CHECK: Is the user allowed to Edit? (Only Unit Heads)
  const isEditor = profile?.role === 'unit_head';

  const fetchData = async () => {
    if (!profile?.unit_id) return;

    setDataLoading(true);
    try {
      // A. Fetch Members
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('unit_id', profile.unit_id)
        .order('full_name');

      if (memberError) throw memberError;

      // B. Fetch Logs
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();

      const { data: logsData, error: logsError } = await supabase
        .from('attendance')
        .select('*')
        .eq('unit_id', profile.unit_id)
        .gte('event_date', start)
        .lte('event_date', end);

      if (logsError) throw logsError;

      setMembers(memberData || []);
      setAttendanceLogs(logsData || []);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.unit_id) {
      fetchData();
    }
  }, [profile?.unit_id, currentDate]);

  const handleEditSession = (dateStr: string) => {
    if (!isEditor) return; // Guard
    const logs = attendanceLogs.filter(l => l.event_date === dateStr);
    const statuses: Record<string, 'present' | 'absent'> = {};
    logs.forEach(l => {
      statuses[l.member_id] = l.status;
    });
    setEditSessionDate(dateStr);
    setEditSessionStatuses(statuses);
    setIsModalOpen(true);
  };

  const handleNewSession = () => {
    setEditSessionDate(undefined);
    setEditSessionStatuses(undefined);
    setIsModalOpen(true);
  };

  const handleSessionSaved = () => {
    fetchData();
  };

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    attendanceLogs.forEach(log => {
      if (log.event_date) dates.add(log.event_date);
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [attendanceLogs]);

  const matrixDates = [...eventDates].reverse();

  const getStatus = (memberId: string, dateStr: string) => {
    const log = attendanceLogs.find(l => l.member_id === memberId && l.event_date === dateStr);
    return log?.status || '-';
  };

  const getDailyStats = (dateStr: string) => {
    const logs = attendanceLogs.filter(l => l.event_date === dateStr);
    const present = logs.filter(l => l.status === 'present').length;
    const absent = logs.filter(l => l.status === 'absent').length;
    return { present, absent };
  };

  const handleMonthChange = (dir: 'prev' | 'next') => {
    setCurrentDate(curr => dir === 'prev' ? subMonths(curr, 1) : addMonths(curr, 1));
  };

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;
  if (!profile?.unit_id) return <div className="text-center py-10 text-slate-400">Unit profile not found.</div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
           <p className="text-slate-500">Track presence and consistency</p>
        </div>

        {/* CONTROLS (Only visible to Editor/Unit Head) */}
        {isEditor && (
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${viewMode === 'matrix' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <LayoutGrid className="h-4 w-4" /> Matrix
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${viewMode === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <List className="h-4 w-4" /> History
              </button>
            </div>

            <Button onClick={handleNewSession}>
              <Plus className="mr-2 h-4 w-4" /> New Session
            </Button>
          </div>
        )}
      </div>

      {/* MONTH NAV */}
      <div className="flex justify-center">
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
           <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-slate-50 rounded-md text-slate-500"><ChevronLeft className="h-4 w-4" /></button>
           <div className="px-4 font-bold text-slate-700 min-w-[140px] text-center">
             {format(currentDate, 'MMMM yyyy')}
           </div>
           <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-slate-50 rounded-md text-slate-500"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px]">
        {dataLoading ? (
           <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
        ) : members.length === 0 ? (
           <div className="text-center py-12 text-slate-400">No members found.</div>
        ) : (
           <>
             {/* MATRIX VIEW (Default for everyone) */}
             {(viewMode === 'matrix' || !isEditor) && (
               <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200">
                         <th className="px-4 py-4 w-12 font-bold text-slate-400">S/N</th>
                         <th className="px-4 py-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 shadow-sm">Member Name</th>
                         {matrixDates.length === 0 ? (
                           <th className="px-4 py-4 font-normal text-slate-400 italic">No sessions this month</th>
                         ) : (
                           matrixDates.map(date => {
                             const stats = getDailyStats(date);
                             return (
                               <th key={date} className="px-4 py-3 text-center min-w-[100px]">
                                 <div className="font-bold text-slate-700">{format(parseISO(date), 'EEE d MMM')}</div>
                                 <div className="flex justify-center gap-2 text-[10px] mt-1">
                                   <span className="text-green-600 font-bold">P: {stats.present}</span>
                                   <span className="text-red-500 font-bold">A: {stats.absent}</span>
                                 </div>
                               </th>
                             );
                           })
                         )}
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {members.map((member, idx) => (
                         <tr key={member.id} className="hover:bg-slate-50">
                           <td className="px-4 py-3 text-slate-400 text-xs font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
                           <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white z-10">{member.full_name}</td>
                           {matrixDates.map(date => {
                             const status = getStatus(member.id, date);
                             return (
                               <td key={date} className="px-4 py-3 text-center">
                                 {status === 'present' && <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded font-bold text-xs">P</span>}
                                 {status === 'absent' && <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded font-bold text-xs">A</span>}
                                 {status === '-' && <span className="text-slate-300">-</span>}
                               </td>
                             );
                           })}
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}

             {/* HISTORY VIEW (Editors Only) */}
             {viewMode === 'history' && isEditor && (
               <div className="space-y-3">
                 {eventDates.length === 0 ? (
                   <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">No sessions recorded for {format(currentDate, 'MMMM')}.</div>
                 ) : (
                   eventDates.map(date => {
                     const stats = getDailyStats(date);
                     const attendancePercent = Math.round((stats.present / (stats.present + stats.absent)) * 100) || 0;

                     return (
                       <div key={date} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-blue-300 transition-colors">
                         <div className="flex items-center gap-6">
                           <div className="text-center min-w-[60px]">
                             <div className="text-2xl font-bold text-slate-900">{format(parseISO(date), 'dd')}</div>
                             <div className="text-xs font-bold text-slate-500 uppercase">{format(parseISO(date), 'MMM')}</div>
                           </div>

                           <div className="h-10 w-px bg-slate-100"></div>

                           <div>
                             <h3 className="font-bold text-slate-800">{format(parseISO(date), 'EEEE')} Service</h3>
                             <div className="flex gap-4 text-sm mt-1">
                               <span className="text-green-600 font-medium">{stats.present} Present</span>
                               <span className="text-slate-400">•</span>
                               <span className="text-red-500 font-medium">{stats.absent} Absent</span>
                               <span className="text-slate-400">•</span>
                               <span className="text-slate-500">{attendancePercent}% Turnout</span>
                             </div>
                           </div>
                         </div>

                         <Button variant="outline" size="sm" onClick={() => handleEditSession(date)}>
                           <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                         </Button>
                       </div>
                     )
                   })
                 )}
               </div>
             )}
           </>
        )}
      </div>

      <NewSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unitId={profile.unit_id}
        members={members}
        onSuccess={handleSessionSaved}
        defaultDate={editSessionDate}
        initialStatuses={editSessionStatuses}
      />
    </div>
  );
};