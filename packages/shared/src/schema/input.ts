import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import {
  AwsAccessKeyIdSchema,
  AwsAccountIdSchema,
  AwsDestinationPathSchema,
  AwsIamPrincipalArnSchema,
  AwsRegionSchema,
  AwsRoleNameSchema,
  AwsSecretAccessKeySchema,
  AwsSessionTokenSchema,
  BooleanQuerySchema,
  CollectionTypeSchema,
  EmailSchema,
  PeriodTypeSchema,
  TeamRoleSchema,
  UuidSchema,
  isoDateQuerySchema,
  nonEmptyStringSchema,
  nonNegativeIntegerQuerySchema,
  positiveIntegerQuerySchema,
} from './common';

interface RequestInputSchema {
  body?: ZodTypeAny | undefined;
  query?: ZodTypeAny | undefined;
}

type RequestSchemaMap = Record<string, RequestInputSchema>;

const PrincipalArnBodySchema = z.object({
  principalArn: AwsIamPrincipalArnSchema,
});

const AccountRoleBodySchema = z.object({
  awsAccountId: AwsAccountIdSchema,
  roleName: AwsRoleNameSchema,
});

const OptionalUserAccountRoleBodySchema = AccountRoleBodySchema.extend({
  userEmail: EmailSchema.optional(),
});

const AwsCredentialsBodySchema = z.object({
  accessKeyId: AwsAccessKeyIdSchema,
  secretAccessKey: AwsSecretAccessKeySchema,
  sessionToken: AwsSessionTokenSchema,
});

const StoreCredentialBodySchema = AwsCredentialsBodySchema.extend({
  principalArn: AwsIamPrincipalArnSchema,
});

const CredentialRelationshipBodySchema = z.object({
  principalArn: AwsIamPrincipalArnSchema,
  assumedBy: AwsIamPrincipalArnSchema,
});

const GenerateConsoleUrlBodySchema = AwsCredentialsBodySchema.extend({
  awsAccountId: AwsAccountIdSchema.optional(),
  roleName: AwsRoleNameSchema.optional(),
  destinationPath: AwsDestinationPathSchema,
  destinationRegion: AwsRegionSchema,
}).refine(
  (input: { awsAccountId?: string | undefined; roleName?: string | undefined }): boolean =>
    (!input.awsAccountId && !input.roleName) || Boolean(input.awsAccountId && input.roleName),
  {
    message: 'awsAccountId and roleName must be provided together.',
    path: ['roleName'],
  },
);

const FavoriteAccountBodySchema = z.object({
  awsAccountId: AwsAccountIdSchema,
});

const HiddenRoleBodySchema = AccountRoleBodySchema;

const CreateTokenBodySchema = z.object({
  name: nonEmptyStringSchema('name', 128),
  expiresInDays: z.number().int().min(1, 'expiresInDays must be at least 1.').optional(),
});

const DeleteTokenBodySchema = z.object({
  tokenId: UuidSchema,
});

const SetAccountNicknameBodySchema = z.object({
  awsAccountId: AwsAccountIdSchema,
  nickname: nonEmptyStringSchema('nickname', 255),
});

const RoleConfigBodySchema = AccountRoleBodySchema.extend({
  destinationPath: AwsDestinationPathSchema,
  destinationRegion: AwsRegionSchema,
});

const CreateSpendAlertBodySchema = z.object({
  awsAccountId: AwsAccountIdSchema,
  thresholdAmount: z.number().positive('thresholdAmount must be greater than zero.'),
  periodType: PeriodTypeSchema.optional(),
});

const DeleteSpendAlertBodySchema = z.object({
  alertId: UuidSchema,
});

const EnableDataCollectionBodySchema = z.object({
  principalArn: AwsIamPrincipalArnSchema,
  collectionTypes: z.array(CollectionTypeSchema).min(1, 'collectionTypes must contain at least one value.'),
});

const DisableDataCollectionBodySchema = z.object({
  principalArn: AwsIamPrincipalArnSchema,
  collectionType: CollectionTypeSchema,
});

