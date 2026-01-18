import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { AddMemberModal } from '@/components/members/AddMemberModal';
import { BatchUploadModal } from '@/components/members/BatchUploadModal';
import { MemberDetailsModal } from '@/components/members/MemberDetailsModal';
import { RequestsTab } from '@/components/members/RequestsTab'; // <--- Import New Component
import { Plus, Search, FileSpreadsheet, RefreshCw, ArrowUpDown, ChevronRight, Crown, Shield, Users, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { type Member } from '@/lib/db';

export const MembersPage = () => {
  const { data: profile } = useProfile();

  // TABS STATE
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');

  // MEMBERS DATA STATE
  const [members, setMembers] = useState<Member[]>([]);
  const [subunits, setSubunits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'full_name', direction: 'asc' });

  // 1. FETCH MEMBERS (Only runs when on 'members' tab or first load)
  const fetchData = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('unit_id', profile.unit_id)
        .order('full_name');

      if (memberError) throw memberError;
      setMembers(memberData || []);

      const { data: subunitData } = await supabase
        .from('subunits')
        .select('*')
        .eq('unit_id', profile.unit_id);
      setSubunits(subunitData || []);

    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') fetchData();
  }, [profile?.unit_id, activeTab]);

  // 2. FILTERING & SORTING
  const processedMembers = useMemo(() => {
    let result = [...members];
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.full_name.toLowerCase().includes(lowerQuery) ||
        m.phone_number?.includes(searchQuery) ||
        m.email?.toLowerCase().includes(lowerQuery)
      );
    }
    if (sortConfig) {
      result.sort((a: any, b: any) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [members, searchQuery, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSubunitName = (id?: number) => subunits.find(s => s.id === id)?.name || "—";
  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "—";

  return (
    <div className="space-y-6 pb-20">
      {/* PAGE HEADER & TAB SWITCHER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Unit Management</h1>

        {/* TABS */}
        <div className="flex p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              activeTab === 'members' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-4 w-4" /> Members
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              activeTab === 'requests' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Inbox className="h-4 w-4" /> Requests
          </button>
        </div>
      </div>

      {/* --- TAB CONTENT: MEMBERS --- */}
      {activeTab === 'members' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
           {/* ACTIONS BAR */}
           <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  className="h-9 w-full rounded-lg bg-white border border-slate-200 pl-9 pr-4 text-sm outline-none focus:border-blue-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 self-end sm:self-auto">
                 <button onClick={fetchData} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mr-2">
                   <RefreshCw className="h-3 w-3" /> Refresh
                 </button>
                 {profile?.role !== 'unit_pastor' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsBatchModalOpen(true)}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Import CSV
                    </Button>
                    <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Add New
                    </Button>
                  </>
                )}
              </div>
           </div>

           {/* TABLE */}
           <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
             {/* ... Same Table Code as Before ... */}
             <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-4 py-4 w-12">S/N</th>
                  <th className="px-4 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-4">Email</th>
                  <th className="px-4 py-4">Phone</th>
                  <th className="px-4 py-4">Gender</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Subunit</th>
                  <th className="px-4 py-4">Birthday</th>
                  <th className="px-4 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedMembers.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">No members found.</td></tr>
                ) : (
                  processedMembers.map((member, index) => (
                    <tr key={member.id} onClick={() => setSelectedMember(member)} className="group hover:bg-blue-50/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{(index + 1).toString().padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-blue-700">
                        <div className="flex items-center gap-2">
                          {member.full_name}
                          {member.role_in_unit === 'unit_head' && <div title="Unit Head" className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-100"><Crown className="h-3 w-3 text-amber-600 fill-amber-600" /></div>}
                          {member.role_in_unit === 'subunit_head' && <div title="Subunit Head" className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100"><Shield className="h-3 w-3 text-blue-600 fill-blue-600" /></div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{member.email || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{member.phone_number || "—"}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${member.gender?.toLowerCase() === 'male' ? 'bg-blue-50 text-blue-700 border-blue-100' : member.gender?.toLowerCase() === 'female' ? 'bg-pink-50 text-pink-700 border-pink-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{member.gender || '—'}</span></td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{member.marital_status || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{getSubunitName(member.subunit_id)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(member.dob)}</td>
                      <td className="px-4 py-3 text-right"><ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-blue-400" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
           </div>
           </div>
        </div>
      )}

      {/* --- TAB CONTENT: REQUESTS --- */}
      {activeTab === 'requests' && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-300">
          <RequestsTab />
        </div>
      )}

      {/* MODALS */}
      <AddMemberModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchData} />
      <BatchUploadModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} onUploadComplete={() => { setIsBatchModalOpen(false); fetchData(); }} />
      <MemberDetailsModal isOpen={!!selectedMember} member={selectedMember} onClose={() => setSelectedMember(null)} onUpdate={() => { setSelectedMember(null); fetchData(); }} />
    </div>
  );
};