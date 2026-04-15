CREATE TABLE IF NOT EXISTS spend_alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    aws_account_id VARCHAR(12) NOT NULL,
    threshold_amount REAL NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period_type VARCHAR(10) NOT NULL DEFAULT 'monthly',
    created_by VARCHAR(120) NOT NULL,
    created_at INTEGER NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_spend_alerts_account ON spend_alerts(aws_account_id);
CREATE INDEX IF NOT EXISTS idx_spend_alerts_created_by ON spend_alerts(created_by);
