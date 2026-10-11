export function readPlatformFilters(search: string) {
  const params = new URLSearchParams(search);
  const selected = (key: string) => {
    const value = params.get(key);
    return value && value !== 'all' ? value : undefined;
  };
  return { team: selected('team'), service: selected('globalService'), env: selected('env') ?? 'all' };
}

export function platformFilterSearch(search: string): string {
  const { team, service, env } = readPlatformFilters(search);
  const params = new URLSearchParams();
  if (team) params.set('team', team);
  if (service) params.set('globalService', service);
  if (env !== 'all') params.set('env', env);
  return params.size ? `?${params}` : '';
}

export function platformFilterKey(search: string): string {
  const { team, service, env } = readPlatformFilters(search);
  return JSON.stringify([team ?? null, service ?? null, env]);
}
