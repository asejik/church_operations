import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl bg-white/80 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};