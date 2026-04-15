CREATE TABLE IF NOT EXISTS data_collection_config (
    principal_arn VARCHAR(256) NOT NULL,
    collection_type VARCHAR(20) NOT NULL,
    last_collected_at INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (principal_arn, collection_type)
);

CREATE INDEX IF NOT EXISTS idx_data_collection_config_type_last ON data_collection_config(collection_type, last_collected_at ASC);
