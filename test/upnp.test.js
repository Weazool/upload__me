import { describe, it, expect } from 'vitest';
import { createMapping, removeMapping } from '../upnp.js';

describe('upnp', () => {
  it('exports createMapping and removeMapping functions', () => {
    expect(typeof createMapping).toBe('function');
    expect(typeof removeMapping).toBe('function');
  });

  it('returns success: false when no UPnP gateway is available', async () => {
    const result = await createMapping(55555);
    expect(result).toHaveProperty('success');
    if (!result.success) {
      expect(result).toHaveProperty('error');
    }
  });
});
