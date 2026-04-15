import { AssumableRolesDAO, CostDataDAO } from '@/dao';
import { IActivityAPIRoute } from '@/endpoints/IActivityAPIRoute';
import type { ActivityContext, IEnv, IRequest, IResponse } from '@/endpoints/IActivityAPIRoute';
import type { CostData } from '@/model';

class GetCostTrendsRoute extends IActivityAPIRoute<GetCostTrendsRequest, GetCostTrendsResponse, GetCostTrendsEnv> {
  schema = {
    tags: ['Cost'],
    summary: 'Get Cost Trends',
    description: 'Returns monthly cost totals across all user-accessible accounts for trend charts.',
    parameters: [
      { name: 'months', in: 'query' as const, required: false, schema: { type: 'integer' as const, default: 6 } },
    ],
    responses: { '200': { description: 'Monthly cost trends' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleRequest(
    _request: GetCostTrendsRequest,
    env: GetCostTrendsEnv,
    cxt: ActivityContext<GetCostTrendsEnv>,
  ): Promise<GetCostTrendsResponse> {
    const userEmail: string = this.getAuthenticatedUserEmailAddress(cxt);
    const url: URL = new URL(cxt.req.url);
    const months: number = Math.min(parseInt(url.searchParams.get('months') || '6'), 12);

    const assumableRolesDAO: AssumableRolesDAO = new AssumableRolesDAO(env.AccessBridgeDB);
    const accountIds: string[] = await assumableRolesDAO.getDistinctAccountIds(userEmail);

    if (accountIds.length === 0) return { months: [] };

    const endDate: string = new Date().toISOString().split('T')[0];
    const startDate: string = new Date(Date.now() - months * 30 * 86400000).toISOString().split('T')[0];

    const costDataDAO: CostDataDAO = new CostDataDAO(env.AccessBridgeDB);
    const costData: CostData[] = await costDataDAO.getCostDataForAccounts(accountIds, startDate, endDate);

    // Aggregate by month
    const monthlyData: Record<string, { total: number; byAccount: Record<string, number> }> = {};
    for (const data of costData) {
      const month: string = data.periodStart.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) monthlyData[month] = { total: 0, byAccount: {} };
      monthlyData[month].total += data.totalCost;
      monthlyData[month].byAccount[data.awsAccountId] = (monthlyData[month].byAccount[data.awsAccountId] || 0) + data.totalCost;
    }

    const result = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        total: Math.round(data.total * 100) / 100,
        byAccount: data.byAccount,
      }));

    return { months: result };
  }
}

type GetCostTrendsRequest = IRequest;

interface GetCostTrendsResponse extends IResponse {
  months: Array<{ period: string; total: number; byAccount: Record<string, number> }>;
}

type GetCostTrendsEnv = IEnv;

export { GetCostTrendsRoute };
