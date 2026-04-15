CREATE TABLE IF NOT EXISTS cost_data (
    aws_account_id VARCHAR(12) NOT NULL,
    period_start VARCHAR(10) NOT NULL,
    period_end VARCHAR(10) NOT NULL,
    total_cost REAL NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    service_breakdown TEXT,
    collected_at INTEGER NOT NULL,
    PRIMARY KEY (aws_account_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_cost_data_account_period ON cost_data(aws_account_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_cost_data_collected_at ON cost_data(collected_at);
