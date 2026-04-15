import { TeamsDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { ActivityContext, IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';
import type { Team } from '@/model';

class CreateTeamRoute extends IAdminActivityAPIRoute<CreateTeamRequest, CreateTeamResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'Create Team', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' as const, required: ['teamName'], properties: { teamName: { type: 'string' as const } } } } } }, responses: { '200': { description: 'Team created' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(request: CreateTeamRequest, env: IAdminEnv, cxt: ActivityContext<IAdminEnv>): Promise<CreateTeamResponse> {
    if (!request.teamName?.trim()) throw new BadRequestError('Missing required field: teamName.');
    const teamsDAO: TeamsDAO = new TeamsDAO(env.AccessBridgeDB);
    const team: Team = await teamsDAO.createTeam(request.teamName.trim(), this.getAuthenticatedUserEmailAddress(cxt));
    return { success: true, team };
  }
}

interface CreateTeamRequest extends IRequest { teamName: string; }
interface CreateTeamResponse extends IResponse { success: boolean; team: Team; }
export { CreateTeamRoute };
