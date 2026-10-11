import { Building2, ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/auth-context';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';

const ALL_TEAMS = '__all__';

export function GlobalHeader() {
  const { session, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const [logoutError, setLogoutError] = useState(false);
  const selectedTeam = params.get('team');
  const selectTeam = (team: string | null) => setParams(current => {
    const next = new URLSearchParams(current);
    if (team) next.set('team', team); else next.delete('team');
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
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
          void logout().catch(() => setLogoutError(true));
        }}>Abmelden</Button>
        {logoutError && <span role="alert" className="text-destructive">Abmelden fehlgeschlagen.</span>}
      </div>
      {session && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 min-w-36 justify-between rounded-sm border-border bg-background text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <Users className="size-3.5" />
                <span className="truncate">{selectedTeam ?? 'Alle Teams'}</span>
              </span>
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-sm border-border bg-popover text-popover-foreground">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Team-Ansicht
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={selectedTeam ?? ALL_TEAMS}
              onValueChange={(value) => selectTeam(value === ALL_TEAMS ? null : value)}
            >
              <DropdownMenuRadioItem value={ALL_TEAMS}>Alle Teams</DropdownMenuRadioItem>
              {session.teams.map((team) => (
                <DropdownMenuRadioItem key={team} value={team}>{team}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
