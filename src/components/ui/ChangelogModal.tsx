import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Sparkles, CheckCircle2 } from 'lucide-react';

// Change this version string whenever you want the popup to appear again for everyone
const CURRENT_VERSION = "v1.1.0";

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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="What's New in CLC Ops">
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4 text-blue-700 border border-blue-100">
          <Sparkles className="h-6 w-6 shrink-0 text-blue-500" />
          <p className="text-sm font-medium">
            We have been working hard to improve your experience. Here is what is new in this update!
          </p>
        </div>

        <div className="space-y-4">
          {/* Add your new features here */}
          <FeatureItem title="Assistant Unit Head Role">
            You can now assign the "Assistant Unit Head" role when adding or editing members.
          </FeatureItem>

          <FeatureItem title="Urgent Financial Requests">
            You can now mark financial requests as "URGENT" to notify approvers immediately.
          </FeatureItem>

          <FeatureItem title="Mobile Layout Fixes">
            The Performance page now scrolls perfectly on all mobile devices.
          </FeatureItem>
        </div>

        <div className="pt-4 border-t border-slate-100">
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