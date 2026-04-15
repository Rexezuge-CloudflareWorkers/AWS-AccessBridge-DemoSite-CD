import { TeamAccountsDAO } from '@/dao';
import { BadRequestError } from '@/error';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { ActivityContext, IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';

class ListTeamAccountsRoute extends IAdminActivityAPIRoute<IRequest, ListTeamAccountsResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'List Team Accounts', parameters: [{ name: 'teamId', in: 'query' as const, required: true, schema: { type: 'string' as const } }], responses: { '200': { description: 'Team accounts' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(_request: IRequest, env: IAdminEnv, cxt: ActivityContext<IAdminEnv>): Promise<ListTeamAccountsResponse> {
    const teamId: string | null = new URL(cxt.req.url).searchParams.get('teamId');
    if (!teamId) throw new BadRequestError('Missing required parameter: teamId.');
    const accountIds: string[] = await new TeamAccountsDAO(env.AccessBridgeDB).getAccountsByTeam(teamId);
    return { accountIds };
  }
}

interface ListTeamAccountsResponse extends IResponse { accountIds: string[]; }
export { ListTeamAccountsRoute };
