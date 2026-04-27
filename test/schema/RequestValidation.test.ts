import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/error';
import { getRequestInputSchema, validateRequestInput } from '@/schema';

describe('Request input schemas', () => {
  it('finds schemas by method and pathname', () => {
    const request = new Request('https://access-bridge.example.com/api/user/favorites', { method: 'POST' });

    expect(getRequestInputSchema(request)).toBeDefined();
  });

  it('returns a sanitized body for valid input', async () => {
    const request = new Request('https://access-bridge.example.com/api/user/favorites', { method: 'POST' });

    await expect(validateRequestInput(request, { awsAccountId: '123456789012', ignored: true })).resolves.toEqual({
      awsAccountId: '123456789012',
    });
  });

  it('rejects invalid body data', async () => {
    const request = new Request('https://access-bridge.example.com/api/user/favorites', { method: 'POST' });

    await expect(validateRequestInput(request, { awsAccountId: 'not-an-account' })).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects invalid query data', async () => {
    const request = new Request('https://access-bridge.example.com/api/resources?limit=not-a-number', { method: 'GET' });

    await expect(validateRequestInput(request, {})).rejects.toBeInstanceOf(BadRequestError);
  });

  it('requires console role context fields to be paired', async () => {
    const request = new Request('https://access-bridge.example.com/api/aws/console', { method: 'POST' });

    await expect(
      validateRequestInput(request, {
        accessKeyId: 'ASIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'secret',
        awsAccountId: '123456789012',
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
