interface Credential {
  principalArn: string;
  assumedBy?: string | undefined;
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  sessionToken?: string | undefined;
}

interface CredentialInternal {
  principal_arn: string;
  assumed_by?: string | undefined;
  encrypted_access_key_id?: string | undefined;
  encrypted_secret_access_key?: string | undefined;
  encrypted_session_token?: string | undefined;
  salt?: string | undefined;
}

export type { Credential, CredentialInternal };
