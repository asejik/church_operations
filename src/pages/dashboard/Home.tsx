import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { AdminHome } from './AdminHome';
import { ReportModal } from '@/components/dashboard/ReportModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Users, User, Calendar, Settings, Plus, PieChart, Lock, Loader2, Download, Trash2,
  Sun, CloudSun, Home as HomeIcon, Briefcase, Layers
} from 'lucide-react';
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

      const { error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', profile.unit_id);

      if (error) throw error;

      toast.success("Unit details updated!");
      onSave();
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

// --- SUB-COMPONENT: SUBUNITS MODAL ---
const SubunitsModal = ({ isOpen, onClose, onUpdate }: { isOpen: boolean; onClose: () => void; onUpdate: () => void }) => {
  const { data: profile } = useProfile();
  const [newSubunit, setNewSubunit] = useState('');
  const [loading, setLoading] = useState(false);
  const [subunits, setSubunits] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && profile?.unit_id) {
      fetchSubunits();
    }
  }, [isOpen, profile?.unit_id]);

  const fetchSubunits = async () => {
    if (!profile?.unit_id) return;
    const { data } = await supabase.from('subunits').select('*').eq('unit_id', profile.unit_id);
    setSubunits(data || []);
  };

  const handleAdd = async () => {
    if (!profile?.unit_id || !newSubunit.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('subunits')
        .insert({ unit_id: profile.unit_id, name: newSubunit });

      if (error) throw error;

      setNewSubunit('');
      toast.success("Subunit created");
      fetchSubunits();
      onUpdate();
    } catch (err) {
      toast.error("Failed to add subunit");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subunit? Members will be unassigned.")) return;
    try {
      const { error } = await supabase.from('subunits').delete().eq('id', id);
      if (error) throw error;
      toast.success("Subunit removed");
      fetchSubunits();
      onUpdate();
    } catch (err) { toast.error("Failed to delete"); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Subunits">
      <div className="space-y-4">
        <div className="flex gap-2">
          <input className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="e.g. Camera Team" value={newSubunit} onChange={e => setNewSubunit(e.target.value)} />
          <Button onClick={handleAdd} isLoading={loading} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
          {subunits.length === 0 ? <p className="text-center text-xs text-slate-400 italic py-4">No subunits yet.</p> : subunits.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-sm font-medium text-slate-700">{s.name}</span>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// --- COMPACT STAT CARD ---
const CompactStat = ({ label, value, icon: Icon, color, onClick }: any) => (
  <div onClick={onClick} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center active:scale-95 transition-transform h-full md:p-5 hover:border-slate-200 cursor-pointer">
    <div className={`p-1.5 md:p-2 rounded-full mb-1 md:mb-1.5 ${color.bg}`}>
      <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color.text}`} />
    </div>
    <span className="text-lg md:text-2xl font-bold text-slate-900 leading-none">{value}</span>
    <span className="text-[10px] md:text-xs text-slate-500 font-medium uppercase mt-0.5 md:mt-1">{label}</span>
  </div>
);

// --- ATTENDANCE PILL ---
const AttendPill = ({ label, value, icon: Icon, color }: any) => (
  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2 md:p-3 border border-slate-100">
    <Icon className={`h-3 w-3 md:h-4 md:w-4 mb-1 ${color}`} />
    <span className="text-sm md:text-lg font-bold text-slate-900">{value > 0 ? value : '-'}</span>
    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase leading-none">{label}</span>
  </div>
);

// --- MAIN DASHBOARD HOME ---
export const DashboardHome = () => {
  const { data: profile } = useProfile();
  const { stats, birthdays, unitProfile: unit, loading, refresh } = useDashboardStats();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSubunitModalOpen, setIsSubunitModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  if (!profile) return null;

  // Route Admins/SMRs to their respective homes
  if (profile.role === 'admin_pastor' || profile.role === 'smr') {
    return <AdminHome />;
  }

  if (loading || !unit) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center mt-4 md:mt-10">
        <Loader2 className="h-10 w-10 text-slate-300 mb-2 animate-spin" />
        <p className="text-sm text-slate-500">Loading Unit Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">

      {/* 1. COMPACT HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between md:justify-start gap-3">
               <div>
                 <span className="inline-block rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200 border border-blue-500/30 mb-1">
                   Unit Operating System
                 </span>
                 <h1 className="text-2xl md:text-3xl font-bold leading-tight">{unit.name}</h1>
               </div>

               {/* Mobile Quick Action */}
               {profile.role !== 'unit_pastor' && (
                  <button onClick={() => setIsProfileModalOpen(true)} className="md:hidden p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                    <Settings className="h-5 w-5" />
                  </button>
               )}
            </div>

            <p className="mt-1 text-slate-300 text-xs md:text-sm line-clamp-1 md:line-clamp-none">
              {unit.description || "Welcome to your unit command center."}
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-400" />
                <span>Unit Head: <strong className="text-slate-200">{profile.full_name}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {profile.role === 'unit_pastor' ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/10 text-white hover:bg-white/20 w-full md:w-auto"
                onClick={() => setIsReportModalOpen(true)}
              >
                <Download className="mr-2 h-3.5 w-3.5" /> Reports
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex bg-white/10 border-white/10 text-white hover:bg-white/20"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <Settings className="mr-2 h-3.5 w-3.5" /> Manage Profile
              </Button>
            )}
          </div>
        </div>
        <Layers className="absolute -right-6 -bottom-6 h-32 w-32 md:h-40 md:w-40 text-white opacity-5 rotate-12" />
      </div>

      {/* 2. DENSE STATS GRID */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">

        {/* MEMBERSHIP (Spans 2 cols on both mobile and desktop) */}
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm flex flex-col justify-between min-h-[90px]">
           <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-500">
                 <Users className="h-4 w-4" />
                 <h3 className="text-xs font-bold uppercase">Membership</h3>
              </div>
              <span className="text-2xl md:text-3xl font-bold text-slate-900">{stats.total}</span>
           </div>

           {/* Ratio Bar */}
           <div className="space-y-1.5">
             <div className="h-2 md:h-3 w-full overflow-hidden rounded-full bg-pink-100 flex">
                <div className="h-full bg-blue-500" style={{ width: `${stats.ratio}%` }}></div>
                <div className="h-full bg-pink-400 flex-1"></div>
             </div>
             <div className="flex justify-between text-[10px] md:text-xs font-bold uppercase text-slate-400">
                <span>{stats.male} Men</span>
                <span>{stats.female} Women</span>
             </div>
           </div>
        </div>

        {/* SUBUNITS (1 Col) */}
        <CompactStat
          label="Subunits"
          value={stats.subunitsCount}
          icon={PieChart}
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          onClick={profile.role !== 'unit_pastor' ? () => setIsSubunitModalOpen(true) : undefined}
        />

        {/* BIRTHDAYS COUNT (1 Col) */}
        <CompactStat
          label="Birthdays"
          value={birthdays.length}
          icon={Calendar}
          color={{ bg: 'bg-pink-50', text: 'text-pink-600' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

        {/* 3. ATTENDANCE HEALTH */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500 mb-3 md:mb-4">
            <Calendar className="h-4 w-4 text-slate-400" /> Avg. Attendance (90 Days)
          </h3>

          <div className="grid grid-cols-4 gap-2 md:gap-4">
            <AttendPill
              label="Sun"
              value={stats.attendance?.sunday}
              icon={Sun}
              color="text-amber-500"
            />
            <AttendPill
              label="Mid"
              value={stats.attendance?.midweek}
              icon={CloudSun}
              color="text-blue-500"
            />
            <AttendPill
              label="Fam"
              value={stats.attendance?.family}
              icon={HomeIcon}
              color="text-green-500"
            />
            <AttendPill
              label="Unit"
              value={stats.attendance?.unit}
              icon={Briefcase}
              color="text-purple-500"
            />
          </div>
        </div>

        {/* 4. BIRTHDAY LIST */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm h-full flex flex-col">
           <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-500">
                 <Calendar className="h-4 w-4 text-pink-500" />
                 <h3 className="text-xs font-bold uppercase">Upcoming</h3>
              </div>
              <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold">
                {birthdays.length}
              </span>
           </div>

           <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[250px] md:max-h-[300px]">
             {birthdays.length === 0 ? (
               <div className="text-center py-8"><p className="text-xs text-slate-400 italic">No birthdays this month.</p></div>
             ) : (
               birthdays.slice(0, 5).map(m => {
                 const day = new Date(m.dob!).getDate();
                 const isToday = day === new Date().getDate();
                 return (
                   <div key={m.id} className={`flex items-center gap-3 p-2 rounded-lg ${isToday ? 'bg-pink-50 border border-pink-100' : 'hover:bg-slate-50'}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs shrink-0 ${isToday ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>
                        {day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isToday ? 'text-pink-900' : 'text-slate-700'}`}>
                          {m.full_name}
                        </p>
                        {isToday && <span className="text-[9px] font-bold text-pink-600 uppercase">Today! 🎂</span>}
                      </div>
                   </div>
                 );
               })
             )}
             {birthdays.length > 5 && (
               <div className="text-center pt-2 pb-1 border-t border-slate-50 mt-2">
                 <span className="text-xs font-medium text-slate-400">+{birthdays.length - 5} more this month</span>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Modals */}
      <UnitProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} initialData={unit} onSave={refresh} />
      <SubunitsModal isOpen={isSubunitModalOpen} onClose={() => setIsSubunitModalOpen(false)} onUpdate={refresh} />
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
};