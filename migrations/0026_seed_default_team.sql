-- Create default team
INSERT OR IGNORE INTO teams (team_id, team_name, created_at, created_by)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default', strftime('%s', 'now'), 'system');

-- Add all existing users as members of the default team
INSERT OR IGNORE INTO team_members (team_id, user_email, role, joined_at)
SELECT '00000000-0000-0000-0000-000000000000', user_email,
       CASE WHEN is_superadmin = 1 THEN 'admin' ELSE 'member' END,
       strftime('%s', 'now')
FROM user_metadata;

-- Associate all existing AWS accounts with the default team
INSERT OR IGNORE INTO team_accounts (team_id, aws_account_id)
SELECT '00000000-0000-0000-0000-000000000000', aws_account_id
FROM aws_accounts;
