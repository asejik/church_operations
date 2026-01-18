import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.unit_id) {
      toast.error("You must belong to a unit to upload members.");
      return;
    }

    setLoading(true);
    setLogs(['Reading file...']);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // 1. TRIM HEADERS: Removes accidental spaces (e.g. "Name " becomes "Name")
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let failCount = 0;

        // 2. DEBUG LOGS: Show exactly what headers were found
        const foundHeaders = results.meta.fields || [];
        setLogs(prev => [
          ...prev,
          `headers found: [${foundHeaders.join(', ')}]`,
          `Processing ${rows.length} rows...`
        ]);

        for (const [index, row] of rows.entries()) {
          // 3. ROBUST NAME CHECK: Try multiple common variations
          const rawName = row['Name'] || row['Full Name'] || row['FULL NAME'] || row['name'];

          if (!rawName) {
            // Log why it failed
            console.warn(`Row ${index + 1} skipped. Data:`, row);
            failCount++;
            continue;
          }

          const memberData = {
            unit_id: profile.unit_id,
            category: 'member',

            // Core Info
            full_name: rawName,
            email: row['Email'],
            phone_number: row['Phone Number'] || row['Phone'],
            whatsapp_number: row['WhatsApp Number'],
            telegram_number: row['Telegram Number'],
            gender: row['Gender'],
            dob: row['Date of Birth'] ? new Date(row['Date of Birth']) : null,
            nationality: row['Nationality'],
            state_of_origin: row['State of Origin'],

            // Spiritual (Convert "Yes" to true)
            is_born_again: row['Are you born again?']?.toString().toLowerCase().startsWith('y'),
            is_spirit_filled: row['Are you baptized in the Holy Ghost with the initial evidence of speaking in tongues?']?.toString().toLowerCase().startsWith('y'),
            attended_membership_class: row['Have you attended Membership Class before?']?.toString().toLowerCase().startsWith('y'),
            completed_ces: row['Have you completed Citizens Elementary School (CES)?']?.toString().toLowerCase().startsWith('y'),
            ces_completion_date: row['When did you complete CES?'] ? new Date(row['When did you complete CES?']) : null,
            previous_church: row['What church/ministry were you a part of before joining CLC?'],
            joined_clc: row['When did you join CLC?'] ? new Date(row['When did you join CLC?']) : null,
            joined_workforce: row['When did you join the workforce?'] ? new Date(row['When did you join the workforce?']) : null,

            // Marital
            marital_status: row['Marital Status'],
            spouse_name: row['Name and address of spouse/fiancé'],
            wedding_anniversary: row['Wedding Anniversary'] ? new Date(row['Wedding Anniversary']) : null,

            // Work & School
            occupation: row['Occupation'],
            workplace_address: row['Workplace Address'],
            workplace_location: row['Work Place Location'],
            institution: row['Institution of Learning (for students)'],
            course_of_study: row['Course of Study'],
            level_of_study: row['Level of Study'],
            degree_type: row['Type of Degree (Undergraduate, Masters, PhD, Diploma, HND, A-Level, etc'],

            // Address
            residential_address: row['Residential Address in Ilorin'],
            permanent_address: row['Permanent Home Address'],
            permanent_state: row['State of Permanent Home Address'],
            country_outside_nigeria: row['If Others/Outside Nigeria above, please indicate Country/State/County'],

            // Family
            parent_name: row['Name of Parent/Guardian'],
            parent_address: row['Address of Parent/Guardian'],
            parent_phone: row['Phone Number of Parent/Guardian'],
            relatives_in_clc: row['Name of relative(s) in CLC (if any)'],

            // Misc
            hobbies: row['Hobbies (separate with a comma if more than one e.g. Reading, Sleeping, etc.)'],
            social_media: row['Social Media Addresses (separate with a comma, e.g. Facebook: @clcchurch, Twitter: @clcchurch, etc.)'],
            medical_conditions: row['Do you have any medical conditions or allergies which the leadership of the church should be aware of?'],
            medical_details: row['If Yes above, please give details']
          };

          const { error } = await supabase.from('members').insert(memberData);

          if (error) {
            console.error("Row failed:", rawName, error);
            // Log the specific database error to the UI
            setLogs(prev => [...prev, `❌ Error adding ${rawName}: ${error.message}`]);
            failCount++;
          } else {
            successCount++;
          }
        }

        setLoading(false);
        if (successCount > 0) {
           toast.success(`Import Finished: ${successCount} added.`);
           onUploadComplete();
        } else {
           toast.warning("No members were added. Check the logs below.");
        }

        setLogs(prev => [...prev, `✅ FINISHED: ${successCount} Added, ${failCount} Skipped/Failed.`]);
      },
      error: (err) => {
        setLoading(false);
        console.error("CSV Parse Error:", err);
        toast.error("Failed to read file.");
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Batch Import Members">
      <div className="space-y-6">
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Upload your <strong>CSV file</strong>. <br/>
              Ensure the first row contains headers like <strong>Name</strong>, <strong>Email</strong>, etc.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10">
          {loading ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 font-medium text-slate-600">Processing records...</p>
            </div>
          ) : (
            <label className="cursor-pointer text-center group">
              <Upload className="mx-auto h-10 w-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <p className="mt-2 text-sm font-medium text-slate-700">Tap to upload CSV</p>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
        </div>

        {logs.length > 0 && (
          <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-4 text-xs font-mono text-green-400 space-y-1">
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}
      </div>
    </Modal>
  );
};