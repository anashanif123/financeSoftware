import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/store/auth';
import { initials } from '@/lib/format';
import { http } from '@/lib/api';

export function Topbar({ onMenu }) {
  const { theme, toggle } = useTheme();
  const { user, refreshToken, clear } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const logout = async () => {
    await http.post('/auth/logout', { refreshToken }).catch(() => {});
    clear();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenu} className="focus-ring -ml-1 rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="focus-ring flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {initials(user?.name || 'U')}
            </span>
            <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-56 animate-slide-up rounded-xl border border-border bg-surface p-1.5 shadow-pop">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  <p className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    {user?.role}
                  </p>
                </div>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
