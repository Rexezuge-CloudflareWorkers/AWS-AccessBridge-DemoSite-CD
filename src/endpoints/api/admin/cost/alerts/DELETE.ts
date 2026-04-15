import { SpendAlertDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class DeleteSpendAlertRoute extends IAdminActivityAPIRoute<DeleteSpendAlertRequest, DeleteSpendAlertResponse, IAdminEnv> {
  schema = {
    tags: ['Admin'],
    summary: 'Delete Spend Alert',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object' as const, required: ['alertId'], properties: {
        alertId: { type: 'string' as const },
      }}}},
    },
    responses: { '200': { description: 'Alert deleted' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleAdminRequest(
    request: DeleteSpendAlertRequest,
    env: IAdminEnv,
  ): Promise<DeleteSpendAlertResponse> {
    if (!request.alertId) throw new BadRequestError('Missing required field: alertId.');
    const spendAlertDAO: SpendAlertDAO = new SpendAlertDAO(env.AccessBridgeDB);
    await spendAlertDAO.deleteAlert(request.alertId);
    return { success: true, message: 'Alert deleted.' };
  }
}

interface DeleteSpendAlertRequest extends IRequest { alertId: string; }
interface DeleteSpendAlertResponse extends IResponse { success: boolean; message: string; }

export { DeleteSpendAlertRoute };
