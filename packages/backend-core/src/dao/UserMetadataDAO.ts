import { DatabaseError } from '@/error';
import type { UserMetadataInternal } from '@/model';

class UserMetadataDAO {
  protected readonly database: D1Database | D1DatabaseSession;

  constructor(database: D1Database | D1DatabaseSession) {
    this.database = database;
  }

  public async ensureUserEmailExists(userEmail: string): Promise<void> {
    const result: D1Result = await this.database
      .prepare('INSERT OR IGNORE INTO user_metadata (user_email) VALUES (?)')
      .bind(userEmail)
      .run();
    if (!result.success) {
      throw new DatabaseError(`Failed to ensure user email exists: ${result.error}`);
    }
  }

  public async isSuperAdmin(userEmail: string): Promise<boolean> {
    const result: UserMetadataInternal | null = await this.database
      .prepare('SELECT is_superadmin FROM user_metadata WHERE user_email = ?')
      .bind(userEmail)
      .first<UserMetadataInternal>();
    return result?.is_superadmin ?? false;
  }

  public async getOrCreateFederationUsername(userEmail: string): Promise<string> {
    const result: UserMetadataInternal | null = await this.database
      .prepare('SELECT federation_username FROM user_metadata WHERE user_email = ?')
      .bind(userEmail)
      .first<UserMetadataInternal>();
    if (result?.federation_username) {
      return result.federation_username;
    }
    const federationUsername: string = crypto.randomUUID().replace(/-/g, '').toUpperCase();
    const updateResult: D1Result = await this.database
      .prepare('UPDATE user_metadata SET federation_username = ? WHERE user_email = ?')
      .bind(federationUsername, userEmail)
      .run();
    if (!updateResult.success) {
      throw new DatabaseError(`Failed to update federation username: ${updateResult.error}`);
    }
    return federationUsername;
  }
}

export { UserMetadataDAO };
