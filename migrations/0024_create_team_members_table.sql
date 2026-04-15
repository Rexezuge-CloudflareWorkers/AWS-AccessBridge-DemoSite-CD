CREATE TABLE IF NOT EXISTS team_members (
    team_id VARCHAR(36) NOT NULL,
    user_email VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (team_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_email ON team_members(user_email);
