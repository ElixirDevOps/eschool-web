import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:https';
import { request } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

export type TlsServer = { port: number; close: () => Promise<void> };

/** A throwaway certificate for `localhost`, made fresh for the check that needs a real TLS port. */
export function selfSignedLocalhostCert(): { key: string; cert: string } {
  const dir = mkdtempSync(join(tmpdir(), 'constat-tls-'));
  const key = join(dir, 'key.pem');
  const cert = join(dir, 'cert.pem');
  execFileSync(
    'openssl',
    ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
     '-keyout', key, '-out', cert, '-subj', '/CN=localhost',
     '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'],
    { stdio: 'ignore' },
  );
  return { key: readFileSync(key, 'utf8'), cert: readFileSync(cert, 'utf8') };
}

export async function startTlsServer(
  handler: (path: string) => { status: number; headers: Record<string, string>; body: string },
): Promise<TlsServer> {
  const { key, cert } = selfSignedLocalhostCert();
  const server: Server = createServer({ key, cert }, (req, res) => {
    const { status, headers, body } = handler(req.url ?? '/');
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.writeHead(status);
    res.end(body);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const port = (server.address() as AddressInfo).port;
  return { port, close: () => new Promise<void>((done) => server.close(() => done())) };
}

/** Speaks real TLS to the server above, accepting its throwaway certificate. */
export function fetchOverTls(
  port: number,
  path: string,
): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, method: 'GET', rejectUnauthorized: false, servername: 'localhost' },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}
