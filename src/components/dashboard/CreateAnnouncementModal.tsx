import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { Megaphone, AlertCircle } from 'lucide-react';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAnnouncementModal = ({ isOpen, onClose, onSuccess }: CreateAnnouncementModalProps) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        created_by: profile?.id
      });

      if (error) throw error;

      toast.success("Announcement broadcasted successfully");
      onSuccess();
      onClose();
      setFormData({ title: '', content: '', priority: 'normal' });
    } catch (err: any) {
      toast.error("Failed to post: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Broadcast Announcement">
      <div className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3 text-sm text-blue-700">
          <Megaphone className="h-5 w-5 shrink-0 mt-0.5" />
          <p>This message will be visible to all Unit Heads and Pastors immediately.</p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
          <input
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="e.g. Upcoming Leadership Retreat"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Priority</label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="priority"
                checked={formData.priority === 'normal'}
                onChange={() => setFormData({...formData, priority: 'normal'})}
                className="text-blue-600"
              />
              Normal
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer font-bold text-red-600">
              <input
                type="radio"
                name="priority"
                checked={formData.priority === 'urgent'}
                onChange={() => setFormData({...formData, priority: 'urgent'})}
                className="text-red-600"
              />
              <AlertCircle className="h-3 w-3" /> Urgent
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Message Content</label>
          <textarea
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 min-h-[120px]"
            placeholder="Type your message here..."
            value={formData.content}
            onChange={e => setFormData({ ...formData, content: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Broadcast</Button>
        </div>
      </div>
    </Modal>
  );
};