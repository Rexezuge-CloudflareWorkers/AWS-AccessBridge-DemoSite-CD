import { describe, expect, it, vi } from 'vitest';
import { AccessBridgeWorker } from '@/workers/AccessBridgeWorker';

type TestEnv = Env & {
  SERVE_SPA_FROM_WORKER?: string | undefined;
};

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

function createEnv(overrides: Partial<TestEnv> = {}): Env {
  return {
    ...overrides,
  } as Env;
}

describe('AccessBridgeWorker', () => {
  describe('SPA catch-all', () => {
    it('does not serve the SPA by default', async () => {
      const worker = new AccessBridgeWorker();

      const response: Response = await worker.fetch(new Request('https://worker.example.com/'), createEnv(), createExecutionContext());

      expect(response.status).toBe(404);
    });

    it('serves the SPA when SERVE_SPA_FROM_WORKER is enabled', async () => {
      const worker = new AccessBridgeWorker();

      const response: Response = await worker.fetch(
        new Request('https://worker.example.com/'),
        createEnv({ SERVE_SPA_FROM_WORKER: 'true' }),
        createExecutionContext(),
      );

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toContain('AWS AccessBridge');
    });
  });
});
