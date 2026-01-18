// src/hooks/useSync.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { db, type LocalMember } from '@/lib/db';
import { useProfile } from './useProfile';

export function useSync() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  // 1. PULL: Fetch Members from Supabase and store in Dexie
  const syncMembers = useMutation({
    mutationFn: async () => {
      if (!profile?.unit_id) throw new Error("No Unit ID found");

      // Fetch from Cloud
      const { data, error } = await supabase
        .from('members') // We will create this table in Supabase next
        .select('*')
        .eq('unit_id', profile.unit_id);

      if (error) throw error;

      // Update Local DB (Bulk Put is faster)
      if (data) {
        await db.members.bulkPut(data as LocalMember[]);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localMembers'] });
    }
  });

  return {
    syncMembers,
    isSyncing: syncMembers.isPending
  };
}