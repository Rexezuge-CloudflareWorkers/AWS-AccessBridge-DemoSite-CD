CREATE TABLE IF NOT EXISTS team_accounts (
    team_id VARCHAR(36) NOT NULL,
    aws_account_id CHAR(12) NOT NULL,
    PRIMARY KEY (team_id, aws_account_id)
);

CREATE INDEX IF NOT EXISTS idx_team_accounts_aws_account_id ON team_accounts(aws_account_id);
