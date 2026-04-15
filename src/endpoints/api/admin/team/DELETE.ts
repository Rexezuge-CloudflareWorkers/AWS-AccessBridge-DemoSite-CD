import { TeamsDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class DeleteTeamRoute extends IAdminActivityAPIRoute<DeleteTeamRequest, DeleteTeamResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Delete Team', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId'], properties: { teamId: { type: 'string' as const } } } } } }, responses: { '200': { description: 'Team deleted' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: DeleteTeamRequest, env: IAdminEnv): Promise<DeleteTeamResponse> {
    if (!request.teamId) throw new BadRequestError('Missing required field: teamId.');
    if (request.teamId === '00000000-0000-0000-0000-000000000000') throw new BadRequestError('Cannot delete the default team.');
    await new TeamsDAO(env.AccessBridgeDB).deleteTeam(request.teamId);
    return { success: true, message: 'Team deleted.' };
  }
}

interface DeleteTeamRequest extends IRequest { teamId: string; }
interface DeleteTeamResponse extends IResponse { success: boolean; message: string; }
export { DeleteTeamRoute };
