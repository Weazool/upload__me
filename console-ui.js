import chalk from 'chalk';
import * as readline from 'node:readline';

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatFileList(files) {
  return files.map((f, i) => {
    const num = `${i + 1}.`.padEnd(4);
    const name = f.name.padEnd(30);
    const size = `(${formatFileSize(f.size)})`;
    return `  ${num}${name} ${size}`;
  });
}

export function printBanner(localUrl, lanIp, extIp, upnpOk, port, token, expiresAt) {
  const divider = chalk.gray('\u2500'.repeat(50));
  console.log(divider);
  console.log(chalk.bold('  upload-me'));
  console.log(divider);
  console.log(`  ${chalk.cyan('Local:')}    ${localUrl}`);
  if (lanIp && lanIp !== '127.0.0.1') {
    console.log(`  ${chalk.cyan('LAN:')}      http://${lanIp}:${port}/u/${token}`);
  }
  if (extIp) {
    const label = upnpOk ? 'External:' : 'External:';
    const note = upnpOk ? chalk.green(' (UPnP \u2714)') : chalk.yellow(' (UPnP \u2718 \u2014 manual port forward needed)');
    console.log(`  ${chalk.cyan(label)} http://${extIp}:${port}/u/${token}${note}`);
  }
  console.log(divider);
}

export function startCountdown(expiresAt, onExpire) {
  const interval = setInterval(() => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearInterval(interval);
      process.stdout.write('\r' + chalk.red('  Session expired.') + ' '.repeat(30) + '\n');
      onExpire();
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    process.stdout.write(`\r  ${chalk.yellow('TTL:')} ${mins}m ${secs.toString().padStart(2, '0')}s remaining   `);
  }, 1000);
  return interval;
}

export async function reviewFiles(files, onDecision, inputStream = process.stdin) {
  const rl = readline.createInterface({ input: inputStream, output: process.stdout });
  const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

  const divider = chalk.gray('\u2500'.repeat(50));
  console.log('\n' + divider);
  console.log(chalk.bold(`  ${files.length} file(s) submitted for review:`));
  console.log(divider);
  formatFileList(files).forEach((line) => console.log(line));
  console.log('');

  const decisions = [];
  let acceptAll = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let status;
    if (acceptAll) {
      status = 'accepted';
      console.log(chalk.green(`  \u2714 "${file.name}" auto-accepted`));
    } else {
      const answer = await ask(
        `  ${chalk.bold('?')} Accept "${file.name}" (${formatFileSize(file.size)})? ${chalk.gray('(y/n/a)')} `
      );
      const choice = answer.trim().toLowerCase();
      if (choice === 'a') {
        acceptAll = true;
        status = 'accepted';
        console.log(chalk.green(`  \u2714 Accepting all remaining files`));
      } else if (choice === 'y') {
        status = 'accepted';
      } else {
        status = 'rejected';
      }
    }
    decisions.push({ name: file.name, size: file.size, status });
    onDecision({ name: file.name, status });
  }

  rl.close();
  return decisions;
}

export function printUploadProgress(filename, percent) {
  const barLen = 25;
  const filled = Math.round(barLen * percent / 100);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barLen - filled);
  const color = percent === 100 ? chalk.green : chalk.cyan;
  process.stdout.write(`\r  ${filename.padEnd(25)} ${color(bar)} ${percent.toFixed(0).padStart(3)}%`);
  if (percent === 100) process.stdout.write('\n');
}
