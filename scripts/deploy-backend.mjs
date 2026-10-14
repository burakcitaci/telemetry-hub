// TASK-ONBOARD-1: deploy any already-instrumented backend to the LOCAL kind cluster.
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { imageOptions, prepareImage } from './backend-image.mjs';
import { environmentOptions, backendEnvironment } from './backend-environment.mjs';
import { assertUniqueService } from './service-name-guard.mjs';

const values = new Map();
const flags = new Set();
const allowed = new Set(['name', 'image', 'service', 'org', 'team', 'env', 'build-context', 'dockerfile']);
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (['--apply', '--local-image', '--rotate-key', '--no-cache', '--help'].includes(arg)) flags.add(arg);
  else {
    if (!allowed.has(arg.slice(2)) || !arg.startsWith('--') || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
    values.set(arg.slice(2), process.argv[++i]);
  }
}
if (flags.has('--help')) {
  console.log('node scripts/deploy-backend.mjs --name NAME --image IMAGE --service SERVICE --org ORG --team TEAM --env ENV [--build-context PATH] [--dockerfile FILE] [--no-cache] [--local-image] [--rotate-key] [--apply]');
  console.log('Plan-only by default. Build context implies a local image; an existing tag is rebuilt and replaced.');
  process.exit(0);
}
const name = values.get('name');
const image = values.get('image');
const service = values.get('service') || name;
const org = values.get('org');
const team = values.get('team');
const env = environmentOptions(values.get('env'));
if (!name || name.length > 40 || !/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name)) throw new Error('Use a DNS-safe name of 2-40 characters.');
if (['backend', 'clickhouse', 'opentelemetry-collector'].includes(name)) throw new Error('Reserved Hub deployment name.');
for (const [field, value] of Object.entries({ service, org, team })) {
  if (!value || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) throw new Error(`Invalid ${field}.`);
}
if (!image || !/^[A-Za-z0-9][A-Za-z0-9._:/@-]+$/.test(image)) throw new Error('A valid Docker image is required.');
const imageConfig = imageOptions(values, flags);
const secretName = `${name}-ingestion-key`;
console.log(`Deploy ${name}: image=${image}, service=${service}, tenant=${org}/${team}, env=${env}.`);
if (!flags.has('--apply')) {
  if (imageConfig.context) console.log(`BUILD: ${imageConfig.context}; Dockerfile: ${imageConfig.dockerfile}; cache: ${imageConfig.noCache ? 'disabled' : 'enabled'}; replace tag ${image}.`);
  console.log(`PLAN ONLY: check service-name conflicts; validate tenant and ownership; ${imageConfig.context ? 'build/replace image; ' : ''}${imageConfig.local ? 'inspect/load local image; ' : ''}issue/reuse 7-day key; update Hub registry; restart Hub backend if key changed; deploy/restart workload + local test proxy.`);
  console.log('Nothing changed. Add --apply to execute. No application Service or external port is created.');
  process.exit(0);
}
const context = ['--context', 'kind-observability', '-n', 'telemetry-hub'];
function run(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(input ? `${command} failed; secret-bearing diagnostics suppressed.` : result.stderr || result.error?.message);
  return result.stdout;
}
const kubectl = (...args) => run('kubectl', [...context, ...args]);
const labels = { 'telemetry-hub/onboarded': 'true' };
function apply(object) {
  run('kubectl', [...context, 'apply', '--server-side', '--field-manager=telemetry-onboarding', '-f', '-'], JSON.stringify(object));
}
function get(kind, resource) {
  const output = kubectl('get', kind, resource, '--ignore-not-found', '-o', 'json');
  return output.trim() ? JSON.parse(output) : undefined;
}
function ensureOwned(object) {
  if (object && object.metadata.labels?.['telemetry-hub/onboarded'] !== 'true') {
    throw new Error(`Existing ${object.kind} ${object.metadata.name} is not owned by this script. Choose a new --name.`);
  }
}
const deployments = JSON.parse(kubectl('get', 'deployments', '-o', 'json')).items;
assertUniqueService(deployments, name, service);
console.log(`Service name verified: ${service} is not used by another active deployment.`);
const existingDeployment = deployments.find(deployment => deployment.metadata.name === name);
const existingClient = get('secret', secretName);
ensureOwned(existingDeployment);
ensureOwned(existingClient);
const checkTeam = `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.env.AUTH_DB_PATH,{readOnly:true});const found=db.prepare('SELECT 1 FROM teams WHERE org=? AND id=?').get(${JSON.stringify(org)},${JSON.stringify(team)});if(!found)process.exit(2);console.log('Existing org/team verified');`;
console.log(kubectl('exec', 'deploy/backend', '--', 'node', '-e', checkTeam));
const registry = get('secret', 'telemetry-ingestion');
if (!registry?.data?.INGESTION_COLLECTOR_TOKEN || !registry.data.INGESTION_KEYS_JSON) {
  throw new Error('Authenticated Hub ingestion must be deployed first; this script does not bootstrap or upgrade the Hub.');
}
const records = JSON.parse(Buffer.from(registry.data.INGESTION_KEYS_JSON, 'base64').toString());
if (!Array.isArray(records)) throw new Error('Invalid existing ingestion registry.');
// Finish image build/import BEFORE changing any cluster secrets or restarting the Hub.
prepareImage(imageConfig, (command, args) => {
  if (command === 'docker' && args[0] === 'build') {
    const result = spawnSync(command, args, { stdio: 'inherit', timeout: 900000 });
    if (result.status !== 0) throw new Error('Docker build failed. No ingestion secrets were changed.');
  } else run(command, args);
});
const previousKey = existingClient?.data?.TELEMETRY_API_KEY
  ? Buffer.from(existingClient.data.TELEMETRY_API_KEY, 'base64').toString() : undefined;
