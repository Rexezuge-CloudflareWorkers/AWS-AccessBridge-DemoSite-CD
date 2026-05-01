interface AccessKeys {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string | undefined;
}

interface AccessKeysWithExpiration extends AccessKeys {
  expiration?: string | undefined;
}

export type { AccessKeys, AccessKeysWithExpiration };
