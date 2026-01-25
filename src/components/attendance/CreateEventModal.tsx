import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (eventId: string, title: string) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onEventCreated }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Sunday Service',
    type: 'sunday_service',
    date: new Date().toISOString().split('T')[0] // Today YYYY-MM-DD
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.unit_id) return;

    setLoading(true);
    try {
      // Create the event in Supabase
      const { data, error } = await supabase
        .from('events')
        .insert({
          unit_id: profile.unit_id,
          title: formData.title,
          event_type: formData.type,
          date: formData.date
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Event created!");
      onEventCreated(data.id, data.title);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Attendance Session">
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Event Type</label>
          <select
            className="flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={formData.type}
            onChange={(e) => {
              const type = e.target.value;
              // Auto-update title based on type
              let title = "Sunday Service";
              if (type === 'midweek_service') title = "Midweek Service";
              if (type === 'unit_meeting') title = "Unit Meeting";
              if (type === 'family_meeting') title = "Family Meeting";
              if (type === 'other') title = "Special Event";

              setFormData({ ...formData, type, title });
            }}
          >
            <option value="sunday_service">Sunday Service</option>
            <option value="midweek_service">Midweek Service</option>
            <option value="unit_meeting">Unit Meeting</option>
            <option value="family_meeting">Family Meeting</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              type="date"
              className="pl-10"
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Custom Title</label>
          <Input
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full" isLoading={loading}>
            Start Taking Attendance
          </Button>
        </div>
      </form>
    </Modal>
  );
};