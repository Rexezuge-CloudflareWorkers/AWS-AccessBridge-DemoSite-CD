import { CredentialsDAO, DataCollectionConfigDAO, ResourceInventoryDAO } from '@/dao';
import { AssumeRoleUtil, TimestampUtil, AwsApiUtil, ArnUtil } from '@/utils';
import type { CredentialChain, AccessKeys, AccessKeysWithExpiration, ResourceInventoryItem } from '@/model';
import type { ResourceDiscoveryItem } from '@/utils/AwsApiUtil';
import { IScheduledTask } from './IScheduledTask';
import type { IEnv } from './IScheduledTask';
import { DEFAULT_PRINCIPAL_TRUST_CHAIN_LIMIT } from '@/constants';

const RESOURCE_COLLECTION_INTERVAL_HOURS: number = 2;
const MAX_ACCOUNTS_PER_COLLECTION: number = 2;

class ResourceInventoryCollectionTask extends IScheduledTask<ResourceInventoryCollectionTaskEnv> {
  protected async handleScheduledTask(
    _event: ScheduledController,
    env: ResourceInventoryCollectionTaskEnv,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const cutoffTime: number = TimestampUtil.getCurrentUnixTimestampInSeconds() - RESOURCE_COLLECTION_INTERVAL_HOURS * 3600;
    const dataCollectionConfigDAO: DataCollectionConfigDAO = new DataCollectionConfigDAO(env.AccessBridgeDB);
    const principalArns: string[] = await dataCollectionConfigDAO.getPrincipalArnsNeedingCollection(
      'resource',
      MAX_ACCOUNTS_PER_COLLECTION,
      cutoffTime,
    );

    if (principalArns.length === 0) return;

    const masterKey: string = await env.AES_ENCRYPTION_KEY_SECRET.get();
    const principalTrustChainLimit: number = parseInt(env.PRINCIPAL_TRUST_CHAIN_LIMIT || DEFAULT_PRINCIPAL_TRUST_CHAIN_LIMIT);
    const credentialsDAO: CredentialsDAO = new CredentialsDAO(env.AccessBridgeDB, masterKey, principalTrustChainLimit);
    const resourceDAO: ResourceInventoryDAO = new ResourceInventoryDAO(env.AccessBridgeDB);

    for (const principalArn of principalArns) {
      try {
        const credentialChain: CredentialChain = await credentialsDAO.getCredentialChainByPrincipalArn(principalArn);
        let credential: AccessKeys = {
          accessKeyId: credentialChain.accessKeyId,
          secretAccessKey: credentialChain.secretAccessKey,
          sessionToken: credentialChain.sessionToken,
        };

        for (let i = credentialChain.principalArns.length - 2; i >= 0; i--) {
          const roleArn: string = credentialChain.principalArns[i];
          const assumed: AccessKeysWithExpiration = await AssumeRoleUtil.assumeRole(roleArn, credential, 'AccessBridge-ResourceCollection');
          credential = assumed;
        }

        const accountId: string = ArnUtil.getAccountIdFromArn(principalArn);
        const collectedAt: number = TimestampUtil.getCurrentUnixTimestampInSeconds();

        // Collect from multiple services
        const allItems: ResourceDiscoveryItem[] = [];
        try {
          allItems.push(...(await AwsApiUtil.describeInstances(credential)));
        } catch (e) {
          console.warn('EC2 collection failed:', e);
        }
        try {
          allItems.push(...(await AwsApiUtil.listBuckets(credential)));
        } catch (e) {
          console.warn('S3 collection failed:', e);
        }
        try {
          allItems.push(...(await AwsApiUtil.listFunctions(credential)));
        } catch (e) {
          console.warn('Lambda collection failed:', e);
        }
        try {
          allItems.push(...(await AwsApiUtil.describeDBInstances(credential)));
        } catch (e) {
          console.warn('RDS collection failed:', e);
        }

        for (const item of allItems) {
          const resource: ResourceInventoryItem = {
            awsAccountId: accountId,
            region: item.region,
            resourceType: item.resourceType,
            resourceId: item.resourceId,
            resourceName: item.resourceName,
            state: item.state,
            metadata: item.metadata,
            collectedAt,
          };
          await resourceDAO.upsertResource(resource);
        }

        // Clean stale resources
        for (const type of ['ec2', 's3', 'lambda', 'rds']) {
          await resourceDAO.deleteStaleResources(accountId, type, collectedAt);
        }

        await dataCollectionConfigDAO.updateLastCollectedTime(principalArn, 'resource');
        console.log(`Resource inventory collected for ${principalArn}: ${allItems.length} resources`);
      } catch (error: unknown) {
        console.error(`Failed to collect resources for ${principalArn}:`, error);
      }
    }
  }
}

interface ResourceInventoryCollectionTaskEnv extends IEnv {
  PRINCIPAL_TRUST_CHAIN_LIMIT?: string | undefined;
  AccessBridgeDB: D1Database;
  AES_ENCRYPTION_KEY_SECRET: SecretsStoreSecret;
}

export { ResourceInventoryCollectionTask };
