import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { userRepository } from '@/server/repositories/userRepository';
import { hashPassword } from '@/server/lib/password';
import * as authService from '@/server/domain/auth/authService';
import { GET as listsGet, POST as listsPost } from '@/app/api/lists/route';
import { DELETE as listDelete } from '@/app/api/lists/[id]/route';

function jsonRequest(url: string, init?: { method?: string; body?: unknown; token?: string }): NextRequest {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (init?.token) headers.set('Authorization', `Bearer ${init.token}`);
  return new NextRequest(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

describe('API route: /api/lists (auth middleware + handler wiring)', () => {
  let token: string;

  beforeAll(async () => {
    const s = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await hashPassword('password123');
    await userRepository.create({ username: `route-test-${s}`, passwordHash, displayName: 'Route Test', role: 'FAMILY' });
    const result = await authService.login(`route-test-${s}`, 'password123', {});
    token = result.token;
  });

  it('GET without any credentials returns 401', async () => {
    const response = await listsGet(jsonRequest('http://localhost/api/lists'), {});
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET with a Bearer token returns 200 and an items array', async () => {
    const response = await listsGet(jsonRequest('http://localhost/api/lists', { token }), {});
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST creates a list, and it is returned by a subsequent GET', async () => {
    const createResponse = await listsPost(
      jsonRequest('http://localhost/api/lists', { method: 'POST', token, body: { name: 'ルートテスト用リスト' } }),
      {}
    );
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.name).toBe('ルートテスト用リスト');

    const listResponse = await listsGet(jsonRequest('http://localhost/api/lists', { token }), {});
    const body = await listResponse.json();
    expect(body.items.some((l: { id: string }) => l.id === created.id)).toBe(true);

    const deleteResponse = await listDelete(jsonRequest(`http://localhost/api/lists/${created.id}`, { method: 'DELETE', token }), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(deleteResponse.status).toBe(200);
  });

  it('rejects a malformed body with 400 VALIDATION_ERROR', async () => {
    const response = await listsPost(
      jsonRequest('http://localhost/api/lists', { method: 'POST', token, body: { name: '' } }),
      {}
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
