import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 px-4 sm:px-6">
      <button
        onClick={onMenu}
        className="focus-ring -ml-1 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="focus-ring rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="block"
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </motion.span>
          </AnimatePresence>
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="focus-ring flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
              {initials(user?.name || 'U')}
            </span>
            <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-12 z-20 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-pop"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
                      {initials(user?.name || 'U')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="px-3 pb-2">
                    <span className="inline-block rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--accent-foreground))] ring-1 ring-inset ring-accent/25">
                      {user?.role}
                    </span>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
