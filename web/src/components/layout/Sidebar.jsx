import { NavLink } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import {
  LayoutDashboard,
  FolderKanban,
  Ship,
  FileText,
  Receipt,
  Mail,
  CreditCard,
  AlertTriangle,
  Users,
  Settings,
  ClipboardCheck,
  Scale,
  Anchor,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Navigation follows the real workflow: see the numbers → process incoming work →
// bill & collect → setup. Reads like the job, not a list of database tables.
const GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/ledger', label: 'Ledger', icon: BookOpen },
      { to: '/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { to: '/emails', label: 'Inbox', icon: Mail },
      { to: '/review', label: 'Review', icon: ClipboardCheck },
      { to: '/shipments', label: 'Shipments', icon: Ship },
      { to: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/invoices', label: 'Invoices', icon: Receipt },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
      { to: '/reports', label: 'Reports', icon: Scale },
    ],
  },
  {
    label: 'Setup',
    items: [{ to: '/projects', label: 'Projects', icon: FolderKanban }],
  },
];

function NavItem({ to, label, icon: Icon, end, onNavigate }) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} className="group relative block">
      {({ isActive }) => (
        <span
          className={cn(
            'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200',
            isActive
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          {isActive && (
            <motion.span
              layoutId="nav-active"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              className="absolute inset-0 -z-10 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/15"
            />
          )}
          {isActive && (
            <motion.span
              layoutId="nav-bar"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
            />
          )}
          <Icon className={cn('h-[18px] w-[18px] transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
          {label}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
          <Anchor className="h-[18px] w-[18px]" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
        </div>
        <span className="font-display text-lg font-semibold tracking-tight">Clearway</span>
      </div>

      <LayoutGroup>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </LayoutGroup>

      <div className="border-t border-border/70 px-3 py-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/15'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )
          }
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </NavLink>
      </div>
    </div>
  );
}
