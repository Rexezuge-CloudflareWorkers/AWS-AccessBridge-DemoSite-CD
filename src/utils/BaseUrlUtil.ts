import { INTERNAL_BASE_URL_HEADER, SELF_WORKER_BASE_HOSTNAME } from '@/constants';
import { InternalServerError } from '@/error';
import { RequestOriginUtil } from './RequestOriginUtil';

class BaseUrlUtil {
  static getBaseUrl(request: Request, env?: unknown): string {
    const url: URL = new URL(request.url);
    if (url.hostname === SELF_WORKER_BASE_HOSTNAME) {
      const internalBaseUrl: string | null = request.headers.get(INTERNAL_BASE_URL_HEADER);
      if (internalBaseUrl) {
        return internalBaseUrl;
      }
      throw new InternalServerError('Internal call missing required base URL header.');
    }
    const trustedForwardedOrigin: string | undefined = RequestOriginUtil.getTrustedForwardedOrigin(request, env);
    if (trustedForwardedOrigin) {
      return trustedForwardedOrigin;
    }
    return url.origin;
  }
}

export { BaseUrlUtil };
