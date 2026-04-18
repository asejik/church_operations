import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { type Member } from '@/lib/db';
import { subMonths } from 'date-fns';

export const useDashboardStats = () => {
  const { data: profile } = useProfile();

  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    ratio: 50,
    subunitsCount: 0,
    // NEW: Attendance Stats
    attendance: {
      sunday: 0,
      midweek: 0,
      family: 0,
      unit: 0,
      other: 0
    }
  });

  const [birthdays, setBirthdays] = useState<Member[]>([]);
  const [unitProfile, setUnitProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.unit_id) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const unitId = profile.unit_id;

        // 1. Fetch Unit Profile
        const { data: unitData } = await supabase
          .from('units')
          .select('*')
          .eq('id', unitId)
          .single();

        if (unitData) setUnitProfile(unitData);

        // 2. Fetch Members (For Stats & Birthdays)
        const { data: members, error } = await supabase
          .from('members')
          .select('*')
          .eq('unit_id', unitId);

        if (error) throw error;

        if (members) {
          // Calculate Stats
          const total = members.length;
          const male = members.filter(m => m.gender?.toLowerCase() === 'male').length;
          const female = members.filter(m => m.gender?.toLowerCase() === 'female').length;
          const ratio = total > 0 ? (male / total) * 100 : 50;

          // Calculate Birthdays (This Month)
          const currentMonth = new Date().getMonth();
          const bdays = members
            .filter(m => {
              if (!m.dob) return false;
              return new Date(m.dob).getMonth() === currentMonth;
            })
            .sort((a, b) => new Date(a.dob!).getDate() - new Date(b.dob!).getDate());

          setBirthdays(bdays);

          setStats(prev => ({ ...prev, total, male, female, ratio }));
        }

        // 3. Fetch Subunits Count
        const { count: subCount } = await supabase
          .from('subunits')
          .select('*', { count: 'exact', head: true })
          .eq('unit_id', unitId);

        setStats(prev => ({ ...prev, subunitsCount: subCount || 0 }));

        // 4. FETCH ATTENDANCE STATS (Last 3 Months)
        const threeMonthsAgo = subMonths(new Date(), 3).toISOString();

        // Fetch events with attendance counts
        const { data: events } = await supabase
          .from('events')
          .select(`
            event_type,
            attendance(count)
          `)
          .eq('unit_id', unitId)
          .gte('date', threeMonthsAgo)
          .eq('attendance.status', 'present'); // Only count present

        // Calculate Averages
        const sums: Record<string, number> = { sunday: 0, midweek: 0, family: 0, unit: 0, other: 0 };
        const counts: Record<string, number> = { sunday: 0, midweek: 0, family: 0, unit: 0, other: 0 };

        events?.forEach((e: any) => {
          let key = 'other';
          if (e.event_type === 'sunday_service') key = 'sunday';
          if (e.event_type === 'midweek_service') key = 'midweek';
          if (e.event_type === 'family_meeting') key = 'family';
          if (e.event_type === 'unit_meeting') key = 'unit';

          // Ensure e.attendance is handled as array (Supabase standard join)
          const presentCount = Array.isArray(e.attendance) ? e.attendance.length : 0; // count rows if returning rows, or use .count

          // Actually, if we use count in select, e.attendance is [{count: N}]
          // Let's rely on row counting for accuracy if query is simple,
          // or assume the query returns array of rows if we didn't specify count aggregation strictly.
          // Adjusting logic: The safest way with the query above is to count the array length.

          sums[key] += presentCount;
          counts[key] += 1;
        });

        setStats(prev => ({
          ...prev,
          attendance: {
            sunday: counts.sunday ? Math.round(sums.sunday / counts.sunday) : 0,
            midweek: counts.midweek ? Math.round(sums.midweek / counts.midweek) : 0,
            family: counts.family ? Math.round(sums.family / counts.family) : 0,
            unit: counts.unit ? Math.round(sums.unit / counts.unit) : 0,
            other: counts.other ? Math.round(sums.other / counts.other) : 0,
          }
        }));

      } catch (error) {
        logger.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [profile?.unit_id]);

  return { stats, birthdays, unitProfile, loading, refresh: () => {} };
};