import React, { useState, useEffect, useRef } from 'react';
import { type Member } from '@/lib/db';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Camera, Trash2, Save, User, Shield, BookOpen, Heart, Activity, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

interface MemberDetailsModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ member, isOpen, onClose, onUpdate }) => {
  const { data: profile } = useProfile();

  // UPDATED: SMR and Admins are Read-Only. Only Unit Heads can edit.
  const isReadOnly = profile?.role === 'unit_pastor' || profile?.role === 'smr' || profile?.role === 'admin_pastor';

  // Refs
  const actionSectionRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // UI State
  const [activeAction, setActiveAction] = useState<'transfer' | 'remove' | null>(null);

  // Form State
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [requestReason, setRequestReason] = useState('');

  // Data State
  const [subunits, setSubunits] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<{id: string, name: string}[]>([]);

  const [formData, setFormData] = useState<Partial<Member>>({});

  // 1. Initialize Data
  useEffect(() => {
    if (member) {
      setFormData({
        ...member,
        employment_status: member.employment_status || []
      });
      setActiveAction(null);
      setRequestReason('');
      setTransferTargetId('');
    }
    setLoading(false);
  }, [member, isOpen]);

  // 2. Fetch Subunits & Units (Online First)
  useEffect(() => {
    const loadDropdowns = async () => {
      // Allow SMR to see dropdown options (for display) but not edit them
      if (!isOpen) return;

      const { data: units } = await supabase.from('units').select('id, name').order('name');
      if (units) setAvailableUnits(units);

      // If viewing a member, fetch subunits for THAT member's unit (for SMR viewing across units)
      const targetUnitId = member?.unit_id || profile?.unit_id;
      if (targetUnitId) {
        const { data: subs } = await supabase.from('subunits').select('*').eq('unit_id', targetUnitId);
        if (subs) setSubunits(subs);
      }
    };
    loadDropdowns();
  }, [isOpen, profile?.unit_id, member?.unit_id]);

