import { AssumableRolesDAO, ResourceInventoryDAO } from '@/dao';
import { IActivityAPIRoute } from '@/endpoints/IActivityAPIRoute';
import type { ActivityContext, IEnv, IRequest, IResponse } from '@/endpoints/IActivityAPIRoute';
import type { ResourceInventoryItem } from '@/model';

class ListResourcesRoute extends IActivityAPIRoute<ListResourcesRequest, ListResourcesResponse, IEnv> {
  schema = {
    tags: ['Resources'],
    summary: 'List Resources',
    description: 'Paginated resource list with filters. Only shows resources in accounts the user has access to.',
    parameters: [
      { name: 'type', in: 'query' as const, required: false, schema: { type: 'string' as const } },
      { name: 'accountId', in: 'query' as const, required: false, schema: { type: 'string' as const } },
      { name: 'search', in: 'query' as const, required: false, schema: { type: 'string' as const } },
      { name: 'limit', in: 'query' as const, required: false, schema: { type: 'integer' as const, default: 50 } },
      { name: 'offset', in: 'query' as const, required: false, schema: { type: 'integer' as const, default: 0 } },
    ],
    responses: { '200': { description: 'Resource list' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleRequest(
    _request: ListResourcesRequest,
    env: IEnv,
    cxt: ActivityContext<IEnv>,
  ): Promise<ListResourcesResponse> {
    const userEmail: string = this.getAuthenticatedUserEmailAddress(cxt);
    const url: URL = new URL(cxt.req.url);

    const assumableRolesDAO: AssumableRolesDAO = new AssumableRolesDAO(env.AccessBridgeDB);
    let accountIds: string[] = await assumableRolesDAO.getDistinctAccountIds(userEmail);

    const filterAccountId: string | null = url.searchParams.get('accountId');
    if (filterAccountId && accountIds.includes(filterAccountId)) {
      accountIds = [filterAccountId];
    }

    const resourceDAO: ResourceInventoryDAO = new ResourceInventoryDAO(env.AccessBridgeDB);
    const { items, total } = await resourceDAO.searchResources(
      accountIds,
      url.searchParams.get('search') || undefined,
      url.searchParams.get('type') || undefined,
      Math.min(parseInt(url.searchParams.get('limit') || '50'), 200),
      Math.max(parseInt(url.searchParams.get('offset') || '0'), 0),
    );

    return { items, total };
  }
}

type ListResourcesRequest = IRequest;
interface ListResourcesResponse extends IResponse { items: ResourceInventoryItem[]; total: number; }

export { ListResourcesRoute };
