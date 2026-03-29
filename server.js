import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { getUploadPageHtml } from './upload-page.js';

export function createApp({ token, targetFolder, onFileReview, onUploadProgress, expiresAt }) {
  const app = express();
  app.use(express.json());

  let sseClients = [];
  let acceptedFiles = new Set();
  let reviewComplete = false;

  // Token validation middleware
  app.param('token', (req, res, next, value) => {
    if (value !== token) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    next();
  });

  // Serve upload page
  app.get('/u/:token', (req, res) => {
    const html = getUploadPageHtml({ token, expiresAt: expiresAt || (Date.now() + 15 * 60 * 1000) });
    res.type('html').send(html);
  });

  // SSE events endpoint
  app.get('/u/:token/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
  });

  function broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    sseClients.forEach((client) => client.write(data));
  }

  // File review endpoint
  app.post('/u/:token/review', async (req, res) => {
    const files = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Expected array of file metadata' });
    }

    broadcast({ type: 'review-start' });

    const decisions = await onFileReview(files, (decision) => {
      broadcast({ type: 'file-status', ...decision });
    });

    acceptedFiles = new Set(
      decisions
        .filter((d) => d.status === 'accepted')
        .map((d) => path.basename(d.name))
    );
    reviewComplete = true;

    const accepted = decisions.filter((d) => d.status === 'accepted');
    const rejected = decisions.filter((d) => d.status === 'rejected');
    broadcast({ type: 'review-complete', accepted, rejected });

    res.json({ accepted: accepted.map((a) => a.name), rejected: rejected.map((r) => r.name) });
  });

  // File upload endpoint
  const storage = multer.diskStorage({
    destination: targetFolder,
    filename: (req, file, cb) => {
      const tempName = `.upload-me-${crypto.randomBytes(8).toString('hex')}.tmp`;
      if (!req._fileMap) req._fileMap = new Map();
      req._fileMap.set(tempName, path.basename(file.originalname));
      cb(null, tempName);
    },
  });

  const upload = multer({ storage });

  app.post('/u/:token/upload', upload.any(), async (req, res) => {
    if (!reviewComplete) {
      return res.status(400).json({ error: 'Review not completed yet' });
    }

    const results = [];
    for (const file of req.files || []) {
      const originalName = path.basename(req._fileMap?.get(file.filename) || file.originalname);

      if (!acceptedFiles.has(originalName)) {
        fs.unlinkSync(path.join(targetFolder, file.filename));
        results.push({ name: originalName, status: 'rejected' });
        continue;
      }

      const finalName = getUniqueFilename(targetFolder, originalName);
      fs.renameSync(
        path.join(targetFolder, file.filename),
        path.join(targetFolder, finalName)
      );
      results.push({ name: finalName, status: 'uploaded' });
      broadcast({ type: 'upload-progress', filename: originalName, percent: 100 });
    }

    broadcast({ type: 'upload-complete', files: results });
    res.json({ files: results });
  });

  app._broadcast = broadcast;
  app._sseClients = () => sseClients;

  return app;
}

export function getUniqueFilename(folder, name) {
  let candidate = name;
  let counter = 1;
  const ext = path.extname(name);
  const base = path.basename(name, ext);

  while (fs.existsSync(path.join(folder, candidate))) {
    candidate = `${base} (${counter})${ext}`;
    counter++;
  }
  return candidate;
}
