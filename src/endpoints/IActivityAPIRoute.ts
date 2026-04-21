import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { BaseUrlUtil } from '@/utils';
import { DefaultInternalServerError, InternalServerError, IServiceError } from '@/error';
import { D1_SESSION_CONSTRAINT_FIRST_UNCONSTRAINED, DEFAULT_DEMO_MODE } from '@/constants';

abstract class IActivityAPIRoute<TRequest extends IRequest, TResponse extends IResponse, TEnv extends IEnv> extends OpenAPIRoute {
  async handle(c: ActivityContext<TEnv>) {
    try {
      let body: unknown = {};
      try {
        body = await c.req.json();
      } catch {
        body = {};
      }
      const request: TRequest = { ...(body as TRequest), raw: c.req };
      const env: TEnv = { ...(c.env as TEnv), AccessBridgeDB: c.env.AccessBridgeDB.withSession(D1_SESSION_CONSTRAINT_FIRST_UNCONSTRAINED) };
      const response: TResponse | ExtendedResponse<TResponse> = await this.handleRequest(request, env, c);
      if (response && typeof response === 'object' && ('body' in response || 'statusCode' in response || 'headers' in response)) {
        const extendedResponse: ExtendedResponse<TResponse> = response as ExtendedResponse<TResponse>;
        const statusCode: number = extendedResponse.statusCode || 200;
        const headers: Record<string, string> = extendedResponse.headers || {};
        Object.entries(headers).forEach(([key, value]) => {
          c.header(key, value);
        });
        c.status(statusCode as StatusCode);
        if (statusCode >= 300 && statusCode < 400) {
          return c.body(null);
        }
        return c.json(extendedResponse.body);
      }
      return c.json(response);
    } catch (error: unknown) {
      if (error instanceof IServiceError && !(error instanceof InternalServerError)) {
        console.warn(`Responding with ${error.getErrorType()}Error: `, error.stack);
        return c.json({ Exception: { Type: error.getErrorType(), Message: error.getErrorMessage() } }, error.getErrorCode());
      }
      if (!(error instanceof IServiceError) || error instanceof InternalServerError) {
        console.error('Caught service error during execution: ', error);
      }
      console.warn('Responding with DefaultInternalServerError: ', DefaultInternalServerError);
      return c.json(
        {
          Exception: { Type: DefaultInternalServerError.getErrorType(), Message: DefaultInternalServerError.getErrorMessage() },
        },
        DefaultInternalServerError.getErrorCode(),
      );
    }
  }

  protected abstract handleRequest(
    request: TRequest,
    env: TEnv,
    cxt: ActivityContext<TEnv>,
  ): Promise<TResponse | ExtendedResponse<TResponse>>;

  protected getAuthenticatedUserEmailAddress(c: ActivityContext<TEnv>): string {
    return c.get('AuthenticatedUserEmailAddress');
  }

  protected getBaseUrl(c: ActivityContext<TEnv>): string {
    return BaseUrlUtil.getBaseUrl(c.req.raw);
  }

  protected isDemoMode(c: ActivityContext<TEnv>): boolean {
    const env: TEnv = c.env as TEnv;
    return (env.DEMO_MODE || DEFAULT_DEMO_MODE) === 'true';
  }
}

interface IRequest {
  raw: Request;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface IResponse {}

interface ExtendedResponse<TResponse extends IResponse> {
  body?: TResponse | undefined;
  statusCode?: StatusCode | undefined;
  headers?: Record<string, string> | undefined;
}

interface IEnv {
  TEAM_DOMAIN?: string | undefined;
  POLICY_AUD?: string | undefined;
  DEMO_MODE?: string | undefined;
  Variables: {
    AuthenticatedUserEmailAddress: string;
  };
  AccessBridgeDB: D1DatabaseSession;
}

type ActivityContext<TEnv extends IEnv> = Context<{ Bindings: Env } & TEnv>;

export { IActivityAPIRoute };
export type { IRequest, IResponse, IEnv, ActivityContext, ExtendedResponse };
