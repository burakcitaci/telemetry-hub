export function environmentOptions(value) {
  if (!value || value === 'all' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) {
    throw new Error('Supply --env with an explicit environment name (for example dev, staging or production).');
  }
  return value;
}

export function backendEnvironment(env, org, team) {
  return [
    { name: 'DEPLOY_ENV', value: env },
    { name: 'OTEL_RESOURCE_ATTRIBUTES', value: `deployment.environment.name=${env},org.slug=${org},team.id=${team}` },
  ];
}
