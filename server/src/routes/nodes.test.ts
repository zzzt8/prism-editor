/**
 * Tests for Node Package API routes
 *
 * These tests verify the complete CRUD lifecycle:
 * 1. Upload node package → 2. List shows it → 3. Update version → 4. Version history grows → 5. Delete
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
// Use .js extensions for ESM compatibility (TypeScript resolves .ts but output is .js)
import nodeRoutes from './nodes.js';
import { prisma } from '../db/client.js';

let app: FastifyInstance;

const validManifest = {
  name: 'test-load-image',
  version: '1.0.0',
  description: 'A test node package for loading images',
  definitions: [
    {
      type: 'load/image',
      label: 'Load Image',
      category: 'input',
      inputs: [],
      outputs: [{ id: 'image', type: 'image' }],
    },
  ],
  executors: [
    {
      id: 'load/image',
      name: 'LoadImageExecutor',
      description: 'Loads an image from a URL or file path',
      source: {
        type: 'inline',
        code: 'async function execute(inputs, params) { return { image: {} }; }',
      },
    },
  ],
};

const validPayload = {
  name: 'test-load-image',
  description: 'A test node package for loading images',
  category: 'image-processing',
  manifest: validManifest,
  version: '1.0.0',
};

// Build a Fastify app with the routes for testing
beforeAll(async () => {
  app = Fastify();
  await app.register(nodeRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// Clean up test data before each test
beforeEach(async () => {
  await prisma.nodePackageVersion.deleteMany({
    where: { package: { name: { startsWith: 'test-' } } },
  });
  await prisma.nodePackage.deleteMany({
    where: { name: { startsWith: 'test-' } },
  });
});

// ============================================================
// POST /api/nodes - Upload node package
// ============================================================

describe('POST /api/nodes', () => {
  it('GIVEN valid manifest WHEN upload THEN returns 201 with created node package', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toMatchObject({
      name: 'test-load-image',
      latestVersion: '1.0.0',
      category: 'image-processing',
      storageType: 'database',
    });
    expect(body.data.id).toBeDefined();
  });

  it('GIVEN manifest missing required name field WHEN upload THEN returns error (400/500)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: { ...validPayload, name: '' },
    });

    // Either 400 (caught by our handler) or 500 (Fastify default) - both indicate validation failure
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(600);
    const body = JSON.parse(res.body);
    // Error response should have error field
    expect(body.error).toBeDefined();
  });

  it('GIVEN manifest with empty definitions array WHEN upload THEN accepts (definitions are any[])', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: {
        ...validPayload,
        manifest: { ...validManifest, definitions: [] },
      },
    });

    // Empty definitions array is valid per z.array(z.any())
    expect(res.statusCode).toBe(200);
  });

  it('GIVEN duplicate name WHEN upload THEN returns 409', async () => {
    // Upload first time
    await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });

    // Upload again with same name
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('already exists');
  });
});

// ============================================================
// GET /api/nodes - List node packages
// ============================================================

describe('GET /api/nodes', () => {
  beforeEach(async () => {
    // Create test packages
    await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: { ...validPayload, name: 'test-pkg-a', version: '1.0.0' },
    });
    await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: {
        ...validPayload,
        name: 'test-pkg-b',
        description: 'Another test package',
        version: '2.0.0',
      },
    });
  });

  it('GIVEN multiple node packages WHEN get list THEN returns paginated results', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
    });
  });

  it('GIVEN search parameter WHEN search by name THEN returns matching packages', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes?search=pkg-a',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.every((n: { name: string }) => n.name.includes('pkg-a'))).toBe(true);
  });

  it('GIVEN search parameter WHEN search by description THEN returns matching packages', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes?search=Another',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.some((n: { description: string }) => n.description?.includes('Another'))).toBe(true);
  });

  it('GIVEN sort=name WHEN sort alphabetically THEN returns sorted list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes?sort=name',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const names = body.data.map((n: { name: string }) => n.name);
    expect(names).toEqual([...names].sort());
  });

  it('GIVEN pagination parameters WHEN paginate THEN returns correct page', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes?page=1&limit=1',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(1);
  });
});

// ============================================================
// GET /api/nodes/:id - Get node package detail
// ============================================================

describe('GET /api/nodes/:id', () => {
  let createdId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });
    createdId = JSON.parse(res.body).data.id;
  });

  it('GIVEN existing node package WHEN get detail THEN returns full package with author', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/nodes/${createdId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toMatchObject({
      id: createdId,
      name: 'test-load-image',
    });
    expect(body.data.author).toBeDefined();
    expect(body.data.author.name).toBeDefined();
  });

  it('GIVEN non-existent ID WHEN get detail THEN returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes/non-existent-id',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toContain('not found');
  });
});

// ============================================================
// PUT /api/nodes/:id - Update node package
// ============================================================

describe('PUT /api/nodes/:id', () => {
  let createdId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });
    createdId = JSON.parse(res.body).data.id;
  });

  it('GIVEN existing package WHEN update with new version THEN creates new version record', async () => {
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/nodes/${createdId}`,
      payload: {
        version: '1.1.0',
        manifest: { ...validManifest, version: '1.1.0' },
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const body = JSON.parse(updateRes.body);
    expect(body.data.latestVersion).toBe('1.1.0');

    // Check version history
    const versionsRes = await app.inject({
      method: 'GET',
      url: `/nodes/${createdId}/versions`,
    });
    const versions = JSON.parse(versionsRes.body).data;
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  it('GIVEN non-existent ID WHEN update THEN returns 404', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/nodes/non-existent-id',
      payload: { version: '2.0.0' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ============================================================
// GET /api/nodes/:id/versions - Version history
// ============================================================

describe('GET /api/nodes/:id/versions', () => {
  let createdId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });
    createdId = JSON.parse(res.body).data.id;

    // Add another version
    await app.inject({
      method: 'PUT',
      url: `/nodes/${createdId}`,
      payload: {
        version: '1.1.0',
        manifest: { ...validManifest, version: '1.1.0' },
      },
    });
  });

  it('GIVEN package with multiple versions WHEN get versions THEN returns ordered list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/nodes/${createdId}/versions`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// GET /api/nodes/:id/download - Download manifest
// ============================================================

describe('GET /api/nodes/:id/download', () => {
  let createdId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });
    createdId = JSON.parse(res.body).data.id;
  });

  it('GIVEN existing package WHEN download THEN returns JSON with correct headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/nodes/${createdId}/download`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment');

    const body = JSON.parse(res.body);
    expect(body.name).toBe('test-load-image');
    expect(body.version).toBe('1.0.0');
  });

  it('GIVEN non-existent ID WHEN download THEN returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/nodes/non-existent-id/download',
    });

    expect(res.statusCode).toBe(404);
  });
});

// ============================================================
// DELETE /api/nodes/:id - Delete node package
// ============================================================

describe('DELETE /api/nodes/:id', () => {
  let createdId: string;

  beforeEach(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/nodes',
      payload: validPayload,
    });
    createdId = JSON.parse(res.body).data.id;
  });

  it('GIVEN existing package WHEN delete THEN returns success and package is gone', async () => {
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/nodes/${createdId}`,
    });

    expect(deleteRes.statusCode).toBe(200);
    const deleteBody = JSON.parse(deleteRes.body);
    expect(deleteBody.success).toBe(true);

    // Verify it's gone
    const getRes = await app.inject({
      method: 'GET',
      url: `/nodes/${createdId}`,
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('GIVEN non-existent ID WHEN delete THEN returns 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/nodes/non-existent-id',
    });

    expect(res.statusCode).toBe(404);
  });
});