const hash = key => createHash('sha256').update(key).digest('hex');
const previous = previousKey ? records.find(r => r.keyHash === hash(previousKey)) : undefined;
let key = previousKey;
let changed = false;
if (previousKey && !flags.has('--rotate-key')) {
  if (!previous || previous.revoked || previous.expiresAt <= Date.now() || previous.orgSlug !== org || previous.teamId !== team || previous.env !== undefined && previous.env !== env) {
    throw new Error('Existing key is expired, revoked or belongs to another tenant/environment. Use --rotate-key explicitly.');
  }
  if (previous.env === undefined) { previous.env = env; changed = true; }
} else {
  key = randomBytes(32).toString('base64url');
  if (previous) previous.revoked = true;
  records.push({ keyHash: hash(key), orgSlug: org, teamId: team, env, expiresAt: Date.now() + 7 * 86400000, revoked: false });
  changed = true;
}
if (changed) {
  // JSON travels through stdin; no key in argv, logs or a local secret file.
  registry.data.INGESTION_KEYS_JSON = Buffer.from(JSON.stringify(records)).toString('base64');
  run('kubectl', [...context, 'replace', '-f', '-'], JSON.stringify(registry));
  apply({ apiVersion: 'v1', kind: 'Secret', metadata: { name: secretName, labels }, type: 'Opaque',
    data: { TELEMETRY_API_KEY: Buffer.from(key).toString('base64'),
      OTEL_EXPORTER_OTLP_HEADERS: Buffer.from(`x-api-key=${key}`).toString('base64') } });
  console.log('Client key registered; plaintext withheld. Restarting Hub to reload registry.');
  console.log(kubectl('rollout', 'restart', 'deployment/backend'));
  console.log(kubectl('rollout', 'status', 'deployment/backend', '--timeout=120s'));
}
const fromSecret = field => ({ secretKeyRef: { name: secretName, key: field } });
apply({ apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name, labels,
  annotations: { 'telemetry-hub/service-name': service, 'telemetry-hub/environment': env } }, spec: {
  replicas: 1, selector: { matchLabels: { app: name } }, template: {
    metadata: { labels: { app: name, ...labels } }, spec: { containers: [{
      name: 'worker', image, imagePullPolicy: imageConfig.local ? 'Never' : 'IfNotPresent',
      env: [...backendEnvironment(env, org, team), { name: 'TELEMETRY_API_KEY', valueFrom: fromSecret('TELEMETRY_API_KEY') },
        { name: 'OTEL_EXPORTER_OTLP_HEADERS', valueFrom: fromSecret('OTEL_EXPORTER_OTLP_HEADERS') },
        { name: 'OTEL_EXPORTER_OTLP_PROTOCOL', value: 'http/protobuf' },
        { name: 'OTEL_SERVICE_NAME', value: service },
        { name: 'OTEL_EXPORTER_OTLP_ENDPOINT', value: 'http://127.0.0.1:13001/api/ingest' }],
      securityContext: { allowPrivilegeEscalation: false },
      resources: { requests: { cpu: '20m', memory: '32Mi' }, limits: { cpu: '500m', memory: '256Mi' } }
    }, {
      name: 'local-test-proxy', image: 'node:24-alpine',
      command: ['node', '-e', `const net=require('net');net.createServer(s=>{const u=net.connect(3001,'backend');s.pipe(u).pipe(s);u.on('error',()=>s.destroy());s.on('error',()=>u.destroy());}).listen(13001,'127.0.0.1');`],
      securityContext: { runAsNonRoot: true, runAsUser: 1000, allowPrivilegeEscalation: false },
      resources: { requests: { cpu: '10m', memory: '16Mi' }, limits: { cpu: '100m', memory: '64Mi' } }
    }] }
  }
} });
if (existingDeployment) console.log(kubectl('rollout', 'restart', `deployment/${name}`));
console.log(kubectl('rollout', 'status', `deployment/${name}`, '--timeout=120s'));
console.log(`Deployment ready. Select ${org}/${team} and ${service} / ${env} in the Hub; verify actual telemetry delivery.`);
console.log('Local testing only: proxy-to-Hub hop is plaintext. Production requires HTTPS and proper key lifecycle management.');
