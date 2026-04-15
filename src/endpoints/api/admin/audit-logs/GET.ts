import { AuditLogDAO } from '@/dao/AuditLogDAO';
import type { AuditLogQueryFilters } from '@/dao/AuditLogDAO';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { ActivityContext, IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';
import type { AuditLog } from '@/model';

class ListAuditLogsRoute extends IAdminActivityAPIRoute<ListAuditLogsRequest, ListAuditLogsResponse, ListAuditLogsEnv> {
  schema = {
    tags: ['Admin'],
    summary: 'Query Audit Logs',
    description: 'Query audit logs with optional filters for user email, action type, and time range. Results are paginated.',
    parameters: [
      { name: 'userEmail', in: 'query' as const, required: false, schema: { type: 'string' as const } },
      { name: 'action', in: 'query' as const, required: false, schema: { type: 'string' as const } },
      { name: 'startTime', in: 'query' as const, required: false, schema: { type: 'integer' as const } },
      { name: 'endTime', in: 'query' as const, required: false, schema: { type: 'integer' as const } },
      { name: 'limit', in: 'query' as const, required: false, schema: { type: 'integer' as const, minimum: 1, maximum: 200, default: 50 } },
      { name: 'offset', in: 'query' as const, required: false, schema: { type: 'integer' as const, minimum: 0, default: 0 } },
    ],
    responses: {
      '200': {
        description: 'Paginated audit log results',
        content: {
          'application/json': {
            schema: {
              type: 'object' as const,
              properties: {
                logs: { type: 'array' as const, items: { type: 'object' as const } },
                total: { type: 'integer' as const },
              },
            },
          },
        },
      },
    },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleAdminRequest(
    request: ListAuditLogsRequest,
    env: ListAuditLogsEnv,
    cxt: ActivityContext<ListAuditLogsEnv>,
  ): Promise<ListAuditLogsResponse> {
    const url: URL = new URL(cxt.req.url);
    const filters: AuditLogQueryFilters = {
      userEmail: url.searchParams.get('userEmail') || undefined,
      action: url.searchParams.get('action') || undefined,
      startTime: url.searchParams.get('startTime') ? parseInt(url.searchParams.get('startTime')!) : undefined,
      endTime: url.searchParams.get('endTime') ? parseInt(url.searchParams.get('endTime')!) : undefined,
    };
    const limit: number = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 1), 200);
    const offset: number = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

    const auditLogDAO: AuditLogDAO = new AuditLogDAO(env.AccessBridgeDB);
    const { logs, total } = await auditLogDAO.query(filters, limit, offset);
    return { logs, total };
  }
}

type ListAuditLogsRequest = IRequest;

interface ListAuditLogsResponse extends IResponse {
  logs: AuditLog[];
  total: number;
}

type ListAuditLogsEnv = IAdminEnv;

export { ListAuditLogsRoute };
