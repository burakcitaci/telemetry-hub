// Isolated proxy-test backend. Never used by the application or Compose quickstart.
import { createServer } from 'node:http';

const session = { tenantSlug: 'demo', role: 'admin', teams: ['backend'] };
createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/auth/login') {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const input = JSON.parse(body);
      if (
        input.tenantSlug !== 'demo' ||
        input.email !== 'smoke@example.test' ||
        input.password !== 'smoke-password-1234'
      ) {
        response.writeHead(401);
        response.end('{}');
        return;
      }
      response.setHeader('Set-Cookie', 'smoke_session=ok; HttpOnly; Secure; SameSite=Lax; Path=/');
      response.writeHead(201);
      response.end(JSON.stringify(session));
    });
    return;
  }
  if (request.url === '/api/auth/session') {
    response.writeHead(request.headers.cookie?.includes('smoke_session=ok') ? 200 : 401);
    response.end(JSON.stringify(session));
    return;
  }
  const result = request.url.startsWith('/api/metrics')
    ? { metrics: [] }
    : request.url.startsWith('/api/filters')
      ? { services: [], environments: [], statuses: [] }
      : [];
  response.end(JSON.stringify(result));
}).listen(3001, '0.0.0.0');
