import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AccessBridgeWorker } from '@/workers';

const worker = new AccessBridgeWorker();

async function handler(request: Request) {
  const { env, ctx } = await getCloudflareContext();
  return worker.fetch(request, env as unknown as Env, ctx);
}

export const GET = handler;
