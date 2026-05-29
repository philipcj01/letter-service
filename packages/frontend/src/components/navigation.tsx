'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { LayoutDashboard, FileText, Mail, LogOut, type LucideIcon } from 'lucide-react';

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/letters', label: 'History', icon: Mail },
];

function UserDropdown({ user, logout }: { user: { email?: string; displayName?: string }; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
        aria-label="User menu"
      >
        {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-background shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1">
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium text-foreground truncate">{user.displayName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                V
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground">CloudLetters</span>
                <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">Letter Generation</span>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
                <UserDropdown user={user} logout={logout} />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                ?
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
