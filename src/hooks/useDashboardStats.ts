import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { type Member } from '@/lib/db'; // Keep using this type for compatibility

export const useDashboardStats = () => {
  const { data: profile } = useProfile();

  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    ratio: 50,
    subunitsCount: 0
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

          setStats(prev => ({ ...prev, total, male, female, ratio }));

          // Calculate Birthdays (This Month)
          const currentMonth = new Date().getMonth();
          const bdays = members
            .filter(m => {
              if (!m.dob) return false;
              return new Date(m.dob).getMonth() === currentMonth;
            })
            .sort((a, b) => new Date(a.dob!).getDate() - new Date(b.dob!).getDate());

          setBirthdays(bdays);
        }

        // 3. Fetch Subunits Count
        const { count: subCount } = await supabase
          .from('subunits')
          .select('*', { count: 'exact', head: true })
          .eq('unit_id', unitId);

        setStats(prev => ({ ...prev, subunitsCount: subCount || 0 }));

      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [profile?.unit_id]);

  return { stats, birthdays, unitProfile, loading, refresh: () => {} }; // Add refresh if needed later
};