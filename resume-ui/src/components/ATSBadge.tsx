import { ShieldCheck } from 'lucide-react';

export const ATSBadge = () => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-success/10 border border-success/20 text-success text-xs font-semibold select-none flex-shrink-0">
      <ShieldCheck size={16} />
      <span>Designed to pass ATS scanners</span>
    </div>
  );
};
