import { AbstractWorker } from '@/base';
import { fromHono, HonoOpenAPIRouterType } from 'chanfana';
import { Hono } from 'hono';
import {
  FavoriteAccountRoute,
  UnfavoriteAccountRoute,
  StoreCredentialRoute,
  GenerateConsoleUrlRoute,
  AssumeRoleRoute,
  FederateRoute,
  ListAssumablesRoute,
  SearchAccountsRoute,
  GetCurrentUserRoute,
  GrantAccessRoute,
  RevokeAccessRoute,
  SetAccountNicknameRoute,
  RemoveAccountNicknameRoute,
  StoreCredentialRelationshipRoute,
  RemoveCredentialRelationshipRoute,
  HideRoleRoute,
  UnhideRoleRoute,
  SetRoleConfigRoute,
  DeleteRoleConfigRoute,
  FederateWrapperRoute,
  CreateTokenRoute,
  ListTokensRoute,
  DeleteTokenRoute,
  ValidateCredentialsRoute,
  TestCredentialChainRoute,
  ListAccountRolesRoute,
  ListAuditLogsRoute,
  GetCostSummaryRoute,
  GetAccountCostRoute,
  GetCostTrendsRoute,
  CreateSpendAlertRoute,
  DeleteSpendAlertRoute,
  EnableDataCollectionRoute,
  DisableDataCollectionRoute,
  ListResourcesRoute,
  GetResourceSummaryRoute,
  CreateTeamRoute,
  DeleteTeamRoute,
  ListTeamsRoute,
  UpdateTeamNameRoute,
  AddTeamMemberRoute,
  RemoveTeamMemberRoute,
  ListTeamMembersRoute,
  UpdateTeamMemberRoleRoute,
  AddTeamAccountRoute,
  RemoveTeamAccountRoute,
  ListTeamAccountsRoute,
  CleanupOrphanedDataRoute,
} from '@/endpoints';
import { CredentialCacheRefreshTask, AuditLogCleanupTask, CostDataCollectionTask, ResourceInventoryCollectionTask } from '@/scheduled';
import { MiddlewareHandlers } from '@/middleware';
import { SPA_HTML } from '@/generated/spa-shell';

class AccessBridgeWorker extends AbstractWorker {
  protected readonly app: Hono<{ Bindings: Env }>;

  constructor() {
    super();

    const app: Hono<{
      Bindings: Env;
    }> = new Hono<{ Bindings: Env }>();

    // Middleware Handlers
    app.use('*', MiddlewareHandlers.hmacValidation());
    app.use('/api/*', MiddlewareHandlers.activityAudit());
    app.use('/federate', MiddlewareHandlers.activityAudit());
    app.use('/api/*', MiddlewareHandlers.authentication());
    app.use('/federate', MiddlewareHandlers.authentication());

    const openapi: HonoOpenAPIRouterType<{
      Bindings: Env;
    }> = fromHono(app, {
      docs_url: '/docs',
    });

    // Root Routes
    openapi.get('/federate', FederateWrapperRoute);

    // AWS Routes
    openapi.post('/api/aws/console', GenerateConsoleUrlRoute);
    openapi.post('/api/aws/assume-role', AssumeRoleRoute);
    openapi.get('/api/aws/federate', FederateRoute);

    // User Routes
    openapi.get('/api/user/assumables', ListAssumablesRoute);
    openapi.get('/api/user/assumables/search', SearchAccountsRoute);
    openapi.get('/api/user/me', GetCurrentUserRoute);
    openapi.post('/api/user/favorites', FavoriteAccountRoute);
    openapi.delete('/api/user/favorites', UnfavoriteAccountRoute);
    openapi.post('/api/user/assumable/hidden', HideRoleRoute);
    openapi.delete('/api/user/assumable/hidden', UnhideRoleRoute);
    openapi.post('/api/user/token', CreateTokenRoute);
    openapi.delete('/api/user/token', DeleteTokenRoute);
    openapi.get('/api/user/tokens', ListTokensRoute);

    // Admin Routes
    openapi.post('/api/admin/credentials', StoreCredentialRoute);
    openapi.post('/api/admin/credentials/relationship', StoreCredentialRelationshipRoute);
    openapi.delete('/api/admin/credentials/relationship', RemoveCredentialRelationshipRoute);
    openapi.post('/api/admin/access', GrantAccessRoute);
    openapi.delete('/api/admin/access', RevokeAccessRoute);
    openapi.put('/api/admin/account/nickname', SetAccountNicknameRoute);
    openapi.delete('/api/admin/account/nickname', RemoveAccountNicknameRoute);
    openapi.put('/api/admin/role/config', SetRoleConfigRoute);
    openapi.delete('/api/admin/role/config', DeleteRoleConfigRoute);
    openapi.post('/api/admin/credentials/validate', ValidateCredentialsRoute);
    openapi.post('/api/admin/credentials/test-chain', TestCredentialChainRoute);
    openapi.post('/api/admin/account/roles', ListAccountRolesRoute);
    openapi.get('/api/admin/audit-logs', ListAuditLogsRoute);

    // Cost Routes
    openapi.get('/api/cost/summary', GetCostSummaryRoute);
    openapi.get('/api/cost/account', GetAccountCostRoute);
    openapi.get('/api/cost/trends', GetCostTrendsRoute);
    openapi.post('/api/admin/cost/alerts', CreateSpendAlertRoute);
    openapi.delete('/api/admin/cost/alerts', DeleteSpendAlertRoute);
    openapi.post('/api/admin/collection/config', EnableDataCollectionRoute);
    openapi.delete('/api/admin/collection/config', DisableDataCollectionRoute);

    // Resource Routes
    openapi.get('/api/resources', ListResourcesRoute);
    openapi.get('/api/resources/summary', GetResourceSummaryRoute);

    // Team Routes
    openapi.post('/api/admin/team', CreateTeamRoute);
    openapi.delete('/api/admin/team', DeleteTeamRoute);
    openapi.get('/api/admin/teams', ListTeamsRoute);
    openapi.put('/api/admin/team/name', UpdateTeamNameRoute);
    openapi.post('/api/admin/team/member', AddTeamMemberRoute);
    openapi.delete('/api/admin/team/member', RemoveTeamMemberRoute);
    openapi.get('/api/admin/team/members', ListTeamMembersRoute);
    openapi.put('/api/admin/team/member/role', UpdateTeamMemberRoleRoute);
    openapi.post('/api/admin/team/account', AddTeamAccountRoute);
    openapi.delete('/api/admin/team/account', RemoveTeamAccountRoute);
    openapi.get('/api/admin/team/accounts', ListTeamAccountsRoute);

    // Maintenance Routes
    openapi.post('/api/admin/maintenance/cleanup-orphaned', CleanupOrphanedDataRoute);

    // SPA catch-all: serve embedded index.html for frontend routes
    app.get('*', (c) => {
      const path: string = new URL(c.req.url).pathname;
      if (path.startsWith('/api/') || path.startsWith('/openapi.') || path === '/docs' || path === '/redocs' || /\.\w+$/.test(path)) {
        return c.notFound();
      }
      return c.html(SPA_HTML);
    });

    this.app = openapi;
  }

  protected async handleFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return this.app.fetch(request, env, ctx);
  }

  protected async handleScheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    await new CredentialCacheRefreshTask().handle(event, env, ctx);
    await new AuditLogCleanupTask().handle(event, env, ctx);
    await new CostDataCollectionTask().handle(event, env, ctx);
    await new ResourceInventoryCollectionTask().handle(event, env, ctx);
  }
}

export { AccessBridgeWorker };
