interface UserMetadata {
  userEmail: string;
  isSuperAdmin: boolean;
  federationUsername: string;
}

interface UserMetadataInternal {
  user_email?: string | undefined;
  is_superadmin?: boolean | undefined;
  federation_username?: string | undefined;
}

export type { UserMetadata, UserMetadataInternal };
