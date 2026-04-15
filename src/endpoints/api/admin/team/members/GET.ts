import { TeamMembersDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { ActivityContext, IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';
import type { TeamMember } from '@/model';

class ListTeamMembersRoute extends IAdminActivityAPIRoute<IRequest, ListTeamMembersResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'List Team Members', parameters: [{ name: 'teamId', in: 'query' as const, required: true, schema: { type: 'string' as const } }], responses: { '200': { description: 'Team members' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(_request: IRequest, env: IAdminEnv, cxt: ActivityContext<IAdminEnv>): Promise<ListTeamMembersResponse> {
    const teamId: string | null = new URL(cxt.req.url).searchParams.get('teamId');
    if (!teamId) throw new BadRequestError('Missing required parameter: teamId.');
    const members: TeamMember[] = await new TeamMembersDAO(env.AccessBridgeDB).getMembersByTeam(teamId);
    return { members };
  }
}

interface ListTeamMembersResponse extends IResponse { members: TeamMember[]; }
export { ListTeamMembersRoute };
