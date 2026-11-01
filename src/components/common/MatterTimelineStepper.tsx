// src/components/common/MatterTimelineStepper.tsx
import React from 'react';
import { Check, Circle } from 'lucide-react';
import { PROSECUTION_STAGES } from '../../lib/api';

interface StepperProps {
  department: string;
  stageIndex: number;
}

export const MatterTimelineStepper: React.FC<StepperProps> = ({ department, stageIndex }) => {
  const stages = PROSECUTION_STAGES[department] || PROSECUTION_STAGES['IP_PATENT'];

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* Background track line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
        {/* Filled track line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-500 z-0"
          style={{
            width: `${Math.min(100, (stageIndex / (stages.length - 1)) * 100)}%`,
          }}
        />

        {stages.map((stage, idx) => {
          const isCompleted = idx < stageIndex;
          const isCurrent = idx === stageIndex;

          return (
            <div key={stage} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 scale-110'
                    : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Tooltip / Label */}
              <div className="mt-2 text-center max-w-[80px] sm:max-w-[110px]">
                <div
                  className={`text-[10px] leading-tight font-medium ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {stage}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default MatterTimelineStepper;

