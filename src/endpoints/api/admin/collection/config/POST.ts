import { DataCollectionConfigDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class EnableDataCollectionRoute extends IAdminActivityAPIRoute<EnableDataCollectionRequest, EnableDataCollectionResponse, IAdminEnv> {
  schema = {
    tags: ['Admin'],
    summary: 'Enable Data Collection',
    description: 'Enable cost and/or resource data collection for a credential.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object' as const, required: ['principalArn', 'collectionTypes'], properties: {
        principalArn: { type: 'string' as const },
        collectionTypes: { type: 'array' as const, items: { type: 'string' as const, enum: ['cost', 'resource'] } },
      }}}},
    },
    responses: { '200': { description: 'Collection enabled' } },
    security: [{ CloudflareAccess: [] }],
  };

  protected async handleAdminRequest(
    request: EnableDataCollectionRequest,
    env: IAdminEnv,
  ): Promise<EnableDataCollectionResponse> {
    if (!request.principalArn || !request.collectionTypes?.length) {
      throw new BadRequestError('Missing required fields: principalArn and collectionTypes.');
    }
    const dao: DataCollectionConfigDAO = new DataCollectionConfigDAO(env.AccessBridgeDB);
    for (const type of request.collectionTypes) {
      await dao.create(request.principalArn, type);
    }
    return { success: true, message: `Data collection enabled for ${request.collectionTypes.join(', ')}.` };
  }
}

interface EnableDataCollectionRequest extends IRequest { principalArn: string; collectionTypes: string[]; }
interface EnableDataCollectionResponse extends IResponse { success: boolean; message: string; }

export { EnableDataCollectionRoute };
