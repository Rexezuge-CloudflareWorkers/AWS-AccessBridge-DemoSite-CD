import { TeamMembersDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class RemoveTeamMemberRoute extends IAdminActivityAPIRoute<RemoveTeamMemberRequest, RemoveTeamMemberResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Remove Team Member', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId', 'userEmail'], properties: { teamId: { type: 'string' as const }, userEmail: { type: 'string' as const } } } } } }, responses: { '200': { description: 'Member removed' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: RemoveTeamMemberRequest, env: IAdminEnv): Promise<RemoveTeamMemberResponse> {
    if (!request.teamId || !request.userEmail) throw new BadRequestError('Missing required fields.');
    await new TeamMembersDAO(env.AccessBridgeDB).removeMember(request.teamId, request.userEmail);
    return { success: true, message: 'Member removed.' };
  }
}

interface RemoveTeamMemberRequest extends IRequest { teamId: string; userEmail: string; }
interface RemoveTeamMemberResponse extends IResponse { success: boolean; message: string; }
export { RemoveTeamMemberRoute };
