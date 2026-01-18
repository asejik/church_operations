import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/Button';
import { Lock, User } from 'lucide-react';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(false);

  // State
  const [fullName, setFullName] = useState('');
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!profile || !fullName.trim()) return;
    setLoading(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Sync with Units table if Pastor
      if (profile.role === 'unit_pastor' && profile.unit_id) {
        await supabase.from('units').update({ pastor_name: fullName }).eq('id', profile.unit_id);
        await db.units.update(profile.unit_id, { pastor_name: fullName, synced: 1 });
      }

      toast.success("Profile updated successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.newPassword) return;
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your profile and security</p>
      </div>

      {/* 1. PERSONAL DETAILS (ONLY FOR PASTORS) */}
      {profile?.role === 'unit_pastor' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <User className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Personal Details</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
              <input
                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
              <p className="text-[10px] text-blue-500 mt-1">
                * This name will appear on the Unit Dashboard as the Pastor in Charge.
              </p>
            </div>
            <div className="pt-2">
              <Button onClick={handleUpdateProfile} isLoading={loading}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECURITY (FOR EVERYONE) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Lock className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">New Password</label>
              <input type="password" className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="........" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</label>
              <input type="password" className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="........" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
            </div>
          </div>
          <div className="pt-2">
            <Button onClick={handleUpdatePassword} isLoading={loading}>Update Password</Button>
          </div>
        </div>
      </div>
    </div>
  );
};