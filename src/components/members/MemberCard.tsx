import React from 'react';
import { motion } from 'framer-motion';
import { type LocalMember } from '@/lib/db';
import { Phone, User, Briefcase } from 'lucide-react';

interface MemberCardProps {
  member: LocalMember;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="group relative overflow-hidden rounded-2xl bg-white/40 p-5 backdrop-blur-md border border-white/50 shadow-sm transition-all hover:shadow-md hover:bg-white/60"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{member.full_name}</h3>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {member.category || 'Member'}
            </span>
          </div>
        </div>

        <div className={`h-2.5 w-2.5 rounded-full ${member.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
      </div>

      <div className="mt-4 space-y-2">
        {member.phone && (
          <div className="flex items-center text-sm text-slate-500">
            <Phone className="mr-2 h-4 w-4" />
            {member.phone}
          </div>
        )}
        {member.occupation && (
          <div className="flex items-center text-sm text-slate-500">
            <Briefcase className="mr-2 h-4 w-4" />
            {member.occupation}
          </div>
        )}
      </div>
    </motion.div>
  );
};