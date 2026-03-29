import { describe, it, expect } from 'vitest';
import { formatFileList, formatFileSize } from '../console-ui.js';
import { reviewFiles } from '../console-ui.js';
import { Readable } from 'node:stream';

describe('console-ui', () => {
  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });
    it('formats kilobytes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });
    it('formats megabytes', () => {
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });
    it('formats gigabytes', () => {
      expect(formatFileSize(1288490188)).toBe('1.2 GB');
    });
  });

  describe('formatFileList', () => {
    it('returns formatted lines for each file', () => {
      const files = [
        { name: 'photo.jpg', size: 2500000 },
        { name: 'report.pdf', size: 860000 },
      ];
      const lines = formatFileList(files);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('1.');
      expect(lines[0]).toContain('photo.jpg');
      expect(lines[0]).toContain('2.4 MB');
      expect(lines[1]).toContain('2.');
      expect(lines[1]).toContain('report.pdf');
    });
  });

  describe('reviewFiles', () => {
    it('accepts and rejects files based on input', async () => {
      const input = new Readable({ read() {} });
      const files = [
        { name: 'a.txt', size: 100 },
        { name: 'b.txt', size: 200 },
      ];
      const decisions = [];
      const promise = reviewFiles(files, (d) => decisions.push(d), input);

      setTimeout(() => input.push('y\n'), 50);
      setTimeout(() => input.push('n\n'), 100);
      setTimeout(() => input.push(null), 150);

      const result = await promise;
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('accepted');
      expect(result[1].status).toBe('rejected');
      expect(decisions).toHaveLength(2);
    });

    it('accept-all shortcut works', async () => {
      const input = new Readable({ read() {} });
      const files = [
        { name: 'a.txt', size: 100 },
        { name: 'b.txt', size: 200 },
        { name: 'c.txt', size: 300 },
      ];
      const promise = reviewFiles(files, () => {}, input);

      setTimeout(() => input.push('a\n'), 50);
      setTimeout(() => input.push(null), 100);

      const result = await promise;
      expect(result.every((r) => r.status === 'accepted')).toBe(true);
    });
  });
});
