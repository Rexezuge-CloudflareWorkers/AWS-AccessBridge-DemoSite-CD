import { AwsAccountsDAO } from '@/dao/AwsAccountsDAO';
import { CostDataDAO } from '@/dao/CostDataDAO';
import { DataCollectionConfigDAO } from '@/dao/DataCollectionConfigDAO';
import { ResourceInventoryDAO } from '@/dao/ResourceInventoryDAO';
import { RoleConfigsDAO } from '@/dao/RoleConfigsDAO';
import { SpendAlertDAO } from '@/dao/SpendAlertDAO';
import { TeamAccountsDAO } from '@/dao/TeamAccountsDAO';
import { IScheduledTask } from './IScheduledTask';
import type { IEnv } from './IScheduledTask';

class OrphanedDataCleanupTask extends IScheduledTask<OrphanedDataCleanupTaskEnv> {
  protected async handleScheduledTask(_event: ScheduledController, env: OrphanedDataCleanupTaskEnv, _ctx: ExecutionContext): Promise<void> {
    const db: D1Database = env.AccessBridgeDB;

    const dataCollectionDeleted: number = await new DataCollectionConfigDAO(db).deleteOrphaned();
    const roleConfigsDeleted: number = await new RoleConfigsDAO(db).deleteOrphaned();
    const teamAccountsDeleted: number = await new TeamAccountsDAO(db).deleteOrphaned();
    const spendAlertsDeleted: number = await new SpendAlertDAO(db).deleteOrphaned();
    const costDataDeleted: number = await new CostDataDAO(db).deleteOrphaned();
    const resourceInventoryDeleted: number = await new ResourceInventoryDAO(db).deleteOrphaned();
    const awsAccountsDeleted: number = await new AwsAccountsDAO(db).deleteOrphaned();

    console.log(
      `Orphaned data cleanup: data_collection_config=${dataCollectionDeleted}, role_configs=${roleConfigsDeleted}, ` +
        `team_accounts=${teamAccountsDeleted}, spend_alerts=${spendAlertsDeleted}, cost_data=${costDataDeleted}, ` +
        `resource_inventory=${resourceInventoryDeleted}, aws_accounts=${awsAccountsDeleted}`,
    );
  }
}

interface OrphanedDataCleanupTaskEnv extends IEnv {
  AccessBridgeDB: D1Database;
}

export { OrphanedDataCleanupTask };
