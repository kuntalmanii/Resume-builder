import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const InputField = ({
  label,
  icon: Icon,
  error,
  className = '',
  ...props
}: InputFieldProps) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <label className="text-xs font-bold uppercase tracking-wider text-th-text2">
        {label}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-th-text3 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`w-full h-[58px] rounded-2xl border bg-th-input text-th-text px-4 transition-all duration-200 input-focus ${
            Icon ? 'pl-11' : ''
          } ${
            error ? 'border-danger/80 focus:border-danger/80' : 'border-th-inputb focus:border-th-primary'
          }`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-danger font-medium mt-0.5">{error}</span>}
    </div>
  );
};
