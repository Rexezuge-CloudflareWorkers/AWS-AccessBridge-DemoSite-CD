import { z } from 'zod';

const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

const MessageResponseSchema = SuccessResponseSchema.extend({
  message: z.string(),
});

const ErrorResponseSchema = z.object({
  Exception: z.object({
    Type: z.string(),
    Message: z.string(),
  }),
});

const AccessKeysResponseSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  sessionToken: z.string().optional(),
  expiration: z.string().optional(),
});

const ConsoleUrlResponseSchema = z.object({
  url: z.string().url(),
});

const TeamSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  createdAt: z.number(),
  createdBy: z.string(),
});

const TeamMemberSchema = z.object({
  teamId: z.string(),
  userEmail: z.string(),
  role: z.enum(['admin', 'member']),
  joinedAt: z.number(),
});

const SpendAlertSchema = z.object({
  alertId: z.string(),
  awsAccountId: z.string(),
  thresholdAmount: z.number(),
  currency: z.string(),
  periodType: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  enabled: z.boolean(),
});

const CostDataSchema = z.object({
  awsAccountId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalCost: z.number(),
  currency: z.string(),
  serviceBreakdown: z.record(z.string(), z.number()),
  collectedAt: z.number(),
});

const ResourceInventoryItemSchema = z.object({
  awsAccountId: z.string(),
  region: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  resourceName: z.string(),
  state: z.string(),
  metadata: z.record(z.string(), z.string()),
  collectedAt: z.number(),
});

