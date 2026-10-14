import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function imageOptions(values, flags) {
  const context = values.get('build-context');
  if (!context && (values.has('dockerfile') || flags.has('--no-cache'))) {
    throw new Error('--dockerfile and --no-cache require --build-context.');
  }
  if (!context) return { image: values.get('image'), local: flags.has('--local-image') };
  const root = resolve(context);
  const dockerfile = resolve(root, values.get('dockerfile') || 'Dockerfile');
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`Build context not found: ${root}`);
  if (!existsSync(dockerfile) || !statSync(dockerfile).isFile()) throw new Error(`Dockerfile not found: ${dockerfile}`);
  if (values.get('image').includes('@')) throw new Error('Building requires an image tag, not a digest reference.');
  return { image: values.get('image'), local: true, context: root, dockerfile, noCache: flags.has('--no-cache') };
}

export function prepareImage(options, run) {
  if (options.context) {
    const args = ['build', '-t', options.image, '-f', options.dockerfile];
    if (options.noCache) args.push('--no-cache');
    args.push(options.context);
    run('docker', args);
  }
  if (options.local) {
    try { run('docker', ['image', 'inspect', options.image, '--format', '{{.Id}}']); }
    catch { throw new Error(`Local image ${options.image} is missing. Supply --build-context PATH to build it, or build it manually first.`); }
    run('kind', ['load', 'docker-image', options.image, '--name', 'observability']);
  }
}
