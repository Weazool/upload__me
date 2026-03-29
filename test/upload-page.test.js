import { describe, it, expect } from 'vitest';
import { getUploadPageHtml } from '../upload-page.js';

describe('upload-page', () => {
  const token = 'testtoken123';
  const expiresAt = Date.now() + 900000;

  it('returns valid HTML with doctype', () => {
    const html = getUploadPageHtml({ token, expiresAt });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('embeds the token in the page for API calls', () => {
    const html = getUploadPageHtml({ token, expiresAt });
    expect(html).toContain(token);
  });

  it('embeds the expiry timestamp', () => {
    const html = getUploadPageHtml({ token, expiresAt });
    expect(html).toContain(String(expiresAt));
  });

  it('contains required UI elements', () => {
    const html = getUploadPageHtml({ token, expiresAt });
    expect(html).toContain('drag');
    expect(html).toContain('Submit');
    expect(html).toContain('EventSource');
    expect(html).toContain('XMLHttpRequest');
  });

  it('contains no external resource references', () => {
    const html = getUploadPageHtml({ token, expiresAt });
    expect(html).not.toMatch(/href="https?:/);
    expect(html).not.toMatch(/src="https?:/);
  });
});
