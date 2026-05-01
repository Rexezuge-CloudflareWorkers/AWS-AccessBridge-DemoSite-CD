import { AuditLogDAO } from '@/dao/AuditLogDAO';
import { TimestampUtil } from '@/utils';
import { IScheduledTask } from './IScheduledTask';
import type { IEnv } from './IScheduledTask';
import { DEFAULT_AUDIT_LOG_RETENTION_DAYS } from '@/constants';

class AuditLogCleanupTask extends IScheduledTask<AuditLogCleanupTaskEnv> {
  protected async handleScheduledTask(_event: ScheduledController, env: AuditLogCleanupTaskEnv, _ctx: ExecutionContext): Promise<void> {
    const retentionDays: number = parseInt(env.AUDIT_LOG_RETENTION_DAYS || DEFAULT_AUDIT_LOG_RETENTION_DAYS);
    const cutoff: number = TimestampUtil.getCurrentUnixTimestampInSeconds() - retentionDays * 86400;
    const auditLogDAO: AuditLogDAO = new AuditLogDAO(env.AccessBridgeDB);
    await auditLogDAO.deleteOlderThan(cutoff);
    console.log(`Audit log cleanup: deleted entries older than ${retentionDays} days`);
  }
}

interface AuditLogCleanupTaskEnv extends IEnv {
  AUDIT_LOG_RETENTION_DAYS?: string | undefined;
  AccessBridgeDB: D1Database;
}

export { AuditLogCleanupTask };
