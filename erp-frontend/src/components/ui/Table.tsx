import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

const Table: React.FC<TableProps> = ({ headers, children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-surface shadow-xl">
      <table className={`w-full text-right border-collapse ${className}`} dir="rtl">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            {headers.map((header) => (
              <th 
                key={header} 
                className="px-6 py-4 text-xs font-bold text-secondary uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export const TableRow: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ 
  children, 
  className = '',
  onClick 
}) => (
  <tr 
    onClick={onClick}
    className={`hover:bg-white/[0.02] transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </tr>
);

export const TableCell: React.FC<{ children: React.ReactNode, className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <td className={`px-6 py-4 text-sm text-primary whitespace-nowrap ${className}`}>
    {children}
  </td>
);

export default Table;
