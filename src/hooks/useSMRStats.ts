import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { startOfMonth, subMonths, startOfYear, format } from 'date-fns';

export interface SMRStats {
  workforce: {
    total: number;
    joinedMonth: number;
    joinedYear: number;
    cesRatio: number;
    gender: { male: number; female: number; ratio: string };
    marital: { single: number; married: number; ratio: string };
    status: { student: number; nysc: number; employed: number; unemployed: number };
    byUnit: { name: string; count: number }[];
  };
  attendance: {
    midweek: number;
    sunday: number;
    family: number;
    avgMonthly: number;
    history: { date: string; type: string; count: number }[];
  };
  finance: {
    spendingByUnit: { name: string; value: number }[];
    pendingCount: number;
  };
  souls: {
    month: number;
    year: number;
    topWinners: { name: string; count: number; avatar?: string }[];
    topUnits: { name: string; count: number }[];
  };
  performance: {
    lowPerformers: { name: string; unit: string; rating: number }[];
  };
}

// Helper to handle Supabase joins
const getJoinData = (data: any, key: string) => {
  if (!data) return null;
  const val = data[key];
  if (Array.isArray(val)) return val[0] || null;
  return val;
};

export const useSMRStats = () => {
  const [stats, setStats] = useState<SMRStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const firstDayMonth = startOfMonth(now).toISOString();
      const firstDayYear = startOfYear(now).toISOString();
      const threeMonthsAgo = subMonths(now, 3).toISOString();

      // 1. WORKFORCE FETCH
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, gender, marital_status, occupation_status, ces_status, unit_id, joined_at, units(name)');

      const total = profiles?.length || 0;
      const joinedMonth = profiles?.filter(p => p.joined_at >= firstDayMonth).length || 0;
      const joinedYear = profiles?.filter(p => p.joined_at >= firstDayYear).length || 0;
      const cesComplete = profiles?.filter(p => p.ces_status === 'completed').length || 0;

      const male = profiles?.filter(p => p.gender === 'Male').length || 0;
      const female = total - male;
      const single = profiles?.filter(p => p.marital_status === 'Single').length || 0;

      const unitMap = new Map();
      profiles?.forEach((p: any) => {
        const unitData = getJoinData(p, 'units');
        const uName = unitData?.name || 'Unknown';
        unitMap.set(uName, (unitMap.get(uName) || 0) + 1);
      });

      // 2. ATTENDANCE FETCH (Corrected Table Structure)
      // We fetch individual attendance records and group them by event
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select(`
          status,
          events!inner (
            id,
            event_date,
            event_type
          )
        `)
        .eq('status', 'present') // Only count present
        .gte('events.event_date', threeMonthsAgo);

      // Process Attendance Data
      let sundayCount = 0;
      let midweekCount = 0;
      let familyCount = 0;
      const historyMap = new Map<string, { date: string, type: string, count: number }>();

      attendanceData?.forEach((record: any) => {
        const evt = getJoinData(record, 'events');
        if (!evt) return;

        const dateKey = evt.event_date.split('T')[0]; // Group by Day

        // Update Totals
        if (evt.event_type === 'Sunday Service' || evt.event_type === 'sunday_service') sundayCount++;
        if (evt.event_type === 'Midweek Service' || evt.event_type === 'midweek_service') midweekCount++;
        if (evt.event_type === 'Family Meeting' || evt.event_type === 'family_meeting') familyCount++;

        // Update History
        if (!historyMap.has(dateKey)) {
          historyMap.set(dateKey, {
            date: format(new Date(evt.event_date), 'MMM d'),
            type: evt.event_type,
            count: 0
          });
        }
        const entry = historyMap.get(dateKey);
        if (entry) entry.count += 1;
      });

      // 3. FINANCE FETCH
      const { data: expenses } = await supabase
        .from('financial_requests')
        .select('amount, status, unit_id, units(name)')
        .gte('created_at', firstDayMonth);

      const pendingReqs = expenses?.filter(e => e.status === 'pending').length || 0;

      const spendMap = new Map();
      expenses?.filter(e => e.status === 'approved' || e.status === 'paid').forEach((e: any) => {
        const unitData = getJoinData(e, 'units');
        const uName = unitData?.name || 'General';
        spendMap.set(uName, (spendMap.get(uName) || 0) + e.amount);
      });

      // 4. SOULS FETCH
      const { data: souls } = await supabase
        .from('soul_reports')
        .select('id, won_by, date_won, profiles:won_by(full_name, unit_id, units(name))')
        .gte('date_won', firstDayYear);

      const soulsMonth = souls?.filter(s => s.date_won >= firstDayMonth).length || 0;
      const winnerMap = new Map();
      const unitSoulMap = new Map();

      souls?.forEach((s: any) => {
        const profileData = getJoinData(s, 'profiles');
        const name = profileData?.full_name || 'Unknown';
        winnerMap.set(name, (winnerMap.get(name) || 0) + 1);

        const unitData = getJoinData(profileData, 'units');
        const uName = unitData?.name || 'Unknown';
        unitSoulMap.set(uName, (unitSoulMap.get(uName) || 0) + 1);
      });

      // 5. PERFORMANCE
      const { data: reviews } = await supabase
        .from('performance_reviews')
        .select('rating_commitment, rating_spiritual, member_id, profiles:member_id(full_name, units(name))')
        .limit(20); // Fetch recent and filter in JS for now to calculate avg

      const lowPerformers = reviews?.map((r: any) => {
        // Calculate rough average if total rating isn't stored
        const avg = (r.rating_commitment + r.rating_spiritual) / 2;
        if (avg > 2.0) return null;

        const p = getJoinData(r, 'profiles');
        const u = getJoinData(p, 'units');
        return {
          name: p?.full_name || 'Unknown',
          unit: u?.name || 'Unknown',
          rating: avg
        };
      }).filter(Boolean).slice(0, 5) || [];

      setStats({
        workforce: {
          total, joinedMonth, joinedYear,
          cesRatio: total ? Math.round((cesComplete / total) * 100) : 0,
          gender: { male, female, ratio: `${male}:${female}` },
          marital: { single, married: total - single, ratio: `${single}:${total - single}` },
          status: {
            student: profiles?.filter(p => p.occupation_status === 'Student').length || 0,
            nysc: profiles?.filter(p => p.occupation_status === 'NYSC').length || 0,
            employed: profiles?.filter(p => p.occupation_status === 'Employed').length || 0,
            unemployed: profiles?.filter(p => p.occupation_status === 'Unemployed').length || 0,
          },
          byUnit: Array.from(unitMap).map(([name, count]) => ({ name, count: count as number })),
        },
        attendance: {
          midweek: midweekCount,
          sunday: sundayCount,
          family: familyCount,
          avgMonthly: 0,
          history: Array.from(historyMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        },
        finance: {
          spendingByUnit: Array.from(spendMap).map(([name, value]) => ({ name, value: value as number })),
          pendingCount: pendingReqs,
        },
        souls: {
          month: soulsMonth,
          year: souls?.length || 0,
          topWinners: Array.from(winnerMap).map(([name, count]) => ({ name, count: count as number })).sort((a,b) => b.count - a.count).slice(0, 3),
          topUnits: Array.from(unitSoulMap).map(([name, count]) => ({ name, count: count as number })).sort((a,b) => b.count - a.count).slice(0, 3),
        },
        performance: {
          lowPerformers: lowPerformers as any[]
        }
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchStats };
};