import { Badge } from '@/components/ui/badge';

interface TypeBadgesProps {
  isClient?: boolean;
  isSupplier?: boolean;
  isSubcontractor?: boolean;
}

export function TypeBadges({ isClient, isSupplier, isSubcontractor }: TypeBadgesProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {isClient && (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] px-1.5 py-0">
          Client
        </Badge>
      )}
      {isSupplier && (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0">
          Supplier
        </Badge>
      )}
      {isSubcontractor && (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-1.5 py-0">
          Subcontractor
        </Badge>
      )}
    </div>
  );
}
