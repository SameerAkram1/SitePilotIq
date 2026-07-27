import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  DISABLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PROJECT_MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SITE_MANAGER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  ENGINEER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FINANCE_MANAGER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  HR_MANAGER: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  PURCHASE_MANAGER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ORDER_MANAGER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  CONTRACT_MANAGER: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  WORKER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

interface StatusBadgeProps {
  value: string;
  type?: 'status' | 'role';
}

export function StatusBadge({ value, type = 'status' }: StatusBadgeProps) {
  const colors = type === 'role' ? roleColors : statusColors;
  const className = colors[value] || 'bg-gray-100 text-gray-800';

  return (
    <Badge variant="secondary" className={className}>
      {value.replace(/_/g, ' ')}
    </Badge>
  );
}
