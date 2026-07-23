import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ResumeStepperProps {
  currentStep: number;
}

const steps = [
  { step: 1, label: 'Fill Details' },
  { step: 2, label: 'Generate Resume' },
  { step: 3, label: 'Preview & Export' },
];

export const ResumeStepper = ({ currentStep }: ResumeStepperProps) => {
  return (
    <div className="w-full flex items-center justify-between mb-12 relative px-4">
      {/* Background/Connecting lines */}
      <div className="absolute top-[21px] left-10 right-10 h-0.5 bg-th-border -z-10" />
      
      {/* Animated progress fill */}
      <div 
        className="absolute top-[21px] left-10 right-10 h-0.5 bg-th-primary origin-left transition-transform duration-500 -z-10"
        style={{
          transform: `scaleX(${(currentStep - 1) / (steps.length - 1)})`
        }}
      />

      {steps.map((s) => {
        const isCompleted = currentStep > s.step;
        const isActive = currentStep === s.step;

        return (
          <div key={s.step} className="flex flex-col items-center relative z-10 flex-1">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.15 : 1,
                backgroundColor: isCompleted || isActive ? 'var(--primary)' : 'var(--card)',
                borderColor: isCompleted || isActive ? 'var(--primary)' : 'var(--border)',
              }}
              transition={{ duration: 0.3 }}
              className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all`}
              style={{
                color: isCompleted || isActive ? '#FFFFFF' : 'var(--text-secondary)',
                boxShadow: isActive ? 'var(--glow)' : 'none',
              }}
            >
              {isCompleted ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <span>{s.step}</span>
              )}
            </motion.div>

            <span
              className={`text-xs mt-3 font-semibold transition-all duration-300 ${
                isActive ? 'text-th-primary font-bold' : isCompleted ? 'text-th-text' : 'text-th-text3'
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
