interface UserAccessTokenMetadata {
  tokenId: string;
  userEmail: string;
  name: string;
  createdAt: number;
  expiresAt: number;
  lastUsedAt?: number | undefined;
}

interface UserAccessToken extends UserAccessTokenMetadata {
  accessToken: string;
}

interface UserAccessTokenInternal {
  token_id: string;
  user_email: string;
  access_token: string;
  name: string;
  created_at: number;
  expires_at: number;
  last_used_at?: number | undefined;
}

export type { UserAccessToken, UserAccessTokenMetadata, UserAccessTokenInternal };
