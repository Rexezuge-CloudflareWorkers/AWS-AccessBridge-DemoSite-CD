import {
  CF_CONNECTING_IP_HEADER,
  API_WORKER_BASE_HOSTNAME,
  FORWARDED_FOR_HEADER,
  FORWARDED_HOST_HEADER,
  FORWARDED_PROTO_HEADER,
  FORWARDED_URI_HEADER,
} from '../src/constants';

interface PagesProxyEnv {
  API_WORKER: Fetcher;
}

export const proxyToApi: PagesFunction<PagesProxyEnv> = async ({ request, env }) => {
  const originalUrl: URL = new URL(request.url);
  const internalUrl: URL = new URL(request.url);

  internalUrl.protocol = 'https:';
  internalUrl.hostname = API_WORKER_BASE_HOSTNAME;
  internalUrl.port = '';

  const headers: Headers = new Headers(request.headers);
  headers.set(FORWARDED_HOST_HEADER, originalUrl.host);
  headers.set(FORWARDED_PROTO_HEADER, originalUrl.protocol.replace(':', ''));
  headers.set(FORWARDED_URI_HEADER, `${originalUrl.pathname}${originalUrl.search}`);

  const clientIp: string | null = request.headers.get(CF_CONNECTING_IP_HEADER);
  if (clientIp) {
    headers.set(FORWARDED_FOR_HEADER, clientIp);
  }

  return env.API_WORKER.fetch(
    new Request(internalUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: request.redirect,
    }),
  );
};

export const onRequest: PagesFunction<PagesProxyEnv> = proxyToApi;
