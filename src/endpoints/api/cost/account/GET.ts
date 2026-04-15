import { AssumableRolesDAO, CostDataDAO } from '@/dao';
import { BadRequestError, ForbiddenError } from '@/error';
import { IActivityAPIRoute } from '@/endpoints/IActivityAPIRoute';
import type { ActivityContext, IEnv, IRequest, IResponse } from '@/endpoints/IActivityAPIRoute';
import type { CostData } from '@/model';

class GetAccountCostRoute extends IActivityAPIRoute<GetAccountCostRequest, GetAccountCostResponse, GetAccountCostEnv> {
  schema = {
    tags: ['Cost'],
    summary: 'Get Account Cost Detail',
    description: 'Returns daily cost breakdown for a specific AWS account.',
    parameters: [
      { name: 'awsAccountId', in: 'query' as const, required: true, schema: { type: 'string' as const } },
      { name: 'startDate', in: 'query' as const, required: false, schema: { type: 'string' as const } },
      { name: 'endDate', in: 'query' as const, required: false, schema: { type: 'string' as const } },
    ],
    responses: { '200': { description: 'Account cost data' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleRequest(
    _request: GetAccountCostRequest,
    env: GetAccountCostEnv,
    cxt: ActivityContext<GetAccountCostEnv>,
  ): Promise<GetAccountCostResponse> {
    const userEmail: string = this.getAuthenticatedUserEmailAddress(cxt);
    const url: URL = new URL(cxt.req.url);
    const awsAccountId: string | null = url.searchParams.get('awsAccountId');
    if (!awsAccountId) throw new BadRequestError('Missing required parameter: awsAccountId.');

    const assumableRolesDAO: AssumableRolesDAO = new AssumableRolesDAO(env.AccessBridgeDB);
    const roles: string[] = await assumableRolesDAO.getRolesByUserAndAccount(userEmail, awsAccountId);
    if (roles.length === 0) throw new ForbiddenError('You do not have access to this account.');

    const endDate: string = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const startDate: string = url.searchParams.get('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const costDataDAO: CostDataDAO = new CostDataDAO(env.AccessBridgeDB);
    const costData: CostData[] = await costDataDAO.getCostDataByAccount(awsAccountId, startDate, endDate);

    let total: number = 0;
    const serviceBreakdown: Record<string, number> = {};
    for (const data of costData) {
      total += data.totalCost;
      for (const [service, amount] of Object.entries(data.serviceBreakdown)) {
        serviceBreakdown[service] = (serviceBreakdown[service] || 0) + amount;
      }
    }

    return {
      awsAccountId,
      dailyCosts: costData,
      serviceBreakdown,
      total: Math.round(total * 100) / 100,
    };
  }
}

type GetAccountCostRequest = IRequest;

interface GetAccountCostResponse extends IResponse {
  awsAccountId: string;
  dailyCosts: CostData[];
  serviceBreakdown: Record<string, number>;
  total: number;
}

type GetAccountCostEnv = IEnv;

export { GetAccountCostRoute };
