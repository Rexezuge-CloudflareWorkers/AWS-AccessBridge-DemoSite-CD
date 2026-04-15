import { SpendAlertDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { ActivityContext, IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';
import type { SpendAlert } from '@/model';

class CreateSpendAlertRoute extends IAdminActivityAPIRoute<CreateSpendAlertRequest, CreateSpendAlertResponse, IAdminEnv> {
  schema = {
    tags: ['Admin'],
    summary: 'Create Spend Alert',
    description: 'Creates a configurable spend alert for an AWS account.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object' as const, required: ['awsAccountId', 'thresholdAmount'], properties: {
        awsAccountId: { type: 'string' as const },
        thresholdAmount: { type: 'number' as const },
        periodType: { type: 'string' as const, enum: ['daily', 'monthly'], default: 'monthly' },
      }}}},
    },
    responses: { '200': { description: 'Alert created' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleAdminRequest(
    request: CreateSpendAlertRequest,
    env: IAdminEnv,
    cxt: ActivityContext<IAdminEnv>,
  ): Promise<CreateSpendAlertResponse> {
    if (!request.awsAccountId || !request.thresholdAmount) {
      throw new BadRequestError('Missing required fields: awsAccountId and thresholdAmount.');
    }
    const userEmail: string = this.getAuthenticatedUserEmailAddress(cxt);
    const spendAlertDAO: SpendAlertDAO = new SpendAlertDAO(env.AccessBridgeDB);
    const alert: SpendAlert = await spendAlertDAO.createAlert(
      request.awsAccountId,
      request.thresholdAmount,
      request.periodType || 'monthly',
      userEmail,
    );
    return { success: true, alert };
  }
}

interface CreateSpendAlertRequest extends IRequest {
  awsAccountId: string;
  thresholdAmount: number;
  periodType?: string;
}

interface CreateSpendAlertResponse extends IResponse {
  success: boolean;
  alert: SpendAlert;
}

export { CreateSpendAlertRoute };
