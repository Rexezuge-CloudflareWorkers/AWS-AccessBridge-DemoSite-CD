interface AssumableAccount {
  roles: string[];
  hiddenRoles?: string[] | undefined;
  nickname?: string | undefined;
  favorite?: boolean | undefined;
}

type AssumableAccountsMap = Record<string, AssumableAccount>;

interface AssumableAccountsResponse {
  [accountId: string]: AssumableAccount | number;
  totalAccounts: number;
}

export type { AssumableAccount, AssumableAccountsMap, AssumableAccountsResponse };
