import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="space-y-2 w-full" dir="rtl">
      {label && (
        <label className="text-sm font-medium text-secondary mr-1 block text-right">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-black/20 border rounded-xl py-3 pr-4 pl-4 
            outline-none transition-all placeholder:text-muted
            ${icon ? 'pr-12' : ''}
            ${error 
              ? 'border-danger/50 focus:border-danger' 
              : 'border-white/10 focus:border-brand-primary'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-danger mt-1 mr-1 text-right">{error}</p>
      )}
    </div>
  );
};

export default Input;
