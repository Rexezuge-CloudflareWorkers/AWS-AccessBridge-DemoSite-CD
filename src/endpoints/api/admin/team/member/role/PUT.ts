import { TeamMembersDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class UpdateTeamMemberRoleRoute extends IAdminActivityAPIRoute<UpdateRoleRequest, UpdateRoleResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Update Team Member Role', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId', 'userEmail', 'role'], properties: { teamId: { type: 'string' as const }, userEmail: { type: 'string' as const }, role: { type: 'string' as const, enum: ['admin', 'member'] } } } } } }, responses: { '200': { description: 'Role updated' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: UpdateRoleRequest, env: IAdminEnv): Promise<UpdateRoleResponse> {
    if (!request.teamId || !request.userEmail || !request.role) throw new BadRequestError('Missing required fields.');
    await new TeamMembersDAO(env.AccessBridgeDB).updateMemberRole(request.teamId, request.userEmail, request.role);
    return { success: true, message: 'Role updated.' };
  }
}

interface UpdateRoleRequest extends IRequest { teamId: string; userEmail: string; role: string; }
interface UpdateRoleResponse extends IResponse { success: boolean; message: string; }
export { UpdateTeamMemberRoleRoute };
