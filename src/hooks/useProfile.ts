import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  full_name: string;
  role: 'smr' | 'admin_pastor' | 'unit_pastor' | 'unit_head' | 'evangelist';
  unit_id: string | null;
  // Added these fields:
  avatar_url?: string;
  phone?: string;
  email?: string;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      // 1. Get the current Auth User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // 2. Fetch their Profile details
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      return data as Profile;
    },
    staleTime: 1000 * 60 * 5, // Cache profile data for 5 minutes
  });
}