import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

export interface DashboardStats {
  total: number;
  male: number;
  female: number;
  ratio: number;
  subunitsCount: number;
  attendance: {
    sunday: number;
    midweek: number;
    family: number;
    unit: number;
    other: number;
  };
}

export const useDashboardStats = () => {
  const { data: profile } = useProfile();

  const query = useQuery({
    queryKey: ['unit-dashboard-stats', profile?.unit_id],
    enabled: !!profile?.unit_id,
    queryFn: async (): Promise<{ stats: DashboardStats, birthdays: any[], unitProfile: any }> => {
      const unitId = profile!.unit_id!;

      // 1. Fetch Unit Profile - SELECTIVE
      const { data: unitProfile } = await supabase
        .from('units')
        .select('id, name, zone')
        .eq('id', unitId)
        .single();

      // 2. Fetch Members - SELECTIVE
      const { data: members, error } = await supabase
        .from('members')
        .select('id, full_name, gender, dob, unit_id')
        .eq('unit_id', unitId);

      if (error) throw error;

      // Calculate Stats
      const total = members?.length || 0;
      const male = members?.filter(m => m.gender?.toLowerCase() === 'male').length || 0;
      const female = members?.filter(m => m.gender?.toLowerCase() === 'female').length || 0;
      const ratio = total > 0 ? (male / total) * 100 : 50;

      // Calculate Birthdays (This Month)
      const currentMonth = new Date().getMonth();
      const birthdays = (members || [])
        .filter(m => {
          if (!m.dob) return false;
          return new Date(m.dob).getMonth() === currentMonth;
        })
        .sort((a, b) => new Date(a.dob!).getDate() - new Date(b.dob!).getDate());

      // 3. Fetch Subunits Count
      const { count: subunitsCount } = await supabase
        .from('subunits')
        .select('*', { count: 'exact', head: true })
        .eq('unit_id', unitId);

      // 4. FETCH ATTENDANCE STATS (Last 3 Months)
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString();

      const { data: events } = await supabase
        .from('events')
        .select(`
          event_type,
          attendance!inner(status)
        `)
        .eq('unit_id', unitId)
        .gte('date', threeMonthsAgo)
        .eq('attendance.status', 'present');

      const sums: Record<string, number> = { sunday: 0, midweek: 0, family: 0, unit: 0, other: 0 };
      const counts: Record<string, number> = { sunday: 0, midweek: 0, family: 0, unit: 0, other: 0 };

      events?.forEach((e: any) => {
        let key = 'other';
        const type = e.event_type;
        if (type === 'sunday_service') key = 'sunday';
        else if (type === 'midweek_service') key = 'midweek';
        else if (type === 'family_meeting') key = 'family';
        else if (type === 'unit_meeting') key = 'unit';

        const presentCount = Array.isArray(e.attendance) ? e.attendance.length : 0;
        sums[key] += presentCount;
        counts[key] += 1;
      });

      const stats: DashboardStats = {
        total, male, female, ratio,
        subunitsCount: subunitsCount || 0,
        attendance: {
          sunday: counts.sunday ? Math.round(sums.sunday / counts.sunday) : 0,
          midweek: counts.midweek ? Math.round(sums.midweek / counts.midweek) : 0,
          family: counts.family ? Math.round(sums.family / counts.family) : 0,
          unit: counts.unit ? Math.round(sums.unit / counts.unit) : 0,
          other: counts.other ? Math.round(sums.other / counts.other) : 0,
        }
      };

      return { stats, birthdays, unitProfile };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    stats: query.data?.stats || {
      total: 0, male: 0, female: 0, ratio: 50, subunitsCount: 0,
      attendance: { sunday: 0, midweek: 0, family: 0, unit: 0, other: 0 }
    },
    birthdays: query.data?.birthdays || [],
    unitProfile: query.data?.unitProfile || null,
    loading: query.isLoading,
    refresh: query.refetch
  };
};