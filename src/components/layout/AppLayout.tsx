// src/components/layout/AppLayout.tsx
import React from 'react';
import { Background } from './Background';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen font-sans text-slate-900 selection:bg-blue-100">
      <Background />

      {/* Main Content Container - Glassmorphic feel will happen inside components */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};