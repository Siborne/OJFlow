import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PracticeProblem } from '../../shared/types';
import { importPracticeProblem } from './practice-service';

export const DEFAULT_COMPANION_PORTS = [10043, 10042, 10045, 27121, 4244, 6174, 1327, 10046];
const MAX_BODY_BYTES = 2 * 1024 * 1024;

export interface CompanionServerHandle {
  port: number;
  close: () => Promise<void>;
}

interface StartOptions {
  ports?: number[];
  onImported?: (problem: PracticeProblem) => void;
  importProblem?: (payload: unknown) => PracticeProblem | null;
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        request.destroy();
        return;
      }
      chunks.push(buffer);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function createCompanionRequestHandler(
  onImported?: (problem: PracticeProblem) => void,
  importProblem = importPracticeProblem,
) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      response.end();
      return;
    }

    if (request.method === 'GET') {
      sendJson(response, 200, { name: 'OJFlow', ready: true });
      return;
    }

    if (request.method !== 'POST') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const raw = await readBody(request);
      const payload: unknown = JSON.parse(raw);
      const problem = importProblem(payload);
      if (!problem) {
        sendJson(response, 400, { error: 'Invalid Competitive Companion payload' });
        return;
      }
      onImported?.(problem);
      sendJson(response, 200, { status: 'ok', id: problem.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';
      sendJson(response, message === 'Payload too large' ? 413 : 400, { error: message });
    }
  };
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

export async function startCompanionServer(
  options: StartOptions = {},
): Promise<CompanionServerHandle> {
  const ports = options.ports?.length ? options.ports : DEFAULT_COMPANION_PORTS;
  const handler = createCompanionRequestHandler(options.onImported, options.importProblem);
  let lastError: Error | undefined;

  for (const port of ports) {
    const server = createServer((request, response) => {
      void handler(request, response);
    });
    try {
      await listen(server, port);
      const address = server.address();
      const activePort = typeof address === 'object' && address ? address.port : port;
      return {
        port: activePort,
        close: () =>
          new Promise((resolve, reject) => {
            server.close(error => (error ? reject(error) : resolve()));
          }),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      server.close();
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') break;
    }
  }

  throw lastError ?? new Error('Unable to start Competitive Companion receiver');
}
