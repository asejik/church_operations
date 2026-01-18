import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({ label, value, onChange }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-xs font-bold text-slate-500">{value > 0 ? `${value}/5` : '-'}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileTap={{ scale: 0.8 }}
            type="button"
            onClick={() => onChange(star)}
            className={cn(
              "p-1 transition-colors",
              star <= value ? "text-yellow-400" : "text-slate-200 hover:text-yellow-200"
            )}
          >
            <Star className="h-6 w-6 fill-current" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};