import { BadRequestException } from '@nestjs/common';

export function telemetryEnvironment(env?: string) {
  if (env === undefined) return { sql: '', params: {} };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(env)) {
    throw new BadRequestException('env must be a valid environment name');
  }
  return {
    sql: "ResourceAttributes['deployment.environment.name'] = {env:String}",
    params: { env },
  };
}
