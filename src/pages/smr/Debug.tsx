import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { startOfYear } from 'date-fns';

export const Debug = () => {
  const { data: profile } = useProfile();
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const cleanData = data ? JSON.stringify(data, null, 2) : '';
    setLogs(prev => [...prev, `[${timestamp}] ${msg} ${cleanData}`]);
  };

  useEffect(() => {
    runDiagnostics();
  }, [profile]);

  const runDiagnostics = async () => {
    log("--- STARTING SMR DIAGNOSTICS (ROUND 2) ---");

    if (!profile) return;
    log(`👤 User: ${profile.full_name} | Role: ${profile.role}`);

    try {
      // TEST 1: MEMBERS TABLE ACCESS (The likely culprit)
      const { data: members, error: memberError } = await supabase
        .from('members')
        .select('id, full_name, unit_id')
        .limit(5);

      if (memberError) {
        log(`❌ MEMBERS ACCESS FAILED: ${memberError.message}`);
      } else {
        log(`✅ MEMBERS ACCESS SUCCESS: Found ${members.length} rows.`);
        log(`   Sample: ${members[0]?.full_name || 'None'}`);
      }

      // TEST 2: DATE FILTERING (Jan + Feb)
      const startOf2026 = startOfYear(new Date()).toISOString(); // 2026-01-01
      log(`📅 Checking Souls since: ${startOf2026}`);

      const { data: souls, error: soulsError } = await supabase
        .from('soul_reports')
        .select('id, report_date')
        .gte('report_date', startOf2026);

      if (soulsError) {
        log(`❌ SOULS QUERY FAILED: ${soulsError.message}`);
      } else {
        log(`✅ SOULS FOUND (YTD): ${souls.length}`);
        const dates = souls.map(s => s.report_date.split('T')[0]);
        log(`   Dates found: ${dates.join(', ')}`);
      }

    } catch (err: any) {
      log(`🔥 CRITICAL FAILURE: ${err.message}`);
    }
    log("--- END DIAGNOSTICS ---");
  };

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-green-400 font-mono text-sm whitespace-pre-wrap">
      <h1 className="text-xl font-bold text-white mb-4">SMR Diagnostics Tool</h1>
      <div className="border border-green-800 p-4 rounded bg-black/50">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};