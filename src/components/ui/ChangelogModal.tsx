import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Sparkles, CheckCircle2, History } from 'lucide-react';

// Change this version string whenever you want the popup to appear again for everyone
const CURRENT_VERSION = "v1.2.0";

// Maintain the history of updates here. The component will only render the top 5.
const CHANGELOG_DATA = [
  {
    version: "v1.2.0",
    date: "March 24, 2026",
    features: [
      {
        title: "Acknowledge Financial Requests",
        description: "SMRs can now 'Acknowledge Receipt' of requests to notify unit heads before making a final approval or rejection."
      },
      {
        title: "Archive Financial Records",
        description: "Admins and SMRs can now soft-delete (archive) completed financial requests to keep the dashboard clean."
      },
      {
        title: "Global Workforce Context",
        description: "When viewing 'All Units' in the Global Workforce, a new column now displays the unit each member belongs to."
      },
      {
        title: "Table Scrolling Fixes",
        description: "Horizontal scrolling has been fixed for the SMR Finance table, preventing data from being cut off on smaller screens."
      }
    ]
  },
  {
    version: "v1.1.0",
    date: "March 20, 2026",
    features: [
      {
        title: "Assistant Unit Head Role",
        description: "You can now assign the 'Assistant Unit Head' role when adding or editing members."
      },
      {
        title: "Urgent Financial Requests",
        description: "You can now mark financial requests as 'URGENT' to notify Admin and SMRs immediately."
      },
      {
        title: "Mobile Layout Fixes",
        description: "The Performance page now scrolls perfectly on all mobile devices."
      }
    ]
  }
];

export const ChangelogModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen this specific version
    const seenVersion = localStorage.getItem('clc_changelog_version');
    if (seenVersion !== CURRENT_VERSION) {
      // Add a slight delay so it doesn't jarringly appear the exact millisecond they log in
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('clc_changelog_version', CURRENT_VERSION);
    setIsOpen(false);
  };

  // Enforce the 5-item limit
  const displayLogs = CHANGELOG_DATA.slice(0, 5);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="What's New in CLC Ops">
      <div className="space-y-6">

        {/* Header Banner */}
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-blue-700 border border-blue-100">
          <Sparkles className="h-6 w-6 shrink-0 text-blue-500" />
          <p className="text-sm font-medium">
            We have been working hard to improve your experience. Here is what is new!
          </p>
        </div>

        {/* Scrollable History List */}
        <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar space-y-8">
          {displayLogs.map((log, index) => (
            <div key={log.version} className={`space-y-4 ${index > 0 ? 'pt-6 border-t border-slate-100' : ''}`}>

              {/* Version Date Header */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                  <History className="h-3 w-3" /> {log.version}
                </div>
                <span className="text-xs text-slate-400 font-medium">{log.date}</span>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {log.features.map((feat, i) => (
                  <FeatureItem key={i} title={feat.title}>
                    {feat.description}
                  </FeatureItem>
                ))}
              </div>

            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 mt-2">
          <Button onClick={handleClose} className="w-full">
            Got it, thanks!
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Simple helper component for the list items
const FeatureItem = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="flex gap-3">
    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
    <div>
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-600 mt-1">{children}</p>
    </div>
  </div>
);