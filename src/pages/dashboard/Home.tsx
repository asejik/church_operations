import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardStats } from '@/hooks/useDashboardStats'; // <--- NEW HOOK
import { AdminHome } from './AdminHome';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Users, User, Calendar, Settings, Layers, PieChart, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// --- SUB-COMPONENT: UNIT PROFILE MODAL ---
const UnitProfileModal = ({ isOpen, onClose, initialData, onSave }: { isOpen: boolean; onClose: () => void; initialData?: any; onSave: () => void }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    pastor_name: initialData?.pastor_name || '',
    description: initialData?.description || ''
  });

  const handleSubmit = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      const updates = {
        pastor_name: formData.pastor_name,
        description: formData.description,
      };

      // Direct Cloud Update
      const { error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', profile.unit_id);

      if (error) throw error;

      toast.success("Unit details updated!");
      onSave(); // Trigger reload
      onClose();
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Unit Details">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            Unit Name <Lock className="h-3 w-3" />
          </label>
          <input disabled className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" value={formData.name} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Pastor in Charge</label>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" value={formData.pastor_name} onChange={e => setFormData({ ...formData, pastor_name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
          <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN HOME COMPONENT ---
export const DashboardHome = () => {
  const { data: profile } = useProfile();

  // USE THE NEW ONLINE HOOK (Replaces Dexie)
  const { stats, birthdays, unitProfile: unit, loading } = useDashboardStats();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubunitModalOpen, setIsSubunitModalOpen] = useState(false);

  if (!profile) return null;

  // 1. ADMIN VIEW
  if (profile.role === 'admin_pastor' || profile.role === 'smr') {
    return <AdminHome />;
  }

  // 2. LOADING STATE
  if (loading || !unit) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center mt-10">
        <Loader2 className="h-10 w-10 text-slate-300 mb-2 animate-spin" />
        <p className="text-sm text-slate-500">Loading Unit Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200 border border-blue-500/30">Unit Operating System</span>
            </div>
            <h1 className="text-3xl font-bold">{unit.name}</h1>
            <p className="mt-1 text-slate-300 text-sm max-w-lg">{unit.description || "Welcome to your unit command center."}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" />
                <span>Unit Head: <strong className="text-slate-200">{profile.full_name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-purple-400" />
                <span>Pastor: <strong className="text-slate-200">{unit.pastor_name || "Not assigned"}</strong></span>
              </div>
            </div>
          </div>
          {/* HIDE SETTINGS IF PASTOR */}
          {profile.role !== 'unit_pastor' && (
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setIsProfileModalOpen(true)}>
              <Settings className="mr-2 h-3.5 w-3.5" /> Manage Profile
            </Button>
          )}
        </div>
        <Layers className="absolute -right-6 -bottom-6 h-40 w-40 text-white opacity-5 rotate-12" />
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Stats */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Membership */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2 text-slate-500"><Users className="h-4 w-4" /><h3 className="text-xs font-bold uppercase">Membership</h3></div>
                 <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400"><span>Male ({stats.male})</span><span>Female ({stats.female})</span></div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-pink-100"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${stats.ratio}%` }}></div></div>
              </div>
            </div>
            {/* Subunits */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                 <div className="flex items-center gap-2 text-slate-500 mb-2"><PieChart className="h-4 w-4" /><h3 className="text-xs font-bold uppercase">Subunits</h3></div>
                 <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-slate-900">{stats.subunitsCount}</span><span className="text-xs text-slate-400">active teams</span></div>
              </div>
              {/* Hide Manage Button for Pastor */}
              {profile.role !== 'unit_pastor' && (
                <Button size="sm" variant="ghost" className="self-start mt-2 -ml-2 text-blue-600 hover:bg-blue-50" onClick={() => setIsSubunitModalOpen(true)}>Manage Subunits</Button>
              )}
            </div>
          </div>
        </div>

        {/* Birthdays */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:row-span-2 h-full">
           <div className="flex items-center gap-2 text-slate-500 mb-4 border-b border-slate-100 pb-2"><Calendar className="h-4 w-4 text-pink-500" /><h3 className="text-xs font-bold uppercase">Birthdays (This Month)</h3></div>
           <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
             {birthdays.length === 0 ? <div className="text-center py-8"><p className="text-sm text-slate-400 italic">No birthdays this month.</p></div> : birthdays.map(m => {
                 const day = new Date(m.dob!).getDate();
                 const isToday = day === new Date().getDate();
                 return (
                   <div key={m.id} className={`flex items-center gap-3 p-2 rounded-lg ${isToday ? 'bg-pink-50 border border-pink-100' : ''}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs ${isToday ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{day}</div>
                      <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${isToday ? 'text-pink-900' : 'text-slate-700'}`}>{m.full_name}</p>{isToday && <span className="text-[10px] font-bold text-pink-600 uppercase">Today! 🎂</span>}</div>
                   </div>
                 );
             })}
           </div>
        </div>
      </div>

      <UnitProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} initialData={unit} onSave={() => window.location.reload()} />
    </div>
  );
};