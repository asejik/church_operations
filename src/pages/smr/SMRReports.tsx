import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Printer,
  TrendingUp,
  Loader2,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export const SMRReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [data, setData] = useState({
    attendance: [] as any[],
    requests: [] as any[],
    souls: [] as any[],
    summary: {
      attendanceGrowth: 0,
      totalSpent: 0,
      soulsTotal: 0
    }
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startOfMonth = `${reportDate}-01`;
      const endOfMonth = `${reportDate}-31`;

      // 1. Fetch Attendance
      const { data: attData } = await supabase
        .from('attendance')
        .select('total, service_date, units(name)')
        .gte('service_date', startOfMonth)
        .lte('service_date', endOfMonth)
        .order('service_date');

      // 2. Fetch Financial Requests (Approved/Paid Only)
      const { data: reqData } = await supabase
        .from('financial_requests')
        .select('amount, purpose, units(name)')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth)
        .in('status', ['approved', 'paid']);

      // 3. Fetch Souls
      const { data: soulData } = await supabase
        .from('soul_reports')
        .select('count, report_date')
        .gte('report_date', startOfMonth)
        .lte('report_date', endOfMonth);

      // --- CALCULATIONS ---
      const totalSpent = reqData?.reduce((acc, c) => acc + c.amount, 0) || 0;
      const totalSouls = soulData?.reduce((acc, c) => acc + c.count, 0) || 0;

      const avgAttendance = attData && attData.length > 0
        ? Math.round(attData.reduce((acc, c) => acc + c.total, 0) / attData.length)
        : 0;

      setData({
        attendance: attData || [],
        requests: reqData || [],
        souls: soulData || [],
        summary: {
          attendanceGrowth: avgAttendance,
          totalSpent: totalSpent,
          soulsTotal: totalSouls
        }
      });

    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportDate]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 print:p-0 print:pb-0 print:max-w-none">

      {/* HEADER (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Statistical Reports</h1>
          <p className="text-slate-500">Generate printable monthly summaries</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>

      {/* --- REPORT PAPER --- */}
      <div className="bg-white p-8 sm:p-12 shadow-sm border border-slate-200 print:border-none print:shadow-none min-h-[800px]">

        {/* Report Letterhead */}
        <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">SMR</h1>
            <p className="text-slate-500 font-medium">Statistical Management Report</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">Citizens of Light Church</p>
            <p className="text-slate-500 text-sm">Ilorin Operations</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              {new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-slate-300" /></div>
        ) : (
          <div className="space-y-12">

            {/* 1. EXECUTIVE SUMMARY GRID */}
            <div className="grid grid-cols-3 gap-6">
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center print:border-slate-300">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(data.summary.totalSpent)}
                  </p>
               </div>
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center print:border-slate-300">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Attendance</p>
                  <p className="text-2xl font-bold text-slate-900">{data.summary.attendanceGrowth}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center print:border-slate-300">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Souls Won</p>
                  <p className="text-2xl font-bold text-pink-600">{data.summary.soulsTotal}</p>
               </div>
            </div>

            {/* 2. ATTENDANCE ANALYSIS */}
            <div>
               <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <TrendingUp className="h-5 w-5 text-blue-600" /> Attendance Trends
               </h3>
               {data.attendance.length === 0 ? (
                 <p className="text-slate-400 italic">No attendance data recorded for this month.</p>
               ) : (
                 <div className="h-40 flex items-end gap-2 mt-6 pb-2 border-b border-slate-200">
                    {data.attendance.slice(0, 15).map((record, i) => {
                       const height = Math.min((record.total / 100) * 100, 100);
                       return (
                         <div key={i} className="flex-1 flex flex-col justify-end group relative">
                           <div
                             className="w-full bg-blue-500 rounded-t-sm print:bg-slate-800"
                             style={{ height: `${height}%` }}
                           ></div>
                           <div className="text-[10px] text-center text-slate-400 mt-1 truncate">
                             {new Date(record.service_date).getDate()}
                           </div>
                         </div>
                       )
                    })}
                 </div>
               )}
            </div>

            {/* 3. FINANCIAL OVERVIEW (Approved Requests) */}
            <div>
               <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <Wallet className="h-5 w-5 text-green-600" /> Approved Funding
               </h3>
               <div className="space-y-2">
                 {data.requests.length === 0 ? (
                    <p className="text-slate-400 italic">No approved financial requests this month.</p>
                 ) : (
                    data.requests.slice(0, 5).map((req, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                         <div>
                            <p className="font-bold text-slate-800">{req.purpose}</p>
                            <p className="text-xs text-slate-500">{req.units?.name}</p>
                         </div>
                         <p className="font-mono font-bold text-slate-900">{formatCurrency(req.amount)}</p>
                      </div>
                    ))
                 )}
                 {data.requests.length > 5 && (
                    <p className="text-xs text-slate-400 text-center italic mt-2">...and {data.requests.length - 5} more items</p>
                 )}
               </div>
            </div>

            {/* 4. SOULS ACQUISITION */}
            <div>
               <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                 <TrendingUp className="h-5 w-5 text-pink-600" /> Kingdom Expansion
               </h3>
               <div className="bg-pink-50 rounded-xl p-6 border border-pink-100 flex items-center justify-between print:border-slate-200 print:bg-slate-50">
                  <div>
                    <p className="text-sm text-pink-800 print:text-slate-600">Total Souls Won</p>
                    <p className="text-3xl font-black text-pink-600 print:text-slate-900">{data.summary.soulsTotal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-pink-800 print:text-slate-600">Status</p>
                    <p className="text-lg font-bold text-pink-700 print:text-slate-800">
                      {data.summary.soulsTotal > 0 ? "Growing" : "Static"}
                    </p>
                  </div>
               </div>
            </div>

            {/* FOOTER */}
            <div className="pt-12 mt-12 border-t border-slate-200 text-center text-slate-400 text-xs">
               <p>Generated automatically by SMR Portal • {new Date().toLocaleDateString()}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};