import { NavLink } from 'react-router-dom';
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
  Boxes,
  ClipboardCheck,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/shipments', label: 'Shipments', icon: Ship },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/review', label: 'Review', icon: ClipboardCheck },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/emails', label: 'Inbox', icon: Mail },
  { to: '/disputes', label: 'Disputes', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: Scale },
  { to: '/customers', label: 'Customers', icon: Users },
];

export function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="h-5 w-5" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Clearway</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
