interface AuditLog {
  logId: string;
  timestamp: number;
  userEmail: string;
  action: string;
  resource?: string | undefined;
  method: string;
  path: string;
  statusCode: number;
  detail?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

interface AuditLogInternal {
  log_id: string;
  timestamp: number;
  user_email: string;
  action: string;
  resource?: string | undefined;
  method: string;
  path: string;
  status_code: number;
  detail?: string | undefined;
  ip_address?: string | undefined;
  user_agent?: string | undefined;
}

export type { AuditLog, AuditLogInternal };
