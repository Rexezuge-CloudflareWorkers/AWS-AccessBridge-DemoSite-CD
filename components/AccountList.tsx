'use client';

import { useState, useEffect, useCallback } from 'react';
import AccessKeyModal from './AccessKeyModal';

type RoleMap = Record<string, { roles: string[]; nickname?: string; favorite: boolean }>;

interface AccountListProps {
  showHidden: boolean;
  searchTerm: string;
  pageSize: number;
  currentPage: number;
  setTotalAccounts: (count: number) => void;
}

export default function AccountList({ showHidden, searchTerm, pageSize, currentPage, setTotalAccounts }: AccountListProps) {
  const [rolesData, setRolesData] = useState<RoleMap>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalData, setModalData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingKeys, setLoadingKeys] = useState<string | null>(null);
  const [loadingConsole, setLoadingConsole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);

    let url: string;
    if (searchTerm.trim()) {
      const params = new URLSearchParams();
      params.set('q', searchTerm.trim());
      if (showHidden) params.set('showHidden', 'true');
      url = `/api/user/assumables/search?${params.toString()}`;
    } else {
      const offset = (currentPage - 1) * pageSize;
      const params = new URLSearchParams();
      if (showHidden) params.set('showHidden', 'true');
      params.set('limit', pageSize.toString());
      params.set('offset', offset.toString());
      url = `/api/user/assumables?${params.toString()}`;
    }

    try {
      const res = await fetch(url);
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { Exception?: { Message?: string } } | null;
        const errorMsg = errorData?.Exception?.Message || `Failed to load accounts: ${res.status} ${res.statusText}`;
        throw new Error(errorMsg);
      }

      const data = (await res.json()) as RoleMap & { totalAccounts?: number };
      if (data) {
        if (searchTerm.trim()) {
          setRolesData(data);
          setTotalAccounts(Object.keys(data).length);
        } else {
          const { totalAccounts: total, ...accounts } = data;
          setRolesData(accounts);
          setTotalAccounts(total ?? 0);
        }
        setExpanded(Object.fromEntries(Object.keys(searchTerm.trim() ? data : data).map((id) => [id, false])));
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AWS accounts');
    } finally {
      setIsLoading(false);
    }
  }, [showHidden, currentPage, pageSize, searchTerm, setTotalAccounts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFavorite = async (accountId: string) => {
    const isFavorite = rolesData[accountId]?.favorite;

    try {
      const response = await fetch('/api/user/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awsAccountId: accountId }),
      });

      if (response.status === 401) {
        window.location.reload();
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to ${isFavorite ? 'unfavorite' : 'favorite'} account`);
      }

      setRolesData((prev) => ({
        ...prev,
        [accountId]: {
          ...prev[accountId],
          favorite: !isFavorite,
        },
      }));
    } catch (error) {
      console.error(error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
  };

  const handleAccessKeys = async (accountId: string, role: string) => {
    const principalArn = `arn:aws:iam::${accountId}:role/${role}`;
    const loadingKey = `${accountId}-${role}`;

    setLoadingKeys(loadingKey);
    try {
      const assumeRes = await fetch('/api/aws/assume-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ principalArn }),
      });

      if (assumeRes.status === 401) {
        window.location.reload();
        return;
      }

      if (!assumeRes.ok) {
        const errorText = await assumeRes.text();
        throw new Error(`Assume role failed: ${assumeRes.status} ${errorText}`);
      }

      const creds = await assumeRes.json();
      setModalData(creds);
    } catch (error) {
      console.error(error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoadingKeys(null);
    }
  };

  const handleConsole = async (accountId: string, role: string) => {
    const loadingKey = `${accountId}-${role}`;
    setLoadingConsole(loadingKey);
    try {
      const federateUrl = `/federate?awsAccountId=${accountId}&role=${encodeURIComponent(role)}`;
      window.open(federateUrl, '_blank');
    } catch (error) {
      console.error(error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoadingConsole(null);
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Accounts...</p>
        </div>
      )}
      {!isLoading && error && (
        <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      {!error && Object.keys(rolesData).length === 0 && !isLoading && (
        <div className="bg-yellow-800 border border-yellow-600 text-yellow-200 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>You don't have access to any AWS accounts.</span>
          </div>
        </div>
      )}
      {!isLoading &&
        Object.entries(rolesData).map(([accountId, accountData]) => (
          <div key={accountId} className="bg-gray-800 rounded p-4 my-2 text-white shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center cursor-pointer" onClick={() => toggleExpand(accountId)}>
                <svg
                  className={`w-3 h-3 mr-2 transform transition-transform ${expanded[accountId] ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-lg font-semibold">{accountData.nickname ? `${accountData.nickname} (${accountId})` : accountId}</div>
              </div>
              <button
                onClick={() => toggleFavorite(accountId)}
                className="text-2xl hover:scale-110 transition-transform"
                title={accountData.favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {accountData.favorite ? '⭐' : '☆'}
              </button>
            </div>
            {expanded[accountId] && (
              <div className="ml-6 mt-2 space-y-2">
                {accountData.roles.map((role) => {
                  const loadingKey = `${accountId}-${role}`;
                  const isLoadingKeys = loadingKeys === loadingKey;
                  const isLoadingConsole = loadingConsole === loadingKey;

                  return (
                    <div key={role} className="flex justify-between items-center">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isLoadingConsole) handleConsole(accountId, role);
                        }}
                        className={`transition-colors ${
                          isLoadingConsole ? 'text-gray-400 cursor-not-allowed' : 'text-blue-400 hover:underline'
                        }`}
                      >
                        {isLoadingConsole ? '⏳ Opening Console...' : role}
                      </a>
                      <button
                        className={`text-sm transition-colors ${isLoadingKeys ? 'text-gray-400' : 'text-blue-300 hover:text-blue-500'}`}
                        onClick={() => handleAccessKeys(accountId, role)}
                        disabled={isLoadingKeys}
                      >
                        {isLoadingKeys ? '⏳ Loading...' : '🔑 Access Keys'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

      {modalData && <AccessKeyModal {...modalData} onClose={() => setModalData(null)} />}
    </div>
  );
}
