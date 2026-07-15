import { Heart, Home, Info, Library, ListMusic, Search, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

import { CREATOR_NAME, CREATOR_URL } from '@/core/constants';
import { cn } from '@/lib/utils';

function AuraLogo() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8 rounded-lg" />
      <span className="text-lg font-bold tracking-tight">
        Aura <span className="aura-text">Music</span>
      </span>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          isActive && 'bg-accent text-foreground',
        )
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 p-3 md:flex">
      <AuraLogo />
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        <NavItem to="/" icon={Home} label={t('nav.home')} end />
        <NavItem to="/library" icon={Library} label={t('nav.library')} />
        <NavItem to="/search" icon={Search} label={t('nav.search')} />
        <NavItem to="/favorites" icon={Heart} label={t('nav.favorites')} />
        <NavItem to="/playlists" icon={ListMusic} label={t('nav.playlists')} />
      </nav>
      <div className="flex flex-col gap-1 border-t pt-3">
        <NavItem to="/settings" icon={Settings} label={t('nav.settings')} />
        <NavItem to="/about" icon={Info} label={t('nav.about')} />
        <a
          href={CREATOR_URL}
          target="_blank"
          rel="noreferrer"
          className="px-3 pb-1 pt-2 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          {t('about.createdBy')} <span className="font-semibold aura-text">{CREATOR_NAME}</span>
        </a>
      </div>
    </aside>
  );
}
