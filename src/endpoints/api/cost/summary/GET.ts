import { AssumableRolesDAO, CostDataDAO } from '@/dao';
import { IActivityAPIRoute } from '@/endpoints/IActivityAPIRoute';
import type { ActivityContext, IEnv, IRequest, IResponse } from '@/endpoints/IActivityAPIRoute';
import type { CostData } from '@/model';

class GetCostSummaryRoute extends IActivityAPIRoute<GetCostSummaryRequest, GetCostSummaryResponse, GetCostSummaryEnv> {
  schema = {
    tags: ['Cost'],
    summary: 'Get Cost Summary',
    description: 'Returns aggregated cost summary across all accounts the user has access to.',
    responses: { '200': { description: 'Cost summary' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleRequest(
    _request: GetCostSummaryRequest,
    env: GetCostSummaryEnv,
    cxt: ActivityContext<GetCostSummaryEnv>,
  ): Promise<GetCostSummaryResponse> {
    const userEmail: string = this.getAuthenticatedUserEmailAddress(cxt);
    const assumableRolesDAO: AssumableRolesDAO = new AssumableRolesDAO(env.AccessBridgeDB);
    const accountIds: string[] = await assumableRolesDAO.getDistinctAccountIds(userEmail);

    if (accountIds.length === 0) return { accounts: {}, grandTotal: 0 };

    const endDate: string = new Date().toISOString().split('T')[0];
    const startDate: string = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const costDataDAO: CostDataDAO = new CostDataDAO(env.AccessBridgeDB);
    const costData: CostData[] = await costDataDAO.getCostDataForAccounts(accountIds, startDate, endDate);

    const accounts: Record<string, { totalCost: number; currency: string }> = {};
    let grandTotal: number = 0;

    for (const data of costData) {
      if (!accounts[data.awsAccountId]) {
        accounts[data.awsAccountId] = { totalCost: 0, currency: data.currency };
      }
      accounts[data.awsAccountId].totalCost += data.totalCost;
      grandTotal += data.totalCost;
    }

    // Round totals
    for (const accountId in accounts) {
      accounts[accountId].totalCost = Math.round(accounts[accountId].totalCost * 100) / 100;
    }

    return { accounts, grandTotal: Math.round(grandTotal * 100) / 100 };
  }
}

type GetCostSummaryRequest = IRequest;

interface GetCostSummaryResponse extends IResponse {
  accounts: Record<string, { totalCost: number; currency: string }>;
  grandTotal: number;
}

type GetCostSummaryEnv = IEnv;

export { GetCostSummaryRoute };