const CreateTeamBodySchema = z.object({
  teamName: nonEmptyStringSchema('teamName', 128),
});

const TeamIdBodySchema = z.object({
  teamId: UuidSchema,
});

const UpdateTeamNameBodySchema = TeamIdBodySchema.extend({
  teamName: nonEmptyStringSchema('teamName', 128),
});

const TeamMemberBodySchema = TeamIdBodySchema.extend({
  userEmail: EmailSchema,
});

const AddTeamMemberBodySchema = TeamMemberBodySchema.extend({
  role: TeamRoleSchema.optional(),
});

const UpdateTeamMemberRoleBodySchema = TeamMemberBodySchema.extend({
  role: TeamRoleSchema,
});

const TeamAccountBodySchema = TeamIdBodySchema.extend({
  awsAccountId: AwsAccountIdSchema,
});

const FederateQuerySchema = z.object({
  awsAccountId: AwsAccountIdSchema,
  role: AwsRoleNameSchema,
});

const ListAssumablesQuerySchema = z.object({
  showHidden: BooleanQuerySchema.optional(),
  limit: positiveIntegerQuerySchema('limit', 200).optional(),
  offset: nonNegativeIntegerQuerySchema('offset').optional(),
});

const SearchAssumablesQuerySchema = z.object({
  q: nonEmptyStringSchema('q', 256),
  showHidden: BooleanQuerySchema.optional(),
});

const AccountCostQuerySchema = z
  .object({
    awsAccountId: AwsAccountIdSchema,
    startDate: isoDateQuerySchema('startDate').optional(),
    endDate: isoDateQuerySchema('endDate').optional(),
  })
  .refine(
    (input: { startDate?: string | undefined; endDate?: string | undefined }): boolean =>
      !input.startDate || !input.endDate || input.startDate <= input.endDate,
    {
      message: 'startDate must be on or before endDate.',
      path: ['startDate'],
    },
  );

const CostTrendsQuerySchema = z.object({
  months: positiveIntegerQuerySchema('months', 12).optional(),
});

const ListResourcesQuerySchema = z.object({
  accountId: AwsAccountIdSchema.optional(),
  type: z.enum(['ec2', 's3', 'lambda', 'rds']).optional(),
  search: nonEmptyStringSchema('search', 256).optional(),
  limit: positiveIntegerQuerySchema('limit', 200).optional(),
  offset: nonNegativeIntegerQuerySchema('offset').optional(),
});

const AuditLogsQuerySchema = z
  .object({
    userEmail: EmailSchema.optional(),
    action: nonEmptyStringSchema('action', 128).optional(),
    startTime: nonNegativeIntegerQuerySchema('startTime').optional(),
    endTime: nonNegativeIntegerQuerySchema('endTime').optional(),
    limit: positiveIntegerQuerySchema('limit', 200).optional(),
    offset: nonNegativeIntegerQuerySchema('offset').optional(),
  })
  .refine(
    (input: { startTime?: number | undefined; endTime?: number | undefined }): boolean =>
      input.startTime === undefined || input.endTime === undefined || input.startTime <= input.endTime,
    {
      message: 'startTime must be less than or equal to endTime.',
      path: ['startTime'],
    },
  );

const TeamIdQuerySchema = z.object({
  teamId: UuidSchema,
});

