import { logger } from '@/lib/logger';
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
    absenceReasons: { reason: string; count: number }[];
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

      // 1. FETCH UNITS MAP (Look up table)
      const { data: unitsData } = await supabase.from('units').select('id, name');
      const unitLookup = new Map<string, string>();
      unitsData?.forEach(u => unitLookup.set(u.id, u.name));

      // 2. WORKFORCE FETCH
      const { data: members, error: memberError } = await supabase
        .from('members')
        .select('id, unit_id, gender, marital_status, joined_at, ces_status, employment_status, nysc_status');


      if (memberError) logger.error("Workforce Error:", memberError);

      const total = members?.length || 0;
      const joinedMonth = members?.filter(m => m.joined_at && m.joined_at >= firstDayMonth).length || 0;
      const joinedYear = members?.filter(m => m.joined_at && m.joined_at >= firstDayYear).length || 0;
      const cesComplete = members?.filter(m => m.ces_status === 'completed').length || 0;

      const male = members?.filter(m => m.gender === 'Male').length || 0;
      const female = total - male;
      const single = members?.filter(m => m.marital_status === 'Single').length || 0;

      const unitCountMap = new Map();
      members?.forEach((m: any) => {
        const uName = unitLookup.get(m.unit_id) || 'Unknown';
        unitCountMap.set(uName, (unitCountMap.get(uName) || 0) + 1);
      });

      // Status counters
      let student = 0, nysc = 0, employed = 0, unemployed = 0;
      members?.forEach(m => {
          const statusStr = Array.isArray(m.employment_status)
            ? m.employment_status.join(' ')
            : (m.employment_status || '');

          if (statusStr.includes('Student')) student++;
          if (statusStr.includes('Employed') && !statusStr.includes('Self')) employed++;
          if (statusStr.includes('Self-employed')) employed++;
          if (statusStr.includes('Unemployed')) unemployed++;

          if (m.nysc_status === 'Ongoing' || statusStr.includes('NYSC')) nysc++;
      });

      // 3. ATTENDANCE FETCH
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, events!inner(event_type)')
        .gte('event_date', threeMonthsAgo);

      let sundayCount = 0;
      let midweekCount = 0;
      let familyCount = 0;
      const historyMap = new Map<string, { date: string, type: string, count: number }>();
      const absenceMap = new Map<string, number>();

      attendanceData?.forEach((record: any) => {
        // Handle Absence Reasons
        if (record.status === 'absent' && record.reason) {
           const raw = record.reason.trim();
           const reason = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
           if (reason) absenceMap.set(reason, (absenceMap.get(reason) || 0) + 1);
        }

        // Handle Present Counts
        if (record.status === 'present') {
            const type = record.events?.event_type || 'Unknown';
            const dateKey = record.event_date.split('T')[0];

            if (type.toLowerCase().includes('sunday')) sundayCount++;
            if (type.toLowerCase().includes('midweek')) midweekCount++;
            if (type.toLowerCase().includes('family')) familyCount++;

            if (!historyMap.has(dateKey)) {
              historyMap.set(dateKey, {
                date: format(new Date(record.event_date), 'MMM d'),
                type: type,
                count: 0
              });
            }
            const entry = historyMap.get(dateKey);
            if (entry) entry.count += 1;
        }
      });

      const topAbsenceReasons = Array.from(absenceMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 4. FINANCE FETCH
      const { data: expenses } = await supabase
        .from('financial_requests')
        .select('*')
        .gte('created_at', firstDayMonth);

      // CRITICAL FIX: Ignore archived requests from the pending count
      const { count: pendingCount } = await supabase
        .from('financial_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('is_archived', false);

      const spendMap = new Map();
      expenses?.filter(e => e.status === 'approved' || e.status === 'paid').forEach((e: any) => {
        const uName = unitLookup.get(e.unit_id) || 'General';
        spendMap.set(uName, (spendMap.get(uName) || 0) + e.amount);
      });

      // 5. SOULS FETCH
      const { data: souls } = await supabase
        .from('soul_reports')
        .select('*')
        .gte('report_date', firstDayYear);

      const soulsMonth = souls?.filter(s => s.report_date >= firstDayMonth).length || 0;
      const winnerMap = new Map();
      const unitSoulMap = new Map();

      souls?.forEach((s: any) => {
        const name = s.soul_winner_name || 'Member';
        winnerMap.set(name, (winnerMap.get(name) || 0) + 1);

        const uName = unitLookup.get(s.unit_id) || 'Unknown';
        unitSoulMap.set(uName, (unitSoulMap.get(uName) || 0) + 1);
      });

      // 6. PERFORMANCE
      const { data: reviews } = await supabase
        .from('performance_reviews')
        .select('*')
        .limit(20);

      const memberIds = reviews?.map(r => r.member_id) || [];
      const { data: reviewMembers } = await supabase
        .from('members')
        .select('id, full_name')
        .in('id', memberIds);

      const reviewMemberMap = new Map();
      reviewMembers?.forEach(m => reviewMemberMap.set(m.id, m.full_name));

      const lowPerformers = reviews?.map((r: any) => {
        const c = r.rating_commitment || 0;
        const s = r.rating_spiritual || 0;
        const avg = (c + s) / 2;

        if (avg > 2.5 || avg === 0) return null;

        return {
          name: reviewMemberMap.get(r.member_id) || 'Unknown',
          unit: unitLookup.get(r.unit_id) || 'Unknown',
          rating: avg
        };
      }).filter(Boolean).slice(0, 5) || [];

      // SET STATE
      setStats({
        workforce: {
          total, joinedMonth, joinedYear,
          cesRatio: total ? Math.round((cesComplete / total) * 100) : 0,
          gender: { male, female, ratio: `${male}:${female}` },
          marital: { single, married: total - single, ratio: `${single}:${total - single}` },
          status: { student, nysc, employed, unemployed },
          byUnit: Array.from(unitCountMap).map(([name, count]) => ({ name, count: count as number })),
        },
        attendance: {
          midweek: midweekCount,
          sunday: sundayCount,
          family: familyCount,
          avgMonthly: 0,
          history: Array.from(historyMap.values()).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          absenceReasons: topAbsenceReasons
        },
        finance: {
          spendingByUnit: Array.from(spendMap).map(([name, value]) => ({ name, value: value as number })),
          pendingCount: pendingCount || 0,
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
      logger.error("Dashboard Stats Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refresh: fetchStats };
};