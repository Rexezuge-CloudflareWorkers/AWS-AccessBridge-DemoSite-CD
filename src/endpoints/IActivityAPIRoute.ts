import { OpenAPIRoute } from 'chanfana';
import { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { EmailValidationUtil, TokenAuthUtil, BaseUrlUtil } from '@/utils';
import { DefaultInternalServerError, InternalServerError, IServiceError } from '@/error';
import { D1_SESSION_CONSTRAINT_FIRST_UNCONSTRAINED, DEMO_USER_EMAIL, DEFAULT_DEMO_MODE } from '@/constants';
import { AUDIT_ACTIONS } from '@/constants/AuditActions';
import { AuditLogDAO } from '@/dao/AuditLogDAO';

abstract class IActivityAPIRoute<TRequest extends IRequest, TResponse extends IResponse, TEnv extends IEnv> extends OpenAPIRoute {
  async handle(c: ActivityContext<TEnv>) {
    let userEmail: string = 'unknown';
    let statusCode: number = 200;

    try {
      userEmail = await this.authenticateUserIdentity(c);
      c.set('AuthenticatedUserEmailAddress', userEmail);
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
        statusCode = extendedResponse.statusCode || 200;
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
        statusCode = error.getErrorCode();
        console.warn(`Responding with ${error.getErrorType()}Error: `, error.stack);
        return c.json({ Exception: { Type: error.getErrorType(), Message: error.getErrorMessage() } }, error.getErrorCode());
      }
      if (!(error instanceof IServiceError) || error instanceof InternalServerError) {
        console.error('Caught service error during execution: ', error);
      }
      statusCode = DefaultInternalServerError.getErrorCode();
      console.warn('Responding with DefaultInternalServerError: ', DefaultInternalServerError);
      return c.json(
        {
          Exception: { Type: DefaultInternalServerError.getErrorType(), Message: DefaultInternalServerError.getErrorMessage() },
        },
        DefaultInternalServerError.getErrorCode(),
      );
    } finally {
      try {
        const method: string = c.req.method;
        const url: URL = new URL(c.req.url);
        const path: string = url.pathname;
        const action: string = AUDIT_ACTIONS[`${method}:${path}`] || `${method}:${path}`;
        const ipAddress: string | undefined = c.req.header('CF-Connecting-IP');
        const userAgentHeader: string | undefined = c.req.header('User-Agent');

        const auditLogDAO: AuditLogDAO = new AuditLogDAO(c.env.AccessBridgeDB);
        c.executionCtx.waitUntil(
          auditLogDAO.create(userEmail, action, method, path, statusCode, undefined, undefined, ipAddress, userAgentHeader),
        );
      } catch {
        console.warn('Failed to write audit log');
      }
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
    return (c.env.DEMO_MODE || DEFAULT_DEMO_MODE) === 'true';
  }

  private async authenticateUserIdentity(c: ActivityContext<TEnv>): Promise<string> {
    if (this.isDemoMode(c)) {
      return DEMO_USER_EMAIL;
    }
    const authHeader: string | undefined = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token: string = authHeader.substring(7);
      return await TokenAuthUtil.authenticateWithPAT(token, c.env.AccessBridgeDB);
    }
    return await EmailValidationUtil.getAuthenticatedUserEmail(c.req.raw, c.env.TEAM_DOMAIN, c.env.POLICY_AUD);
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
