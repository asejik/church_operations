import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Printer, Calendar, Loader2, FileText, TrendingUp, Users, Wallet, Package, Heart, FileBarChart, X, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal = ({ isOpen, onClose }: ReportModalProps) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState<any>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const generateReport = async () => {
    if (!profile?.unit_id) return;
    setLoading(true);
    setReportData(null);

    try {
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = `${selectedMonth}-31`;

      const [
        attendanceRes,
        newMembersRes,
        departuresRes,
        financeRes,
        inventoryRes,
        performanceRes,
        soulsRes,
        unitRes
      ] = await Promise.all([
        supabase.from('attendance').select('service_type, total, service_date').eq('unit_id', profile.unit_id).gte('service_date', startOfMonth).lte('service_date', endOfMonth),
        supabase.from('members').select('full_name, phone_number, joined_workforce').eq('unit_id', profile.unit_id).gte('joined_workforce', startOfMonth).lte('joined_workforce', endOfMonth),
        supabase.from('member_requests').select('member_name, request_type, reason, updated_at').eq('unit_id', profile.unit_id).eq('status', 'approved').gte('updated_at', startOfMonth).lte('updated_at', `${endOfMonth}T23:59:59`),
        supabase.from('financial_requests').select('amount, purpose, status, created_at').eq('unit_id', profile.unit_id).gte('created_at', startOfMonth).lte('created_at', `${endOfMonth}T23:59:59`),
        supabase.from('inventory').select('item_name, quantity, condition, date_purchased').eq('unit_id', profile.unit_id).gte('date_purchased', startOfMonth).lte('date_purchased', endOfMonth),
        supabase.from('performance_reviews').select('member_id, rating_punctuality, rating_commitment, rating_skill, rating_teamwork, rating_spiritual').eq('unit_id', profile.unit_id).gte('review_date', startOfMonth).lte('review_date', endOfMonth),
        supabase.from('soul_reports').select('convert_name, soul_winner_name').eq('unit_id', profile.unit_id).gte('report_date', startOfMonth).lte('report_date', endOfMonth),
        supabase.from('units').select('name, pastor_name').eq('id', profile.unit_id).single()
      ]);

      // --- CALCULATIONS ---
      const totalAttendance = attendanceRes.data?.reduce((sum, r) => sum + r.total, 0) || 0;
      const serviceCount = attendanceRes.data?.length || 0;
      const avgAttendance = serviceCount > 0 ? Math.round(totalAttendance / serviceCount) : 0;

      const totalRequested = financeRes.data?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const approvedRequests = financeRes.data?.filter(r => r.status === 'approved' || r.status === 'paid') || [];
      const totalApproved = approvedRequests.reduce((sum, r) => sum + r.amount, 0);

      const reviewCount = performanceRes.data?.length || 0;
      let avgPerformance = 0;
      if (reviewCount > 0) {
        const totalScore = performanceRes.data?.reduce((acc, r) => {
          return acc + (r.rating_punctuality + r.rating_commitment + r.rating_skill + r.rating_teamwork + r.rating_spiritual) / 5;
        }, 0) || 0;
        avgPerformance = parseFloat((totalScore / reviewCount).toFixed(1));
      }

      // Calculate Top Soul Winner
      const soulCounts: Record<string, number> = {};
      soulsRes.data?.forEach((s: any) => {
        const winner = s.soul_winner_name || "Unknown";
        soulCounts[winner] = (soulCounts[winner] || 0) + 1;
      });
      const topWinner = Object.entries(soulCounts).sort((a, b) => b[1] - a[1])[0];

      // Format Pastor Name (Avoid "Pastor Pastor")
      let rawPastorName = unitRes.data?.pastor_name || profile.full_name;
      if (!rawPastorName.toLowerCase().startsWith('pastor')) {
        rawPastorName = `Pastor ${rawPastorName}`;
      }

      setReportData({
        unitName: unitRes.data?.name || 'Unit',
        pastorName: rawPastorName,
        period: new Date(startOfMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        generatedAt: new Date().toLocaleDateString(),
        attendance: { average: avgAttendance, history: attendanceRes.data || [] },
        members: { new: newMembersRes.data || [], departed: departuresRes.data || [] },
        finance: { totalRequested, totalApproved, requests: financeRes.data || [] },
        inventory: { items: inventoryRes.data || [] },
        performance: { count: reviewCount, average: avgPerformance },
        souls: {
          count: soulsRes.data?.length || 0,
          topWinner: topWinner ? { name: topWinner[0], count: topWinner[1] } : null
        }
      });

    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-200/90 backdrop-blur-sm overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-slate-200 shadow-md print:hidden z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="mr-2 h-5 w-5" /> Close Preview
          </Button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h2 className="font-bold text-slate-700">Monthly Report Generation</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="month"
              className="bg-transparent text-sm font-medium outline-none text-slate-700"
              value={selectedMonth}
              onChange={(e) => {
                setReportData(null);
                setSelectedMonth(e.target.value);
              }}
            />
          </div>
          <Button onClick={generateReport} isLoading={loading} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <FileText className="mr-2 h-4 w-4" /> Generate
          </Button>
          {reportData && (
            <Button variant="outline" onClick={handlePrint} className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Printer className="mr-2 h-4 w-4" /> Print / PDF
            </Button>
          )}
        </div>
      </div>

      {/* PREVIEW AREA */}
      <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0 print:overflow-visible flex justify-center">

        {loading && (
          <div className="self-center flex flex-col items-center justify-center text-slate-500 bg-white p-8 rounded-xl shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
            <p className="text-lg font-medium">Compiling Unit Statistics...</p>
          </div>
        )}

        {!reportData && !loading && (
          <div className="self-center flex flex-col items-center justify-center text-slate-400 opacity-60">
            <FileText className="h-24 w-24 mb-4" />
            <p className="text-xl font-medium">Select a month to begin</p>
          </div>
        )}

        {/* DOCUMENT SHEET (A4 Dimensions Enforced with Flex Layout) */}
        {reportData && !loading && (
          <div className="bg-white shadow-2xl w-[210mm] min-h-[297mm] p-[15mm] flex flex-col print:w-full print:h-auto print:shadow-none print:p-0 print:m-0 animate-in fade-in zoom-in-[0.98] duration-300 origin-top">

            {/* HEADER */}
            <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3">{reportData.unitName}</h1>
                <div className="flex items-center gap-3 text-slate-500 font-bold uppercase tracking-widest text-xs">
                  <span className="bg-slate-100 px-2 py-1 rounded">Citizens of Light Church</span>
                  <span>•</span>
                  <span>Operations Report</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-600">{reportData.period}</p>
                <p className="text-sm text-slate-500 mt-1 font-medium">{reportData.pastorName}</p>
              </div>
            </div>

            {/* 1. EXECUTIVE METRICS */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center print:border-slate-300">
                <p className="text-xs uppercase font-bold text-slate-400 mb-1">Avg Attendance</p>
                <p className="text-3xl font-black text-slate-900">{reportData.attendance.average}</p>
              </div>
              <div className="p-4 bg-pink-50 border border-pink-100 rounded-xl text-center print:border-pink-200 print:bg-pink-50">
                <p className="text-xs uppercase font-bold text-pink-500 mb-1">Souls Won</p>
                <p className="text-3xl font-black text-pink-600">{reportData.souls.count}</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center print:border-blue-200 print:bg-blue-50">
                <p className="text-xs uppercase font-bold text-blue-500 mb-1">New Members</p>
                <p className="text-3xl font-black text-blue-600">{reportData.members.new.length}</p>
              </div>
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center print:border-green-200 print:bg-green-50">
                <p className="text-xs uppercase font-bold text-green-600 mb-1">Funds Approved</p>
                <p className="text-xl font-black text-green-700 tracking-tight break-all">{formatCurrency(reportData.finance.totalApproved)}</p>
              </div>
            </div>

            {/* MAIN CONTENT AREA (Flex-1 to push footer down) */}
            <div className="flex-1 space-y-8">

              {/* 2. ATTENDANCE & SOULS (FIGURES ONLY) */}
              <div className="grid grid-cols-2 gap-8">
                {/* Attendance Table */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" /> Attendance Log
                  </h3>
                  {reportData.attendance.history.length === 0 ? <p className="text-sm text-slate-400 italic">No attendance records found.</p> : (
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase text-xs">
                          <th className="pb-2 font-bold">Date</th>
                          <th className="pb-2 font-bold text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.attendance.history.map((r: any, i: number) => (
                          <tr key={i}>
                            <td className="py-2 font-medium text-slate-700">
                              {new Date(r.service_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                              <span className="text-slate-400 font-normal ml-2 text-xs">({r.service_type})</span>
                            </td>
                            <td className="py-2 text-right font-bold text-slate-900">{r.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Souls Summary (FIGURES ONLY) */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-600" /> Evangelism Impact
                  </h3>

                  <div className="bg-pink-50 p-5 rounded-xl border border-pink-100 print:border-slate-200 print:bg-white h-full">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-pink-900 font-medium">Total Souls Won</span>
                        <span className="text-3xl font-black text-pink-600">{reportData.souls.count}</span>
                     </div>

                     {reportData.souls.topWinner && (
                       <div className="pt-4 border-t border-pink-200/60">
                          <p className="text-xs font-bold text-pink-400 uppercase mb-1 flex items-center gap-1">
                            <Crown className="h-3 w-3" /> Leading Soul Winner
                          </p>
                          <div className="flex justify-between items-baseline">
                             <span className="text-lg font-bold text-slate-800">{reportData.souls.topWinner.name}</span>
                             <span className="text-sm font-medium text-slate-500">{reportData.souls.topWinner.count} souls</span>
                          </div>
                       </div>
                     )}

                     {!reportData.souls.topWinner && (
                        <p className="text-sm text-pink-400 italic text-center py-4">No activity recorded this month.</p>
                     )}
                  </div>
                </div>
              </div>

              {/* 3. WORKFORCE (Full Width) */}
              <div>
                <h3 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-600" /> Workforce Movements
                </h3>
                <div className="grid grid-cols-2 gap-8 bg-slate-50 p-5 rounded-xl border border-slate-100 print:bg-white print:border-slate-200">
                  <div>
                    <p className="text-xs font-bold uppercase text-blue-600 mb-2">New Additions ({reportData.members.new.length})</p>
                    {reportData.members.new.length === 0 ? <p className="text-sm text-slate-400 italic">None</p> : (
                      <ul className="text-sm space-y-1">
                        {reportData.members.new.map((m: any, i: number) => (
                          <li key={i} className="flex justify-between border-b border-slate-200/50 pb-1 last:border-0">
                            <span className="font-medium text-slate-700">{m.full_name}</span>
                            <span className="text-xs text-slate-400">{new Date(m.joined_workforce).getDate()}th</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-l border-slate-200 pl-8">
                    <p className="text-xs font-bold uppercase text-red-600 mb-2">Departures / Transfers ({reportData.members.departed.length})</p>
                    {reportData.members.departed.length === 0 ? <p className="text-sm text-slate-400 italic">None</p> : (
                      <ul className="text-sm space-y-1">
                        {reportData.members.departed.map((m: any, i: number) => (
                          <li key={i} className="flex justify-between border-b border-slate-200/50 pb-1 last:border-0">
                            <span className="font-medium text-slate-700">{m.member_name}</span>
                            <span className="text-xs text-slate-500 capitalize bg-slate-200 px-1.5 rounded">{m.request_type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. FINANCE & OPERATIONS */}
              <div className="grid grid-cols-2 gap-8">
                 {/* Financials */}
                 <div>
                    <h3 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-green-600" /> Financial Requests
                    </h3>
                    {reportData.finance.requests.length === 0 ? <p className="text-sm text-slate-400 italic">No financial activity.</p> : (
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="text-slate-400 text-xs uppercase">
                            <th className="pb-2 font-bold">Purpose</th>
                            <th className="pb-2 font-bold text-right">Amt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.finance.requests.map((r: any, i: number) => (
                            <tr key={i}>
                              <td className="py-2 font-medium text-slate-700">
                                {r.purpose}
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-slate-600">{formatCurrency(r.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                 </div>

                 {/* Inventory & Performance */}
                 <div>
                    <h3 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
                      <FileBarChart className="h-5 w-5 text-amber-500" /> Performance & Assets
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm p-4 bg-amber-50 rounded-xl border border-amber-100 print:bg-white print:border-slate-200">
                         <span className="text-amber-900 font-bold">Avg Performance Score</span>
                         <span className="text-2xl font-black text-amber-600">{reportData.performance.average}<span className="text-sm text-amber-400 font-medium">/5.0</span></span>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1"><Package className="h-3 w-3" /> Inventory Added</p>
                        {reportData.inventory.items.length === 0 ? <p className="text-sm text-slate-400 italic">No new items added.</p> : (
                          <ul className="text-sm space-y-1">
                            {reportData.inventory.items.map((item: any, i: number) => (
                              <li key={i} className="flex justify-between border-b border-slate-50 pb-1 last:border-0">
                                <span className="font-medium text-slate-700">{item.item_name} <span className="text-slate-400 font-normal">({item.quantity})</span></span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded">{item.condition}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                 </div>
              </div>

            </div>

            {/* FOOTER (Pushed to bottom via flex-col) */}
            <div className="mt-auto pt-8 border-t-2 border-slate-200 flex justify-between items-end pb-2">
               <div>
                  <p className="text-lg font-bold text-slate-900">Sign Off</p>
                  <div className="mt-8 border-t-2 border-slate-900 w-48"></div>
                  <p className="text-sm text-slate-500 mt-2 font-medium">{reportData.pastorName}</p>
               </div>
               <div className="text-right text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  <p>Citizens of Light Church • Unit Reporting System</p>
                  <p>Generated on {new Date().toLocaleDateString()}</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};