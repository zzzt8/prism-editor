/**
 * M2-B Test 2 â€?`resolveTemplateVersion` honors `current` vs explicit version.
 */

import { describe, it, expect } from 'vitest';

import {
  resolveTemplateVersion,
  InMemoryTemplateVersionCatalog,
} from '../../flow-resolver';
import { FlowResolverError } from '../../errors';
import { makeFlow, makeTemplateVersion } from './fixtures';

describe('M2-B / resolveTemplateVersion â€?current vs explicit', () => {
  it('returns the catalog-marked current version when version is omitted', () => {
    const cat = new InMemoryTemplateVersionCatalog();
    const v100 = makeTemplateVersion([], '1.0.0');
    const v200 = makeTemplateVersion([], '2.0.0');
    cat.add(v100, true);
    cat.add(v200, true); // first add wins the current pointer
    const got = resolveTemplateVersion('tmpl.m2-b-test', undefined, cat);
    expect(got.version).toBe('1.0.0');
  });

  it('returns the explicit version when version is provided', () => {
    const cat = new InMemoryTemplateVersionCatalog();
    const v100 = makeTemplateVersion([], '1.0.0');
    const v200 = makeTemplateVersion([], '2.0.0');
    cat.add(v100, true);
    cat.add(v200, false);
    const got = resolveTemplateVersion('tmpl.m2-b-test', '2.0.0', cat);
    expect(got.version).toBe('2.0.0');
  });

  it('throws TEMPLATE_VERSION_NOT_FOUND when no version matches', () => {
    const cat = new InMemoryTemplateVersionCatalog();
    cat.add(makeTemplateVersion([makeFlow({
      flowKey: 'production.print' as never,
      explicitOutputs: [{ slot: 'production.print', nodeId: 'export-3' }],
    })], '1.0.0'), true);
    expect(() => resolveTemplateVersion('tmpl.m2-b-test', '9.9.9', cat))
      .toThrow(FlowResolverError);
    try {
      resolveTemplateVersion('tmpl.m2-b-test', '9.9.9', cat);
    } catch (err) {
      expect((err as FlowResolverError).code).toBe('TEMPLATE_VERSION_NOT_FOUND');
    }
  });

  it('throws TEMPLATE_VERSION_NOT_FOUND when no catalog is injected', () => {
    expect(() => resolveTemplateVersion('tmpl.m2-b-test', '1.0.0'))
      .toThrow(FlowResolverError);
  });
});
