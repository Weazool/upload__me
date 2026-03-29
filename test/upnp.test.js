import { describe, it, expect } from 'vitest';
import { createMapping, removeMapping } from '../upnp.js';

describe('upnp', () => {
  it('exports createMapping and removeMapping functions', () => {
    expect(typeof createMapping).toBe('function');
    expect(typeof removeMapping).toBe('function');
  });
});
