import { describe, it, expect } from 'vitest';
import { EmailValidationUtil } from '@/utils/EmailValidationUtil';
import { InternalServerError, UnauthorizedError } from '@/error';
import { INTERNAL_USER_EMAIL_HEADER, SELF_WORKER_BASE_HOSTNAME } from '@/constants';

describe('EmailValidationUtil', () => {
  describe('getAuthenticatedUserEmail', () => {
    it('returns email from internal header for self-worker requests', async () => {
      const request = new Request(`https://${SELF_WORKER_BASE_HOSTNAME}/api/test`, {
        headers: { [INTERNAL_USER_EMAIL_HEADER]: 'internal@example.com' },
      });
      const email = await EmailValidationUtil.getAuthenticatedUserEmail(request);
      expect(email).toBe('internal@example.com');
    });

    it('throws InternalServerError for self-worker request without internal email header', async () => {
      const request = new Request(`https://${SELF_WORKER_BASE_HOSTNAME}/api/test`);
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(InternalServerError);
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(
        'Internal call missing required user email header.',
      );
    });

    it('does not authenticate using the Cloudflare Access email header', async () => {
      const request = new Request('https://worker.example.com/api/test', {
        headers: { 'Cf-Access-Authenticated-User-Email': 'user@example.com' },
      });
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(UnauthorizedError);
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(
        'No Cloudflare Access JWT token provided in request headers.',
      );
    });

    it('throws UnauthorizedError when no JWT token is present', async () => {
      const request = new Request('https://worker.example.com/api/test');
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(UnauthorizedError);
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(
        'No Cloudflare Access JWT token provided in request headers.',
      );
    });

    it('throws UnauthorizedError when JWT token present but missing config', async () => {
      const request = new Request('https://worker.example.com/api/test', {
        headers: { 'cf-access-jwt-assertion': 'some-jwt-token' },
      });
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(UnauthorizedError);
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request)).rejects.toThrow(
        'Missing required JWT verification configuration.',
      );
    });

    it('throws UnauthorizedError when JWT token present but teamDomain missing', async () => {
      const request = new Request('https://worker.example.com/api/test', {
        headers: { 'cf-access-jwt-assertion': 'some-jwt-token' },
      });
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request, undefined, 'some-aud')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when multiple JWT audiences are configured', async () => {
      const request = new Request('https://worker.example.com/api/test', {
        headers: { 'cf-access-jwt-assertion': 'some-jwt-token' },
      });
      await expect(EmailValidationUtil.getAuthenticatedUserEmail(request, 'https://team.example.com', 'aud-one,aud-two')).rejects.toThrow(
        'Multiple JWT audiences are not supported. Configure a single POLICY_AUD value.',
      );
    });
  });
});