const AuditLogSchema = z.object({
  logId: z.string(),
  timestamp: z.number(),
  userEmail: z.string(),
  action: z.string(),
  resource: z.string().optional(),
  method: z.string(),
  path: z.string(),
  statusCode: z.number(),
  detail: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const UserAccessTokenMetadataSchema = z.object({
  tokenId: z.string(),
  userEmail: z.string(),
  name: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
  lastUsedAt: z.number().optional(),
});

const AssumableAccountSchema = z.object({
  roles: z.array(z.string()),
  hiddenRoles: z.array(z.string()).optional(),
  nickname: z.string().optional(),
  favorite: z.boolean().optional(),
});

const AssumableAccountsResponseSchema = z
  .object({
    totalAccounts: z.number(),
  })
  .catchall(z.union([AssumableAccountSchema, z.number()]));

const RoleDiscoveryItemSchema = z.object({
  roleName: z.string(),
  arn: z.string(),
  description: z.string(),
});

const CredentialValidationResponseSchema = z.object({
  valid: z.boolean(),
  arn: z.string(),
  accountId: z.string(),
  userId: z.string(),
});

const CredentialChainTestResponseSchema = z.object({
  success: z.boolean(),
  chain: z.array(
    z.object({
      arn: z.string(),
      status: z.string(),
    }),
  ),
});

const CostSummaryResponseSchema = z.object({
  accounts: z.record(
    z.string(),
    z.object({
      totalCost: z.number(),
      currency: z.string(),
    }),
  ),
  grandTotal: z.number(),
});

const CostTrendsResponseSchema = z.object({
  months: z.array(
    z.object({
      period: z.string(),
      total: z.number(),
      byAccount: z.record(z.string(), z.number()),
    }),
  ),
});

const ResourceSummaryResponseSchema = z.object({
  totalResources: z.number(),
  byType: z.record(z.string(), z.number()),
  byAccount: z.record(z.string(), z.record(z.string(), z.number())),
});

const CleanupOrphanedDataResponseSchema = z.object({
  deletedCounts: z.object({
    dataCollectionConfig: z.number(),
    roleConfigs: z.number(),
    teamAccounts: z.number(),
    spendAlerts: z.number(),
    costData: z.number(),
    resourceInventory: z.number(),
    awsAccounts: z.number(),
  }),
  totalDeleted: z.number(),
});

const RouteOutputSchemas = {
  'GET /federate': z.undefined(),
  'POST /api/aws/assume-role': AccessKeysResponseSchema,
  'POST /api/aws/console': ConsoleUrlResponseSchema,
  'GET /api/aws/federate': z.undefined(),
  'GET /api/user/assumables': AssumableAccountsResponseSchema,
  'GET /api/user/assumables/search': z.record(z.string(), AssumableAccountSchema),
  'GET /api/user/me': z.object({
    email: z.string(),
    isSuperAdmin: z.boolean(),
    demoMode: z.boolean(),
  }),
  'POST /api/user/favorites': SuccessResponseSchema,
  'DELETE /api/user/favorites': SuccessResponseSchema,
  'POST /api/user/assumable/hidden': SuccessResponseSchema,
  'DELETE /api/user/assumable/hidden': SuccessResponseSchema,
  'POST /api/user/token': z.object({
    tokenId: z.string(),
    token: z.string(),
    name: z.string(),
    expiresAt: z.number(),
  }),
  'DELETE /api/user/token': SuccessResponseSchema,
  'GET /api/user/tokens': z.object({
    tokens: z.array(UserAccessTokenMetadataSchema),
  }),
  'GET /api/admin/audit-logs': z.object({
    logs: z.array(AuditLogSchema),
    total: z.number(),
  }),
  'POST /api/admin/credentials': MessageResponseSchema,
  'POST /api/admin/credentials/relationship': MessageResponseSchema,
  'DELETE /api/admin/credentials/relationship': MessageResponseSchema,
  'POST /api/admin/access': MessageResponseSchema,
  'DELETE /api/admin/access': MessageResponseSchema,
  'PUT /api/admin/account/nickname': z.object({
    success: z.boolean(),
    accountId: z.string(),
    nickname: z.string(),
  }),
  'DELETE /api/admin/account/nickname': z.object({
    success: z.boolean(),
    accountId: z.string(),
  }),
  'PUT /api/admin/role/config': MessageResponseSchema,
  'DELETE /api/admin/role/config': MessageResponseSchema,
  'POST /api/admin/credentials/validate': CredentialValidationResponseSchema,
  'POST /api/admin/credentials/test-chain': CredentialChainTestResponseSchema,
  'POST /api/admin/account/roles': z.object({
    roles: z.array(RoleDiscoveryItemSchema),
  }),
  'GET /api/cost/summary': CostSummaryResponseSchema,
  'GET /api/cost/account': z.object({
    awsAccountId: z.string(),
    dailyCosts: z.array(CostDataSchema),
    serviceBreakdown: z.record(z.string(), z.number()),
    total: z.number(),
  }),
  'GET /api/cost/trends': CostTrendsResponseSchema,
  'POST /api/admin/cost/alerts': z.object({
    success: z.boolean(),
    alert: SpendAlertSchema,
  }),
  'DELETE /api/admin/cost/alerts': MessageResponseSchema,
  'POST /api/admin/collection/config': MessageResponseSchema,
  'DELETE /api/admin/collection/config': MessageResponseSchema,
  'GET /api/resources': z.object({
    items: z.array(ResourceInventoryItemSchema),
    total: z.number(),
  }),
  'GET /api/resources/summary': ResourceSummaryResponseSchema,
  'GET /api/admin/teams': z.object({
    teams: z.array(TeamSchema),
  }),
  'GET /api/admin/team/members': z.object({
    members: z.array(TeamMemberSchema),
  }),
  'GET /api/admin/team/accounts': z.object({
    accountIds: z.array(z.string()),
  }),
  'POST /api/admin/team': z.object({
    success: z.boolean(),
    team: TeamSchema,
  }),
  'DELETE /api/admin/team': MessageResponseSchema,
  'PUT /api/admin/team/name': MessageResponseSchema,
  'POST /api/admin/team/member': MessageResponseSchema,
  'DELETE /api/admin/team/member': MessageResponseSchema,
  'PUT /api/admin/team/member/role': MessageResponseSchema,
  'POST /api/admin/team/account': MessageResponseSchema,
  'DELETE /api/admin/team/account': MessageResponseSchema,
  'POST /api/admin/maintenance/cleanup-orphaned': CleanupOrphanedDataResponseSchema,
} as const;

export {
  AccessKeysResponseSchema,
  AssumableAccountSchema,
  AssumableAccountsResponseSchema,
  AuditLogSchema,
  CleanupOrphanedDataResponseSchema,
  ConsoleUrlResponseSchema,
  CostDataSchema,
  CostSummaryResponseSchema,
  CostTrendsResponseSchema,
  CredentialChainTestResponseSchema,
  CredentialValidationResponseSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
  ResourceInventoryItemSchema,
  ResourceSummaryResponseSchema,
  RouteOutputSchemas,
  RoleDiscoveryItemSchema,
  SpendAlertSchema,
  SuccessResponseSchema,
  TeamMemberSchema,
  TeamSchema,
  UserAccessTokenMetadataSchema,
};
