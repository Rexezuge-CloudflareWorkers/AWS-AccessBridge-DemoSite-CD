import { DataCollectionConfigDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class DisableDataCollectionRoute extends IAdminActivityAPIRoute<DisableDataCollectionRequest, DisableDataCollectionResponse, IAdminEnv> {
  schema = {
    tags: ['Admin'],
    summary: 'Disable Data Collection',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object' as const, required: ['principalArn', 'collectionType'], properties: {
        principalArn: { type: 'string' as const },
        collectionType: { type: 'string' as const },
      }}}},
    },
    responses: { '200': { description: 'Collection disabled' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleAdminRequest(
    request: DisableDataCollectionRequest,
    env: IAdminEnv,
  ): Promise<DisableDataCollectionResponse> {
    if (!request.principalArn || !request.collectionType) {
      throw new BadRequestError('Missing required fields: principalArn and collectionType.');
    }
    const dao: DataCollectionConfigDAO = new DataCollectionConfigDAO(env.AccessBridgeDB);
    await dao.delete(request.principalArn, request.collectionType);
    return { success: true, message: 'Data collection disabled.' };
  }
}

interface DisableDataCollectionRequest extends IRequest { principalArn: string; collectionType: string; }
interface DisableDataCollectionResponse extends IResponse { success: boolean; message: string; }

export { DisableDataCollectionRoute };
