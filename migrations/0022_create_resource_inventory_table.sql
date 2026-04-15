CREATE TABLE IF NOT EXISTS resource_inventory (
    aws_account_id VARCHAR(12) NOT NULL,
    region VARCHAR(20) NOT NULL,
    resource_type VARCHAR(10) NOT NULL,
    resource_id VARCHAR(256) NOT NULL,
    resource_name VARCHAR(256),
    state VARCHAR(50),
    metadata TEXT,
    collected_at INTEGER NOT NULL,
    PRIMARY KEY (aws_account_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_inventory_type ON resource_inventory(resource_type, aws_account_id);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_collected_at ON resource_inventory(collected_at);
CREATE INDEX IF NOT EXISTS idx_resource_inventory_account ON resource_inventory(aws_account_id);
