import { Home, Library, ListMusic, Search, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const items = [
  { to: '/', icon: Home, key: 'nav.home', end: true },
  { to: '/library', icon: Library, key: 'nav.library' },
  { to: '/search', icon: Search, key: 'nav.search' },
  { to: '/playlists', icon: ListMusic, key: 'nav.playlists' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
] as const;

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      className="glass z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main"
    >
      {items.map(({ to, icon: Icon, key, ...rest }) => (
        <NavLink
          key={to}
          to={to}
          end={'end' in rest}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors',
              isActive && 'text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('size-5', isActive && 'stroke-[2.4] text-aura-1')} />
              {t(key)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
