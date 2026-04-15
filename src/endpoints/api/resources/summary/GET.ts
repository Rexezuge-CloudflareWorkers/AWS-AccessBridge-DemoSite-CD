import { AssumableRolesDAO, ResourceInventoryDAO } from '@/dao';
import { IActivityAPIRoute } from '@/endpoints/IActivityAPIRoute';
import type { ActivityContext, IEnv, IRequest, IResponse } from '@/endpoints/IActivityAPIRoute';

class GetResourceSummaryRoute extends IActivityAPIRoute<GetResourceSummaryRequest, GetResourceSummaryResponse, IEnv> {
  schema = {
    tags: ['Resources'],
    summary: 'Get Resource Summary',
    description: 'Resource counts by type and account for dashboard cards.',
    responses: { '200': { description: 'Resource summary' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleRequest(
    _request: GetResourceSummaryRequest,
    env: IEnv,
    cxt: ActivityContext<IEnv>,
  ): Promise<GetResourceSummaryResponse> {
    const userEmail: string = this.getAuthenticatedUserEmailAddress(cxt);
    const assumableRolesDAO: AssumableRolesDAO = new AssumableRolesDAO(env.AccessBridgeDB);
    const accountIds: string[] = await assumableRolesDAO.getDistinctAccountIds(userEmail);

    const resourceDAO: ResourceInventoryDAO = new ResourceInventoryDAO(env.AccessBridgeDB);
    const counts: Record<string, Record<string, number>> = await resourceDAO.getResourceCounts(accountIds);

    let totalResources: number = 0;
    const byType: Record<string, number> = {};
    for (const accountCounts of Object.values(counts)) {
      for (const [type, count] of Object.entries(accountCounts)) {
        byType[type] = (byType[type] || 0) + count;
        totalResources += count;
      }
    }

    return { totalResources, byType, byAccount: counts };
  }
}

type GetResourceSummaryRequest = IRequest;
interface GetResourceSummaryResponse extends IResponse {
  totalResources: number;
  byType: Record<string, number>;
  byAccount: Record<string, Record<string, number>>;
}

export { GetResourceSummaryRoute };
