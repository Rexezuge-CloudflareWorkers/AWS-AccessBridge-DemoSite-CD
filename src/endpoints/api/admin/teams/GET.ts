import { TeamsDAO } from '@/dao';
import { IAdminActivityAPIRoute } from '@/endpoints/IAdminActivityAPIRoute';
import type { IAdminEnv, IRequest, IResponse } from '@/endpoints/IAdminActivityAPIRoute';
import type { Team } from '@/model';

class ListTeamsRoute extends IAdminActivityAPIRoute<IRequest, ListTeamsResponse, IAdminEnv> {
  schema = { tags: ['Admin'], summary: 'List Teams', responses: { '200': { description: 'List of teams' } }, security: [{ CloudflareAccess: [] }] };

  protected async handleAdminRequest(_request: IRequest, env: IAdminEnv): Promise<ListTeamsResponse> {
    const teams: Team[] = await new TeamsDAO(env.AccessBridgeDB).listTeams();
    return { teams };
  }
}

interface ListTeamsResponse extends IResponse { teams: Team[]; }
export { ListTeamsRoute };