  // 3. Auto-scroll
  useEffect(() => {
    if (activeAction && actionSectionRef.current) {
      actionSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeAction]);


  // --- ACTIONS ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    if (!e.target.files || !e.target.files[0] || !member) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${member.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('member_photos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('member_photos').getPublicUrl(filePath);

      await supabase.from('members').update({ image_url: publicUrl }).eq('id', member.id);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Profile photo updated!");
      onUpdate();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!member?.id || !formData.full_name) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('members').update(formData).eq('id', member.id);
      if (error) throw error;
      toast.success("Member updated");
      onUpdate();
      onClose();
    } catch (err) {
      toast.error("Failed to update member");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRemoval = async () => {
    if (isReadOnly || !member?.id) return;
    if (!profile?.unit_id) return;
    if (!requestReason) { toast.error("Please provide a reason"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('member_requests').insert({
        unit_id: profile.unit_id,
        member_id: member.id,
        member_name: member.full_name,
        request_type: 'removal',
        reason: requestReason,
        status: 'pending'
      });
      if (error) throw error;
      toast.success("Removal request sent");
      onClose();
    } catch (err: any) {
      toast.error("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransfer = async () => {
    if (isReadOnly || !member?.id) return;
    if (!profile?.unit_id) { toast.error("Profile not linked"); return; }
    if (!transferTargetId) { toast.error("Select target unit"); return; }
    if (!requestReason) { toast.error("Provide reason"); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('member_requests').insert({
        unit_id: profile.unit_id,
        member_id: member.id,
        member_name: member.full_name,
        request_type: 'transfer',
        target_unit_id: transferTargetId,
        reason: requestReason,
        status: 'pending'
      });

      if (error) throw error;
      toast.success("Transfer request sent!");
      onClose();
    } catch (err: any) {
      toast.error("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? "View Member Profile" : "Edit Member Profile"}>
      <div className="max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">

        {/* HEADER */}
        <div className="flex flex-col items-center justify-center pb-6 border-b border-slate-100">
          <div className="relative group">
            {formData.image_url ? (
              <img src={formData.image_url} alt="Profile" className="h-28 w-28 rounded-full object-cover shadow-md ring-4 ring-white" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white text-slate-400">
                <User className="h-10 w-10" />
              </div>
            )}
            {!isReadOnly && (
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-700">
                <Camera className="h-4 w-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>
          <div className="mt-3 text-center">
            <h2 className="text-lg font-bold text-slate-900">{formData.full_name}</h2>
            <p className="text-xs text-slate-500 uppercase mb-4">{formData.role_in_unit?.replace('_', ' ') || 'Member'}</p>

            {!isReadOnly && !activeAction && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setActiveAction('transfer')}
                  className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase hover:bg-blue-100 transition-colors border border-blue-100"
                >
                   <ArrowRightLeft className="h-3 w-3" /> Request Transfer
                </button>
                <button
                  onClick={() => setActiveAction('remove')}
                  className="flex items-center gap-1.5 bg-red-50 text-red-500 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase hover:bg-red-100 transition-colors border border-red-100"
                >
                   <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- CUSTOM ACTION UI (Transfer OR Removal) --- */}
        {!isReadOnly && activeAction && (
          <div ref={actionSectionRef} className={`rounded-xl border p-4 animate-in fade-in slide-in-from-top-2 ${activeAction === 'transfer' ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
             <div className={`flex items-center gap-2 mb-3 font-bold text-sm uppercase ${activeAction === 'transfer' ? 'text-blue-800' : 'text-red-800'}`}>
               {activeAction === 'transfer' ? <ArrowRightLeft className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
               {activeAction === 'transfer' ? 'Request Transfer' : 'Request Removal'}
             </div>

             <div className="space-y-3">
               {activeAction === 'transfer' && (
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Transfer To Unit</label>
                   <select
                     className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                     value={transferTargetId}
                     onChange={e => setTransferTargetId(e.target.value)}
                   >
                     <option value="">-- Select Target Unit --</option>
                     {availableUnits
                       .filter(u => u.id !== member.unit_id)
                       .map(u => (
                         <option key={u.id} value={u.id}>{u.name}</option>
                     ))}
                   </select>
                 </div>
               )}

               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase">Reason</label>
                 <textarea
                    className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                    rows={2}
                    placeholder={activeAction === 'transfer' ? "Why are they transferring?" : "Why should they be removed?"}
                    value={requestReason}
                    onChange={e => setRequestReason(e.target.value)}
                 />
               </div>

               <div className="flex gap-2 justify-end pt-2">
                 <Button variant="ghost" size="sm" onClick={() => { setActiveAction(null); setRequestReason(''); }}>Cancel</Button>
                 <Button
                    size="sm"
                    onClick={activeAction === 'transfer' ? handleRequestTransfer : handleRequestRemoval}
                    isLoading={loading}
                    className={activeAction === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}
                 >
                   Submit Request
                 </Button>
               </div>
             </div>
          </div>
        )}

        {/* 1. PERSONAL INFO */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
              <input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
              <input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>

            <div><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.phone_number || ''} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.whatsapp_number || ''} onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Gender</label><select disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.gender || 'male'} onChange={e => setFormData({ ...formData, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Birthday</label><input disabled={isReadOnly} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.dob || ''} onChange={e => setFormData({ ...formData, dob: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">State of Origin</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.state_of_origin || ''} onChange={e => setFormData({ ...formData, state_of_origin: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Nationality</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.nationality || ''} onChange={e => setFormData({ ...formData, nationality: e.target.value })} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase">Marital Status</label><select disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.marital_status || 'single'} onChange={e => setFormData({ ...formData, marital_status: e.target.value })}><option value="single">Single</option><option value="married">Married</option><option value="engaged">Engaged</option></select></div>
          </div>

          {formData.marital_status === 'married' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-pink-50 p-4 rounded-lg">
               <div><label className="text-xs font-bold text-slate-500 uppercase">Spouse Name</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.spouse_name || ''} onChange={e => setFormData({ ...formData, spouse_name: e.target.value })} /></div>
               <div><label className="text-xs font-bold text-slate-500 uppercase">Wedding Anniversary</label><input disabled={isReadOnly} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.wedding_anniversary || ''} onChange={e => setFormData({ ...formData, wedding_anniversary: e.target.value })} /></div>
            </div>
          )}
          <div><label className="text-xs font-bold text-slate-500 uppercase">Residential Address</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.residential_address || ''} onChange={e => setFormData({ ...formData, residential_address: e.target.value })} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase">Permanent Address</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.permanent_address || ''} onChange={e => setFormData({ ...formData, permanent_address: e.target.value })} /></div>
        </div>

        {/* 2. UNIT & ROLE */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Shield className="h-3 w-3" /> Unit Roles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-slate-500 uppercase">Subunit</label><select disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" value={formData.subunit_id || ''} onChange={e => setFormData({ ...formData, subunit_id: e.target.value ? Number(e.target.value) : undefined })}><option value="">-- None --</option>{subunits?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
             <div><label className="text-xs font-bold text-slate-500 uppercase">Role</label><select disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" value={formData.role_in_unit || 'member'} onChange={e => setFormData({ ...formData, role_in_unit: e.target.value })}><option value="member">Member</option><option value="subunit_head">Subunit Head</option><option value="unit_head">Unit Head</option></select></div>
          </div>
        </div>

        {/* 3. SPIRITUAL LIFE */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1 flex items-center gap-2"><Heart className="h-3 w-3" /> Spiritual Life</h3>
          <div className="grid grid-cols-2 gap-4">
             {['is_born_again', 'is_spirit_filled', 'attended_membership_class', 'completed_ces'].map(field => (
                <div key={field} className="flex items-center gap-2 border p-3 rounded-lg bg-white"><input disabled={isReadOnly} type="checkbox" checked={(formData as any)[field] || false} onChange={e => setFormData({...formData, [field]: e.target.checked})} className="h-4 w-4" /><label className="text-sm font-medium capitalize">{field.replace(/_/g, ' ').replace('is ', '')}</label></div>
             ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div><label className="text-xs font-bold text-slate-500 uppercase">Joined CLC</label><input disabled={isReadOnly} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.joined_clc || ''} onChange={e => setFormData({ ...formData, joined_clc: e.target.value })} /></div>
             <div><label className="text-xs font-bold text-slate-500 uppercase">Joined Workforce</label><input disabled={isReadOnly} type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.joined_workforce || ''} onChange={e => setFormData({ ...formData, joined_workforce: e.target.value })} /></div>
             <div className="sm:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Previous Church</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={formData.previous_church || ''} onChange={e => setFormData({ ...formData, previous_church: e.target.value })} /></div>
          </div>
        </div>

        {/* 4. EDU & WORK */}
        <div className="space-y-4">
           <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1 flex items-center gap-2"><BookOpen className="h-3 w-3" /> Edu & Work</h3>

           {/* NEW: Employment Status & NYSC */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Employment Status</label>
                <div className="space-y-2">
                  {['Student', 'Employed', 'Self-employed', 'Unemployed'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        disabled={isReadOnly}
                        checked={(formData.employment_status || []).includes(opt)}
                        onChange={(e) => {
                          const current = formData.employment_status || [];
                          const newStatus = e.target.checked
                            ? [...current, opt]
                            : current.filter((i: string) => i !== opt);
                          setFormData({ ...formData, employment_status: newStatus });
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">NYSC Status</label>
                <select
                  disabled={isReadOnly}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 bg-white"
                  value={formData.nysc_status || ''}
                  onChange={e => setFormData({ ...formData, nysc_status: e.target.value })}
                >
                  <option value="">-- Select --</option>
                  {['Completed', 'Ongoing', 'Not Yet'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <div className="mt-3">
                   <label className="text-xs font-bold text-slate-500 uppercase">Occupation / Job Title</label>
                   <input disabled={isReadOnly} className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100" value={formData.occupation || ''} onChange={e => setFormData({ ...formData, occupation: e.target.value })} placeholder="e.g. Software Engineer" />
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {['institution', 'course_of_study', 'workplace_address', 'level_of_study'].map(field => (
               <div key={field}><label className="text-xs font-bold text-slate-500 uppercase">{field.replace(/_/g, ' ')}</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={(formData as any)[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })} /></div>
             ))}
           </div>
        </div>

        {/* 5. NEXT OF KIN */}
        <div className="space-y-4">
           <h3 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1 flex items-center gap-2"><Activity className="h-3 w-3" /> Next of Kin</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {['parent_name', 'parent_phone', 'parent_address', 'medical_conditions'].map(field => (
               <div key={field} className={field === 'parent_name' ? 'sm:col-span-2' : ''}><label className="text-xs font-bold text-slate-500 uppercase">{field.replace(/_/g, ' ')}</label><input disabled={isReadOnly} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50" value={(formData as any)[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })} /></div>
             ))}
           </div>
        </div>

        {/* --- FOOTER (Just Save/Cancel now) --- */}
        {!isReadOnly && !activeAction && (
          <div className="flex flex-col sm:flex-row justify-end items-center pt-6 border-t border-slate-100 gap-2 mt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} isLoading={loading}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        )}

        {isReadOnly && (
           <div className="flex justify-end pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={onClose}>Close</Button>
           </div>
        )}
      </div>
    </Modal>
  );
};