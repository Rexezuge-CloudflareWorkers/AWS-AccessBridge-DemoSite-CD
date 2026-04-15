import { TeamAccountsDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class RemoveTeamAccountRoute extends IAdminActivityAPIRoute<RemoveTeamAccountRequest, RemoveTeamAccountResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Remove Account from Team', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId', 'awsAccountId'], properties: { teamId: { type: 'string' as const }, awsAccountId: { type: 'string' as const } } } } } }, responses: { '200': { description: 'Account removed from team' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: RemoveTeamAccountRequest, env: IAdminEnv): Promise<RemoveTeamAccountResponse> {
    if (!request.teamId || !request.awsAccountId) throw new BadRequestError('Missing required fields.');
    await new TeamAccountsDAO(env.AccessBridgeDB).removeAccountFromTeam(request.teamId, request.awsAccountId);
    return { success: true, message: 'Account removed from team.' };
  }
}

interface RemoveTeamAccountRequest extends IRequest { teamId: string; awsAccountId: string; }
interface RemoveTeamAccountResponse extends IResponse { success: boolean; message: string; }
export { RemoveTeamAccountRoute };
