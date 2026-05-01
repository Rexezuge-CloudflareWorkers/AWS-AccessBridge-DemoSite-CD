'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from './Navbar';
import AccountList from './AccountList';
import Unauthorized from './Unauthorized';

export default function HomePage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const saved = localStorage.getItem('aws-access-bridge-page-size');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const saved = sessionStorage.getItem('aws-access-bridge-current-page');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [totalAccounts, setTotalAccounts] = useState(0);

  const handleSetTotalAccounts = useCallback((count: number) => {
    setTotalAccounts(count);
  }, []);

  const handleShowHiddenChange = useCallback((checked: boolean) => {
    setShowHidden(checked);
    setCurrentPage(1);
  }, []);

  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    localStorage.setItem('aws-access-bridge-page-size', pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    sessionStorage.setItem('aws-access-bridge-current-page', currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/me');
        if (response.status === 401) {
          setIsAuthorized(false);
        } else if (response.ok) {
          const userData = (await response.json()) as { isSuperAdmin?: boolean; email?: string };
          setIsAuthorized(true);
          setIsSuperAdmin(userData.isSuperAdmin || false);
          setUserEmail(userData.email || '');
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterOpen && !(event.target as Element).closest('.filter-dropdown')) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterOpen]);

  if (isAuthorized === null) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '2px solid #60a5fa',
              borderTopColor: 'transparent',
              margin: '0 auto 16px',
            }}
          ></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Unauthorized />;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Navbar isSuperAdmin={isSuperAdmin} currentView="accounts" userEmail={userEmail} />
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
          <h2 className="text-2xl font-bold" style={{ flexShrink: 0, color: '#f3f4f6' }}>
            AWS Accounts
          </h2>
          <input
            type="text"
            placeholder="Search by account id or nickname"
            value={searchTerm}
            onChange={(e) => handleSearchTermChange(e.target.value)}
            className="text-white placeholder-gray-500 focus:outline-none"
            style={{ flex: 1, padding: '10px 16px', background: '#1e2433', borderRadius: '8px', border: 'none', fontSize: '14px' }}
          />
          <div className="relative filter-dropdown" style={{ flexShrink: 0 }}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center text-gray-300 hover:text-white transition-colors"
              style={{ padding: '10px 12px', background: '#1e2433', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              <svg style={{ width: '16px', height: '16px', marginRight: '6px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filters
            </button>
            {filterOpen && (
              <div
                className="absolute right-0 shadow-xl z-10"
                style={{ marginTop: '8px', width: '208px', background: '#1e2433', borderRadius: '8px' }}
              >
                <div style={{ padding: '12px' }}>
                  <label className="flex items-center cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => handleShowHiddenChange(e.target.checked)}
                      style={{ marginRight: '10px' }}
                    />
                    Include Hidden
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          {!searchTerm.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="text-sm" style={{ color: '#9ca3af' }}>
                  Per page:
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-white text-sm focus:outline-none"
                  style={{ padding: '6px 8px', background: '#252d3d', borderRadius: '6px', border: 'none' }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              {totalAccounts > 0 && (
                <>
                  <div className="text-sm" style={{ color: '#6b7280' }}>
                    {Math.min((currentPage - 1) * pageSize + 1, totalAccounts)}&ndash;{Math.min(currentPage * pageSize, totalAccounts)} of{' '}
                    {totalAccounts}
                  </div>
                  {Math.ceil(totalAccounts / pageSize) > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          padding: '6px 10px',
                          background: '#252d3d',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: currentPage === 1 ? 'default' : 'pointer',
                        }}
                      >
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, Math.ceil(totalAccounts / pageSize)) }, (_, i) => {
                        const totalPages = Math.ceil(totalAccounts / pageSize);
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className="text-sm"
                            style={{
                              padding: '6px 12px',
                              background: currentPage === pageNum ? '#2563eb' : '#252d3d',
                              color: currentPage === pageNum ? '#fff' : '#d1d5db',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage(Math.min(Math.ceil(totalAccounts / pageSize), currentPage + 1))}
                        disabled={currentPage === Math.ceil(totalAccounts / pageSize)}
                        className="text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          padding: '6px 10px',
                          background: '#252d3d',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: currentPage === Math.ceil(totalAccounts / pageSize) ? 'default' : 'pointer',
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <AccountList
          showHidden={showHidden}
          searchTerm={searchTerm}
          pageSize={pageSize}
          currentPage={currentPage}
          setTotalAccounts={handleSetTotalAccounts}
        />
      </div>
    </div>
  );
}
