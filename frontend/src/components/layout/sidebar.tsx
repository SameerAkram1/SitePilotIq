'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FolderKanban,
  MapPin,
  BookOpen,
  FileText,
  Receipt,
  Package,
  Cog,
  FileSignature,
  Users,
  ClipboardCheck,
  ShoppingCart,
  FolderOpen,
  Settings,
  Shield,
  Handshake,
  Briefcase,
  CalendarCheck,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

function NavLink({ item, isActive }: { item: { labelKey: string; href: string; icon: React.ElementType }; isActive: boolean }) {
  const t = useTranslations('sidebar');
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50'
          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
      )}
    >
      <div className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 shrink-0',
        isActive
          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20'
          : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500 group-hover:bg-gray-200 dark:group-hover:bg-white/10 group-hover:text-gray-600 dark:group-hover:text-white'
      )}>
        <item.icon className="h-4 w-4" />
      </div>
      <span className="truncate">{t(item.labelKey as any)}</span>
    </Link>
  );
}

function NavSection({ titleKey, items }: { titleKey: string; items: { labelKey: string; href: string; icon: React.ElementType }[] }) {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  return (
    <div className="space-y-1">
      <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
        {t(titleKey as any)}
      </p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} isActive={pathname === item.href} />
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations('sidebar');

  const mainNav = [
    { labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  const projectNav = [
    { labelKey: 'projects', href: '/projects', icon: FolderKanban },
    { labelKey: 'clients', href: '/clients', icon: Building2 },
    { labelKey: 'sites', href: '/sites', icon: MapPin },
    { labelKey: 'assignments', href: '/assignments', icon: CalendarCheck },
    { labelKey: 'attendance', href: '/attendance/history', icon: ClipboardCheck },
    { labelKey: 'partners', href: '/partners', icon: Handshake },
    { labelKey: 'measurement_books', href: '/measurements', icon: BookOpen },
    { labelKey: 'calendar', href: '/calendar', icon: CalendarDays },
  ];

  const financeNav = [
    { labelKey: 'ipc', href: '/ipc', icon: FileText },
    { labelKey: 'billing', href: '/billing', icon: Receipt },
    { labelKey: 'inventory', href: '/inventory', icon: Package },
    { labelKey: 'orders', href: '/orders', icon: ShoppingCart },
  ];

  const managementNav = [
    { labelKey: 'users', href: '/users', icon: Users },
    { labelKey: 'departments', href: '/departments', icon: Briefcase },
    { labelKey: 'contracts', href: '/contracts', icon: FileSignature },
    { labelKey: 'assets', href: '/assets', icon: Cog },
    { labelKey: 'hr_payroll', href: '/hr', icon: ClipboardCheck },
    { labelKey: 'inspections', href: '/inspections', icon: ClipboardCheck },
    { labelKey: 'documents', href: '/documents', icon: FolderOpen },
  ];

  const bottomNav = [
    { labelKey: 'settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:start-0 bg-white dark:bg-[#0a0e1a] border-s border-gray-200 dark:border-white/5 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-gray-100 dark:border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow duration-300">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-400 rounded-full border-2 border-white dark:border-[#0a0e1a]" />
          </div>
          <div>
            <span className="text-[15px] font-bold tracking-tight font-[family-name:var(--font-heading)] text-gray-900 dark:text-white">
              {t('brand_name')}<span className="text-blue-600 dark:text-blue-400">{t('brand_suffix')}</span>
            </span>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium tracking-wider -mt-0.5">{t('brand_tagline')}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href} />
        ))}
        <NavSection titleKey="section_projects" items={projectNav} />
        <NavSection titleKey="section_finance" items={financeNav} />
        <NavSection titleKey="section_management" items={managementNav} />
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 dark:border-white/5 p-3 space-y-1">
        {bottomNav.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname === item.href} />
        ))}
        {user?.role === 'SUPER_ADMIN' && (
          <NavLink
            item={{ labelKey: 'super_admin', href: '/admin', icon: Shield }}
            isActive={pathname.startsWith('/admin')}
          />
        )}
      </div>

      {/* User card */}
      <div className="p-3 border-t border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
