import React from 'react';

interface UnderDevelopmentProps {
  label?: string;
}

export const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({ label = "Under Development" }) => {
  return (
    <div className="flex items-center justify-center p-2 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 text-xs font-medium">
      <span className="mr-1">⚠️</span>
      {label}
    </div>
  );
};
