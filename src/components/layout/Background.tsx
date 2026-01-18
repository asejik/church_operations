// src/components/layout/Background.tsx
import React from 'react';
import { motion } from 'framer-motion';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
      {/* Soft Gradient Orb 1 */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vh] rounded-full bg-blue-200/40 blur-[100px]"
      />

      {/* Soft Gradient Orb 1 - Slightly darker blue and higher opacity */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5], // Increased from 0.3-0.5
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vh] rounded-full bg-blue-300/30 blur-[120px]"
      />

      {/* Soft Gradient Orb 2 - More indigo pop */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.7, 0.4], // Increased from 0.2-0.4
          x: [0, -50, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-[40%] -right-[10%] h-[60vh] w-[60vh] rounded-full bg-indigo-300/30 blur-[120px]"
      />

      {/* Grid Overlay (Texture) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Noise Texture (Optional for 'film' look) */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
    </div>
  );
};