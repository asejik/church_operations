import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2, ChevronLeft, ChevronRight, LayoutGrid, List, Pencil, Building2, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { NewSessionModal } from '@/components/dashboard/NewSessionModal';

export const AttendancePage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();

  // --- 1. ROLE LOGIC ---
  const isGlobalViewer = profile?.role === 'smr' || profile?.role === 'admin_pastor';
  const isEditor = profile?.role === 'unit_head';

  // --- 2. VIEW STATE ---
  const [viewMode, setViewMode] = useState<'matrix' | 'history'>('matrix');
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- 3. DATA STATE ---
  const [units, setUnits] = useState<any[]>([]); // For Dropdown
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // FILTERS
  const [filterType, setFilterType] = useState<string>('all');

  const [members, setMembers] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // --- 4. MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSessionDate, setEditSessionDate] = useState<string | undefined>(undefined);
  const [editSessionStatuses, setEditSessionStatuses] = useState<Record<string, 'present' | 'absent'> | undefined>(undefined);

  // --- EFFECT: INITIALIZE UNIT SELECTION ---
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

  // --- EFFECT: FETCH ATTENDANCE DATA ---
  const fetchData = async () => {
    if (!selectedUnitId) return;

    setDataLoading(true);
    try {
      // A. Fetch Members
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('unit_id', selectedUnitId)
        .order('full_name');

      if (memberError) throw memberError;

      // B. Fetch Logs + Event Type JOIN
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();

      // We join with the 'events' table to get the event_type
      let query = supabase
        .from('attendance')
        .select(`
          *,
          events!inner (
            title,
            event_type
          )
        `)
        .eq('unit_id', selectedUnitId)
        .gte('event_date', start)
        .lte('event_date', end);

      if (filterType !== 'all') {
        query = query.eq('events.event_type', filterType);
      }

      const { data: logsData, error: logsError } = await query;

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

  // Re-fetch when dependencies change
  useEffect(() => {
    fetchData();
  }, [selectedUnitId, currentDate, filterType]); // Added filterType dependency

  // --- HELPER FUNCTIONS ---
  const handleEditSession = (dateStr: string) => {
    if (!isEditor) return;
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

  const getEventTitle = (dateStr: string) => {
    const log = attendanceLogs.find(l => l.event_date === dateStr);
    // @ts-ignore - Supabase join returns object, sometimes type defs are tricky without full generation
    return log?.events?.title || format(parseISO(dateStr), 'EEEE') + ' Service';
  };

  const handleMonthChange = (dir: 'prev' | 'next') => {
    setCurrentDate(curr => dir === 'prev' ? subMonths(curr, 1) : addMonths(curr, 1));
  };

  if (profileLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
           <div>
             <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
             <p className="text-slate-500">Track presence and consistency</p>
           </div>

           {/* GLOBAL UNIT SELECTOR */}
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

        {/* CONTROLS */}
        <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('matrix')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${viewMode === 'matrix' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">Matrix</span>
              </button>
              <button onClick={() => setViewMode('history')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${viewMode === 'history' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
                <List className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
              </button>
            </div>

            {isEditor && (
              <Button onClick={handleNewSession}>
                <Plus className="mr-2 h-4 w-4" /> New Session
              </Button>
            )}
        </div>
      </div>

      {/* MONTH NAV & FILTER */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
        {/* Month Selector */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
           <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-slate-50 rounded-md text-slate-500"><ChevronLeft className="h-4 w-4" /></button>
           <div className="px-4 font-bold text-slate-700 min-w-[140px] text-center">
             {format(currentDate, 'MMMM yyyy')}
           </div>
           <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-slate-50 rounded-md text-slate-500"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Service Type Filter */}
        <div className="flex items-center gap-2">
           <select
             className={`h-10 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-w-[160px] cursor-pointer transition-colors ${
               filterType !== 'all'
                 ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                 : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
             }`}
             value={filterType}
             onChange={e => setFilterType(e.target.value)}
           >
             <option value="all">Filter by Type</option>
             <option value="sunday_service">Sunday Service</option>
             <option value="midweek_service">Midweek Service</option>
             <option value="unit_meeting">Unit Meeting</option>
             <option value="family_meeting">Family Meeting</option>
             <option value="other">Other</option>
           </select>

           {filterType !== 'all' && (
             <Button variant="ghost" size="sm" onClick={() => setFilterType('all')} className="h-10 w-10 p-0 text-red-500 bg-red-50 hover:bg-red-100">
               <X className="h-4 w-4" />
             </Button>
           )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px]">
        {dataLoading ? (
           <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-300" /></div>
        ) : members.length === 0 ? (
           <div className="text-center py-12 text-slate-400 border rounded-xl border-dashed">
             <p>No members found in {isGlobalViewer ? "this unit" : "your unit"}.</p>
             {isGlobalViewer && <p className="text-xs mt-1">Try selecting a different unit above.</p>}
           </div>
        ) : (
           <>
             {/* MATRIX VIEW */}
             {viewMode === 'matrix' && (
               <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200">
                         <th className="px-4 py-4 w-12 font-bold text-slate-400">S/N</th>
                         <th className="px-4 py-4 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10 shadow-sm">Member Name</th>
                         {matrixDates.length === 0 ? (
                           <th className="px-4 py-4 font-normal text-slate-400 italic">No sessions found</th>
                         ) : (
                           matrixDates.map(date => {
                             const stats = getDailyStats(date);
                             return (
                               <th key={date} className="px-4 py-3 text-center min-w-[100px]">
                                 <div className="font-bold text-slate-700">{format(parseISO(date), 'EEE d')}</div>
                                 <div className="text-[10px] text-slate-400 font-normal truncate max-w-[80px] mx-auto">{getEventTitle(date)}</div>
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

             {/* HISTORY VIEW */}
             {viewMode === 'history' && (
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
                             <h3 className="font-bold text-slate-800">{getEventTitle(date)}</h3>
                             <div className="flex gap-4 text-sm mt-1">
                               <span className="text-green-600 font-medium">{stats.present} Present</span>
                               <span className="text-slate-400">•</span>
                               <span className="text-red-500 font-medium">{stats.absent} Absent</span>
                               <span className="text-slate-400">•</span>
                               <span className="text-slate-500">{attendancePercent}% Turnout</span>
                             </div>
                           </div>
                         </div>

                         {isEditor && (
                           <Button variant="outline" size="sm" onClick={() => handleEditSession(date)}>
                             <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                           </Button>
                         )}
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
        unitId={selectedUnitId}
        members={members}
        onSuccess={handleSessionSaved}
        defaultDate={editSessionDate}
        initialStatuses={editSessionStatuses}
      />
    </div>
  );
};