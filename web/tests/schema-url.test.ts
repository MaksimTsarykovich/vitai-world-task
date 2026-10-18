import { describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl } from '@/lib/schema.mjs';

describe('normalizeDatabaseUrl', () => {
  it('пустое значение — missing', () => {
    expect(normalizeDatabaseUrl(undefined)).toEqual({ kind: 'missing' });
    expect(normalizeDatabaseUrl('')).toEqual({ kind: 'missing' });
    expect(normalizeDatabaseUrl('   ')).toEqual({ kind: 'missing' });
  });

  it('путь без схемы нормализуется в file:-URL', () => {
    expect(normalizeDatabaseUrl('./data/kvarta.db')).toEqual({
      kind: 'url',
      url: 'file:./data/kvarta.db',
      normalized: true,
    });
    expect(normalizeDatabaseUrl('/data/kvarta.db')).toEqual({
      kind: 'url',
      url: 'file:/data/kvarta.db',
      normalized: true,
    });
  });

  it('URL с известной схемой не трогает', () => {
    for (const url of [
      'file:/data/kvarta.db',
      'libsql://kvarta-example.turso.io',
      'https://kvarta-example.turso.io',
    ]) {
      expect(normalizeDatabaseUrl(url)).toEqual({ kind: 'url', url, normalized: false });
    }
  });
});
