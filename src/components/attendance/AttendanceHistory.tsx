import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Calendar, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const AttendanceHistory = () => {
  const { data: profile } = useProfile();

  const { data: events, isLoading } = useQuery({
    queryKey: ['attendance_history'],
    queryFn: async () => {
      if (!profile?.unit_id) return [];

      // Fetch events for this unit, ordered by newest first
      // We also want to count how many people were marked 'present'
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          event_type,
          attendance (count)
        `)
        .eq('unit_id', profile.unit_id)
        .eq('attendance.status', 'present') // Only count present
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Past Sessions</h3>

      {events?.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No past attendance records found.
        </div>
      ) : (
        <div className="grid gap-3">
          {events?.map((event: any, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{event.title}</h4>
                  <p className="text-sm text-slate-500">
                    {new Date(event.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700">
                <Users className="h-4 w-4" />
                {/* The count comes back as an array of objects from Supabase, so we access the first one or length */}
                <span>{event.attendance?.[0]?.count || 0} Present</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};