const RequestInputSchemas = {
  'GET /federate': { query: FederateQuerySchema },
  'POST /api/aws/console': { body: GenerateConsoleUrlBodySchema },
  'POST /api/aws/assume-role': { body: PrincipalArnBodySchema },
  'GET /api/aws/federate': { query: FederateQuerySchema },

  'GET /api/user/assumables': { query: ListAssumablesQuerySchema },
  'GET /api/user/assumables/search': { query: SearchAssumablesQuerySchema },
  'POST /api/user/favorites': { body: FavoriteAccountBodySchema },
  'DELETE /api/user/favorites': { body: FavoriteAccountBodySchema },
  'POST /api/user/assumable/hidden': { body: HiddenRoleBodySchema },
  'DELETE /api/user/assumable/hidden': { body: HiddenRoleBodySchema },
  'POST /api/user/token': { body: CreateTokenBodySchema },
  'DELETE /api/user/token': { body: DeleteTokenBodySchema },

  'POST /api/admin/credentials': { body: StoreCredentialBodySchema },
  'POST /api/admin/credentials/relationship': { body: CredentialRelationshipBodySchema },
  'DELETE /api/admin/credentials/relationship': { body: PrincipalArnBodySchema },
  'POST /api/admin/access': { body: OptionalUserAccountRoleBodySchema },
  'DELETE /api/admin/access': { body: OptionalUserAccountRoleBodySchema },
  'PUT /api/admin/account/nickname': { body: SetAccountNicknameBodySchema },
  'DELETE /api/admin/account/nickname': { body: FavoriteAccountBodySchema },
  'PUT /api/admin/role/config': { body: RoleConfigBodySchema },
  'DELETE /api/admin/role/config': { body: AccountRoleBodySchema },
  'POST /api/admin/credentials/validate': { body: AwsCredentialsBodySchema },
  'POST /api/admin/credentials/test-chain': { body: PrincipalArnBodySchema },
  'POST /api/admin/account/roles': { body: PrincipalArnBodySchema },
  'GET /api/admin/audit-logs': { query: AuditLogsQuerySchema },

  'GET /api/cost/account': { query: AccountCostQuerySchema },
  'GET /api/cost/trends': { query: CostTrendsQuerySchema },
  'POST /api/admin/cost/alerts': { body: CreateSpendAlertBodySchema },
  'DELETE /api/admin/cost/alerts': { body: DeleteSpendAlertBodySchema },
  'POST /api/admin/collection/config': { body: EnableDataCollectionBodySchema },
  'DELETE /api/admin/collection/config': { body: DisableDataCollectionBodySchema },

  'GET /api/resources': { query: ListResourcesQuerySchema },

  'POST /api/admin/team': { body: CreateTeamBodySchema },
  'DELETE /api/admin/team': { body: TeamIdBodySchema },
  'PUT /api/admin/team/name': { body: UpdateTeamNameBodySchema },
  'POST /api/admin/team/member': { body: AddTeamMemberBodySchema },
  'DELETE /api/admin/team/member': { body: TeamMemberBodySchema },
  'GET /api/admin/team/members': { query: TeamIdQuerySchema },
  'PUT /api/admin/team/member/role': { body: UpdateTeamMemberRoleBodySchema },
  'POST /api/admin/team/account': { body: TeamAccountBodySchema },
  'DELETE /api/admin/team/account': { body: TeamAccountBodySchema },
  'GET /api/admin/team/accounts': { query: TeamIdQuerySchema },
} as const satisfies RequestSchemaMap;

export {
  AccountCostQuerySchema,
  AccountRoleBodySchema,
  AddTeamMemberBodySchema,
  AuditLogsQuerySchema,
  AwsCredentialsBodySchema,
  CreateSpendAlertBodySchema,
  CreateTeamBodySchema,
  CreateTokenBodySchema,
  CredentialRelationshipBodySchema,
  DeleteSpendAlertBodySchema,
  DeleteTokenBodySchema,
  DisableDataCollectionBodySchema,
  EnableDataCollectionBodySchema,
  FavoriteAccountBodySchema,
  FederateQuerySchema,
  GenerateConsoleUrlBodySchema,
  HiddenRoleBodySchema,
  ListAssumablesQuerySchema,
  ListResourcesQuerySchema,
  OptionalUserAccountRoleBodySchema,
  PrincipalArnBodySchema,
  RequestInputSchemas,
  RoleConfigBodySchema,
  SearchAssumablesQuerySchema,
  SetAccountNicknameBodySchema,
  TeamAccountBodySchema,
  TeamIdBodySchema,
  TeamIdQuerySchema,
  TeamMemberBodySchema,
  UpdateTeamMemberRoleBodySchema,
  UpdateTeamNameBodySchema,
};
export type { RequestInputSchema, RequestSchemaMap };
