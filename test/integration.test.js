import { describe, it, expect, afterEach } from 'vitest';
import { createApp } from '../server.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('integration: full flow', () => {
  let server, tmpDir;

  afterEach(async () => {
    if (server) await new Promise((r) => server.close(r));
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('review then upload: accepted files saved, rejected files discarded', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-me-int-'));
    const token = 'integrationtoken123456789abcdef0';

    const app = createApp({
      token,
      targetFolder: tmpDir,
      expiresAt: Date.now() + 60000,
      onFileReview: async (files, sendDecision) => {
        return files.map((f, i) => {
          const status = i === 0 ? 'accepted' : 'rejected';
          sendDecision({ name: f.name, status });
          return { ...f, status };
        });
      },
    });

    server = await new Promise((r) => {
      const s = app.listen(0, () => r(s));
    });
    const base = `http://127.0.0.1:${server.address().port}`;

    // 1. Load page
    const pageRes = await fetch(`${base}/u/${token}`);
    expect(pageRes.status).toBe(200);
    expect(await pageRes.text()).toContain('upload-me');

    // 2. Submit for review
    const reviewRes = await fetch(`${base}/u/${token}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { name: 'keep.txt', size: 11, type: 'text/plain' },
        { name: 'drop.txt', size: 7, type: 'text/plain' },
      ]),
    });
    expect(reviewRes.status).toBe(200);
    const reviewBody = await reviewRes.json();
    expect(reviewBody.accepted).toEqual(['keep.txt']);
    expect(reviewBody.rejected).toEqual(['drop.txt']);

    // 3. Upload accepted file
    const fd = new FormData();
    fd.append('files', new Blob(['hello world']), 'keep.txt');
    const uploadRes = await fetch(`${base}/u/${token}/upload`, { method: 'POST', body: fd });
    expect(uploadRes.status).toBe(200);
    const uploadBody = await uploadRes.json();
    expect(uploadBody.files[0].status).toBe('uploaded');

    // 4. Verify disk state
    const diskFiles = fs.readdirSync(tmpDir).filter((f) => !f.startsWith('.'));
    expect(diskFiles).toEqual(['keep.txt']);
    expect(fs.readFileSync(path.join(tmpDir, 'keep.txt'), 'utf8')).toBe('hello world');
  });
});
