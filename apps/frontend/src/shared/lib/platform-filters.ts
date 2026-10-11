export function readPlatformFilters(search: string) {
  const params = new URLSearchParams(search);
  const selected = (key: string) => {
    return [...new Set(params.getAll(key).filter(value => value && value !== 'all'))].sort();
  };
  return { team: selected('team'), service: selected('globalService'), env: selected('env'), status: selected('globalStatus') };
}

export function platformFilterSearch(search: string): string {
  const { team, service, env, status } = readPlatformFilters(search);
  const params = new URLSearchParams();
  team.forEach(value => params.append('team', value));
  service.forEach(value => params.append('globalService', value));
  env.forEach(value => params.append('env', value));
  status.forEach(value => params.append('globalStatus', value));
  return params.size ? `?${params}` : '';
}

export function platformFilterKey(search: string): string {
  const { team, service, env, status } = readPlatformFilters(search);
  return JSON.stringify([team, service, env, status]);
}
