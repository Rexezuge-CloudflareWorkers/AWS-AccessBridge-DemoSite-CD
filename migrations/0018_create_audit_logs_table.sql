CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(36) PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    user_email VARCHAR(120) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(256),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(512) NOT NULL,
    status_code INTEGER NOT NULL,
    detail TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email_timestamp ON audit_logs(user_email, timestamp DESC);
