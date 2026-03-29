import { describe, it, expect } from 'vitest';
import { generateToken, generatePort, validateFolder } from '../index.js';
import os from 'node:os';

describe('index', () => {
  describe('generateToken', () => {
    it('returns a 32-char hex string', () => {
      const token = generateToken();
      expect(token).toMatch(/^[a-f0-9]{32}$/);
    });
    it('returns unique values', () => {
      expect(generateToken()).not.toBe(generateToken());
    });
  });

  describe('generatePort', () => {
    it('returns a port between 50000 and 60000', () => {
      for (let i = 0; i < 100; i++) {
        const port = generatePort();
        expect(port).toBeGreaterThanOrEqual(50000);
        expect(port).toBeLessThanOrEqual(60000);
      }
    });
  });

  describe('validateFolder', () => {
    it('accepts a valid writable directory', () => {
      const result = validateFolder(os.tmpdir());
      expect(result.valid).toBe(true);
    });
    it('rejects non-existent path', () => {
      const result = validateFolder('/nonexistent/path/xyz123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });
    it('rejects a file path', () => {
      const result = validateFolder('./package.json');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a directory');
    });
  });
});
