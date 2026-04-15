import { TeamAccountsDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class AddTeamAccountRoute extends IAdminActivityAPIRoute<AddTeamAccountRequest, AddTeamAccountResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Add Account to Team', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamId', 'awsAccountId'], properties: { teamId: { type: 'string' as const }, awsAccountId: { type: 'string' as const } } } } } }, responses: { '200': { description: 'Account added to team' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: AddTeamAccountRequest, env: IAdminEnv): Promise<AddTeamAccountResponse> {
    if (!request.teamId || !request.awsAccountId) throw new BadRequestError('Missing required fields.');
    await new TeamAccountsDAO(env.AccessBridgeDB).addAccountToTeam(request.teamId, request.awsAccountId);
    return { success: true, message: 'Account added to team.' };
  }
}

interface AddTeamAccountRequest extends IRequest { teamId: string; awsAccountId: string; }
interface AddTeamAccountResponse extends IResponse { success: boolean; message: string; }
export { AddTeamAccountRoute };
