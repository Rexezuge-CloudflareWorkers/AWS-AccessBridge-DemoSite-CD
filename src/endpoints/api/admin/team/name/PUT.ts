import { TeamsDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class UpdateTeamNameRoute extends IAdminActivityAPIRoute<UpdateTeamNameRequest, UpdateTeamNameResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Update Team Name', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId', 'teamName'], properties: { teamId: { type: 'string' as const }, teamName: { type: 'string' as const } } } } } }, responses: { '200': { description: 'Team name updated' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: UpdateTeamNameRequest, env: IAdminEnv): Promise<UpdateTeamNameResponse> {
    if (!request.teamId || !request.teamName?.trim()) throw new BadRequestError('Missing required fields.');
    await new TeamsDAO(env.AccessBridgeDB).updateTeamName(request.teamId, request.teamName.trim());
    return { success: true, message: 'Team name updated.' };
  }
}

interface UpdateTeamNameRequest extends IRequest { teamId: string; teamName: string; }
interface UpdateTeamNameResponse extends IResponse { success: boolean; message: string; }
export { UpdateTeamNameRoute };
