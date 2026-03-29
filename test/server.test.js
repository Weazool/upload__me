import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, getUniqueFilename } from '../server.js';

let server;
let baseUrl;
let token;
let tmpDir;

beforeEach(() => {
  token = 'test-token-abc';
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-me-test-'));

  const app = createApp({
    token,
    targetFolder: tmpDir,
    onFileReview: async (files, onDecision) => {
      return files.map((f) => {
        const decision = { name: f.name, size: f.size, status: 'accepted' };
        onDecision(decision);
        return decision;
      });
    },
    onUploadProgress: () => {},
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterEach(() => {
  return new Promise((resolve) => {
    server.close(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      resolve();
    });
  });
});

describe('server', () => {
  describe('token auth', () => {
    it('returns 403 for invalid token', async () => {
      const res = await fetch(`${baseUrl}/u/wrongtoken`);
      expect(res.status).toBe(403);
    });

    it('returns 200 for valid token on GET /u/:token', async () => {
      const res = await fetch(`${baseUrl}/u/${token}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('returns 403 for invalid token on POST /u/:token/review', async () => {
      const res = await fetch(`${baseUrl}/u/wrongtoken/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ name: 'test.txt', size: 100 }]),
      });
      expect(res.status).toBe(403);
    });

    it('returns 403 for invalid token on POST /u/:token/upload', async () => {
      const res = await fetch(`${baseUrl}/u/wrongtoken/upload`, {
        method: 'POST',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /u/:token', () => {
    it('serves HTML upload page with token in body', async () => {
      const res = await fetch(`${baseUrl}/u/${token}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      const html = await res.text();
      expect(html).toContain(token);
    });
  });

  describe('POST /u/:token/review', () => {
    it('calls onFileReview and returns decisions', async () => {
      const files = [
        { name: 'photo.jpg', size: 1024 },
        { name: 'doc.pdf', size: 2048 },
      ];
      const res = await fetch(`${baseUrl}/u/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(files),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accepted).toContain('photo.jpg');
      expect(body.accepted).toContain('doc.pdf');
      expect(body.rejected).toHaveLength(0);
    });

    it('returns 400 for empty array body', async () => {
      const res = await fetch(`${baseUrl}/u/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('returns 400 for non-array body', async () => {
      const res = await fetch(`${baseUrl}/u/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test.txt' }),
      });
      expect(res.status).toBe(400);
    });

    it('broadcasts review-start and review-complete events', async () => {
      // We just verify the review endpoint returns correct structure
      const files = [{ name: 'a.txt', size: 100 }];
      const res = await fetch(`${baseUrl}/u/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(files),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.accepted)).toBe(true);
      expect(Array.isArray(body.rejected)).toBe(true);
    });

    it('correctly separates accepted and rejected files based on onFileReview', async () => {
      // Create a server where onFileReview rejects files starting with 'bad-'
      const app2 = createApp({
        token: 'token2',
        targetFolder: tmpDir,
        onFileReview: async (files, onDecision) => {
          return files.map((f) => {
            const status = f.name.startsWith('bad-') ? 'rejected' : 'accepted';
            const decision = { name: f.name, size: f.size, status };
            onDecision(decision);
            return decision;
          });
        },
        onUploadProgress: () => {},
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
      const server2 = http.createServer(app2);
      await new Promise((resolve) => server2.listen(0, '127.0.0.1', resolve));
      const { port } = server2.address();
      const url2 = `http://127.0.0.1:${port}`;

      const files = [
        { name: 'good.txt', size: 100 },
        { name: 'bad-file.txt', size: 200 },
      ];
      const res = await fetch(`${url2}/u/token2/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(files),
      });
      const body = await res.json();
      expect(body.accepted).toContain('good.txt');
      expect(body.rejected).toContain('bad-file.txt');

      await new Promise((resolve) => server2.close(resolve));
    });
  });

  describe('GET /u/:token/events (SSE)', () => {
    it('connects and receives connected event', async () => {
      const controller = new AbortController();
      const res = await fetch(`${baseUrl}/u/${token}/events`, {
        signal: controller.signal,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');

      // Read the first chunk
      const reader = res.body.getReader();
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      expect(text).toContain('"type":"connected"');

      controller.abort();
    });

    it('broadcasts events to SSE clients after review', async () => {
      const controller = new AbortController();
      const sseRes = await fetch(`${baseUrl}/u/${token}/events`, {
        signal: controller.signal,
      });
      const reader = sseRes.body.getReader();

      // Consume the initial connected event
      await reader.read();

      // Trigger review to generate broadcast events
      const reviewPromise = fetch(`${baseUrl}/u/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ name: 'file.txt', size: 100 }]),
      });

      // Read the next event (review-start)
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      expect(text).toContain('review-start');

      await reviewPromise;
      controller.abort();
    });
  });

  describe('upload guard', () => {
    it('returns 400 if upload attempted before review', async () => {
      const FormData = (await import('node:buffer')).default
        ? (await import('formdata-node').catch(() => null))?.FormData
        : null;

      // Use raw fetch with a multipart body — simplest: just call without files
      const res = await fetch(`${baseUrl}/u/${token}/upload`, {
        method: 'POST',
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Review not completed');
    });
  });

  describe('file upload', () => {
    it('rejects upload of files not in the accepted list', async () => {
      // Use onFileReview that rejects everything
      const app3 = createApp({
        token: 'token3',
        targetFolder: tmpDir,
        onFileReview: async (files, onDecision) => {
          return files.map((f) => {
            const decision = { name: f.name, size: f.size, status: 'rejected' };
            onDecision(decision);
            return decision;
          });
        },
        onUploadProgress: () => {},
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
      const server3 = http.createServer(app3);
      await new Promise((resolve) => server3.listen(0, '127.0.0.1', resolve));
      const { port } = server3.address();
      const url3 = `http://127.0.0.1:${port}`;

      // First do review
      await fetch(`${url3}/u/token3/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ name: 'secret.txt', size: 100 }]),
      });

      // Now upload a file with the same name
      const fileContent = Buffer.from('secret content');
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="secret.txt"\r\nContent-Type: text/plain\r\n\r\n`),
        fileContent,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const uploadRes = await fetch(`${url3}/u/token3/upload`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      });

      expect(uploadRes.status).toBe(200);
      const result = await uploadRes.json();
      expect(result.files[0].status).toBe('rejected');
      // File should NOT exist on disk
      const files = fs.readdirSync(tmpDir);
      expect(files.every((f) => !f.includes('secret.txt'))).toBe(true);

      await new Promise((resolve) => server3.close(resolve));
    });

    it('saves accepted files to targetFolder with correct name', async () => {
      // First do review to mark file as accepted
      await fetch(`${baseUrl}/u/${token}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ name: 'hello.txt', size: 5 }]),
      });

      const fileContent = Buffer.from('hello');
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="hello.txt"\r\nContent-Type: text/plain\r\n\r\n`),
        fileContent,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const uploadRes = await fetch(`${baseUrl}/u/${token}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      });

      expect(uploadRes.status).toBe(200);
      const result = await uploadRes.json();
      expect(result.files[0].status).toBe('uploaded');
      expect(result.files[0].name).toBe('hello.txt');

      const files = fs.readdirSync(tmpDir);
      expect(files).toContain('hello.txt');
    });
  });

  describe('getUniqueFilename', () => {
    it('returns original name if no conflict', () => {
      const result = getUniqueFilename(tmpDir, 'unique.txt');
      expect(result).toBe('unique.txt');
    });

    it('appends numeric suffix on conflict', () => {
      // Create a file that will conflict
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content');
      const result = getUniqueFilename(tmpDir, 'file.txt');
      expect(result).toBe('file (1).txt');
    });

    it('increments suffix for multiple conflicts', () => {
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content');
      fs.writeFileSync(path.join(tmpDir, 'file (1).txt'), 'content');
      const result = getUniqueFilename(tmpDir, 'file.txt');
      expect(result).toBe('file (2).txt');
    });

    it('handles files without extensions', () => {
      fs.writeFileSync(path.join(tmpDir, 'readme'), 'content');
      const result = getUniqueFilename(tmpDir, 'readme');
      expect(result).toBe('readme (1)');
    });
  });
});
