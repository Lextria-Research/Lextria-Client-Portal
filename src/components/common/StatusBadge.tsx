// src/components/common/StatusBadge.tsx
import React from 'react';
import { getDepartmentColor, getDepartmentLabel } from '../../lib/api';

export const DepartmentBadge: React.FC<{ department: string; size?: 'sm' | 'md' }> = ({
  department,
  size = 'sm',
}) => {
  const colors = getDepartmentColor(department);
  const label = getDepartmentLabel(department);

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-md border ${colors.bg} ${colors.text} ${colors.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {label}
    </span>
  );
};

export const MatterStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = (status || 'ACTIVE').toUpperCase();

  let color = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  if (norm.includes('GRANT') || norm.includes('REGISTER') || norm.includes('EXECUTED')) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  } else if (norm.includes('HEARING') || norm.includes('FER') || norm.includes('PENDING')) {
    color = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  } else if (norm.includes('ACTIVE') || norm.includes('FILED') || norm.includes('PROSECUTION')) {
    color = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  } else if (norm.includes('DISPUTE') || norm.includes('OPPOSITION')) {
    color = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75" />
      {norm.replace(/_/g, ' ')}
    </span>
  );
};
