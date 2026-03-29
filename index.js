#!/usr/bin/env node

import crypto from 'node:crypto';
import * as readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createApp } from './server.js';
import { createMapping, removeMapping } from './upnp.js';
import { printBanner, startCountdown, reviewFiles, printUploadProgress } from './console-ui.js';

export function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

export function generatePort() {
  return Math.floor(Math.random() * 10001) + 50000;
}

export function validateFolder(folderPath) {
  const folder = path.resolve(folderPath);
  if (!fs.existsSync(folder)) return { valid: false, error: 'Path does not exist' };
  if (!fs.statSync(folder).isDirectory()) return { valid: false, error: 'Path is not a directory' };
  try {
    fs.accessSync(folder, fs.constants.W_OK);
  } catch {
    return { valid: false, error: 'No write permission' };
  }
  return { valid: true, folder };
}

async function promptForFolder() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('Target folder path: ', (answer) => {
      rl.close();
      const result = validateFolder(answer.trim());
      if (!result.valid) {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
      resolve(result.folder);
    });
  });
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

async function main() {
  const targetFolder = await promptForFolder();
  const token = generateToken();
  const port = generatePort();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  let idleTimer;
  let countdownInterval;

  const app = createApp({
    token,
    targetFolder,
    expiresAt,
    onFileReview: async (files, sendDecision) => {
      if (idleTimer) clearTimeout(idleTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      const decisions = await reviewFiles(files, sendDecision);
      return decisions;
    },
    onUploadProgress: (filename, percent) => {
      printUploadProgress(filename, percent);
    },
  });

  const server = app.listen(port, async () => {
    const localUrl = `http://127.0.0.1:${port}/u/${token}`;
    const lanUrl = `http://${getLocalIp()}:${port}/u/${token}`;

    const upnpResult = await createMapping(port);
    let networkUrl = null;
    if (upnpResult.success) {
      networkUrl = `http://${upnpResult.externalIp}:${port}/u/${token}`;
    }

    printBanner(localUrl, networkUrl || lanUrl, expiresAt);
    countdownInterval = startCountdown(expiresAt, () => shutdown('Session expired'));
    idleTimer = setTimeout(() => shutdown('Idle timeout reached'), 15 * 60 * 1000);
  });

  async function shutdown(reason) {
    console.log(`\nShutting down: ${reason}`);
    if (countdownInterval) clearInterval(countdownInterval);
    if (idleTimer) clearTimeout(idleTimer);

    try {
      const files = fs.readdirSync(targetFolder);
      for (const f of files) {
        if (f.startsWith('.upload-me-') && f.endsWith('.tmp')) {
          fs.unlinkSync(path.join(targetFolder, f));
        }
      }
    } catch { /* best effort */ }

    await removeMapping();
    server.close(() => process.exit(0));
  }

  process.on('SIGINT', () => shutdown('Interrupted'));
  process.on('SIGTERM', () => shutdown('Terminated'));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
if (isMain) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
