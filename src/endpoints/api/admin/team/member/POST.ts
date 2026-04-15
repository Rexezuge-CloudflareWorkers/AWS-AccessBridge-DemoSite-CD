import { TeamMembersDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class AddTeamMemberRoute extends IAdminActivityAPIRoute<AddTeamMemberRequest, AddTeamMemberResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Add Team Member', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId', 'userEmail'], properties: { teamId: { type: 'string' as const }, userEmail: { type: 'string' as const }, role: { type: 'string' as const, enum: ['admin', 'member'], default: 'member' } } } } } }, responses: { '200': { description: 'Member added' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: AddTeamMemberRequest, env: IAdminEnv): Promise<AddTeamMemberResponse> {
    if (!request.teamId || !request.userEmail) throw new BadRequestError('Missing required fields.');
    await new TeamMembersDAO(env.AccessBridgeDB).addMember(request.teamId, request.userEmail, request.role || 'member');
    return { success: true, message: 'Member added.' };
  }
}

interface AddTeamMemberRequest extends IRequest { teamId: string; userEmail: string; role?: string; }
interface AddTeamMemberResponse extends IResponse { success: boolean; message: string; }
export { AddTeamMemberRoute };
