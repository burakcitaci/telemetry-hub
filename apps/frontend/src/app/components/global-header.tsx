import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { FilterMultiselect } from '@/shared/components/filter-multiselect';
import { readPlatformFilters } from '@/shared/lib/platform-filters';

export function GlobalHeader() {
  const { session, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const [logoutError, setLogoutError] = useState(false);
  const selectedTeam = readPlatformFilters(params.toString()).team;
  const selectTeam = (teams: string[]) => setParams(current => {
    const next = new URLSearchParams(current);
    next.delete('team'); teams.forEach(team => next.append('team', team)); next.delete('id');
    return next;
  });
  if (!session) return null;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4 text-card-foreground">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <Building2 className="size-3.5" aria-hidden="true" />
        <span className="truncate font-semibold text-foreground">{session.tenantSlug}</span>
        <span className="rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          {session.role}
        </span>
      </div>
      <div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
          void logout().catch(() => setLogoutError(true));
        }}>Log out</Button>
        {logoutError && <span role="alert" className="text-destructive">Logout failed.</span>}

      </div>
    </header>
  );
}
