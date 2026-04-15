import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import AccountList from '../components/AccountList';
import AdminPage from '../components/AdminPage';
import CostDashboard from '../components/CostDashboard';
import ResourceInventory from '../components/ResourceInventory';
import Unauthorized from '../components/Unauthorized';

type View = 'accounts' | 'costs' | 'resources' | 'admin';

export default function SpaApp() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentView, setCurrentView] = useState<View>('accounts');
  const [showHidden, setShowHidden] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('aws-access-bridge-page-size');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('aws-access-bridge-current-page');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [totalAccounts, setTotalAccounts] = useState(0);

  const handleSetTotalAccounts = useCallback((count: number) => {
    setTotalAccounts(count);
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
          const userData = (await response.json()) as { isSuperAdmin?: boolean; email?: string; demoMode?: boolean };
          setIsAuthorized(true);
          setIsSuperAdmin(userData.isSuperAdmin || false);
          setIsDemoMode(userData.demoMode || false);
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
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-400 border-t-transparent mx-auto mb-4"></div>
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
      {isDemoMode && (
        <div className="bg-yellow-500 text-black text-center py-2 font-semibold text-sm sticky top-0 z-50">
          Demo Mode — Data shown is for demonstration purposes only. Admin operations are disabled.
        </div>
      )}
      <SpaNavbar
        isSuperAdmin={isSuperAdmin}
        currentView={currentView}
        setCurrentView={setCurrentView}
        userEmail={userEmail}
      />
      <div className="max-w-6xl mx-auto py-8">
        <div key={currentView} className="animate-fade-in-up">
        {currentView === 'admin' && isSuperAdmin ? (
          <AdminPage />
        ) : currentView === 'costs' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Cost Analytics</h2>
            <CostDashboard />
          </div>
        ) : currentView === 'resources' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Resource Inventory</h2>
            <ResourceInventory />
          </div>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <h2 className="text-2xl font-bold flex-shrink-0">AWS Accounts</h2>
              <input
                type="text"
                placeholder="Search by account id or nickname"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="flex-1 mx-6 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-400 focus:outline-none"
              />
              <div className="relative filter-dropdown flex-shrink-0">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className="flex items-center text-gray-300 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>
                {filterOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded shadow-lg z-10">
                    <div className="p-3">
                      <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={showHidden} onChange={(e) => { setShowHidden(e.target.checked); setCurrentPage(1); }} className="mr-2" />
                        Include Hidden
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4 space-y-4">
              {!searchTerm.trim() && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-300">Accounts per page:</label>
                    <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-400 focus:outline-none">
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  {totalAccounts > 0 && (
                    <>
                      <div className="text-sm text-gray-400">
                        Showing {Math.min((currentPage - 1) * pageSize + 1, totalAccounts)}-{Math.min(currentPage * pageSize, totalAccounts)} of {totalAccounts} accounts
                      </div>
                      {Math.ceil(totalAccounts / pageSize) > 1 && (
                        <div className="flex items-center space-x-1">
                          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                          {Array.from({ length: Math.min(5, Math.ceil(totalAccounts / pageSize)) }, (_, i) => {
                            const totalPages = Math.ceil(totalAccounts / pageSize);
                            let pageNum;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (currentPage <= 3) pageNum = i + 1;
                            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = currentPage - 2 + i;
                            return (
                              <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1 text-sm rounded border ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'}`}>{pageNum}</button>
                            );
                          })}
                          <button onClick={() => setCurrentPage(Math.min(Math.ceil(totalAccounts / pageSize), currentPage + 1))} disabled={currentPage === Math.ceil(totalAccounts / pageSize)} className="px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <AccountList showHidden={showHidden} searchTerm={searchTerm} pageSize={pageSize} currentPage={currentPage} setTotalAccounts={handleSetTotalAccounts} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function SpaNavbar({ isSuperAdmin, currentView, setCurrentView, userEmail }: {
  isSuperAdmin: boolean;
  currentView: View;
  setCurrentView: (view: View) => void;
  userEmail: string;
}) {
  return (
    <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow">
      <div className="flex items-center space-x-6">
        <div className="text-xl font-bold">
          <span className="text-blue-400">AWS</span> AccessBridge
        </div>
        <div className="flex space-x-4">
          <button onClick={() => setCurrentView('accounts')} className={`px-3 py-1 rounded transition-colors ${currentView === 'accounts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>Accounts</button>
          <button onClick={() => setCurrentView('costs')} className={`px-3 py-1 rounded transition-colors ${currentView === 'costs' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>Costs</button>
          <button onClick={() => setCurrentView('resources')} className={`px-3 py-1 rounded transition-colors ${currentView === 'resources' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>Resources</button>
          {isSuperAdmin && (
            <button onClick={() => setCurrentView('admin')} className={`px-3 py-1 rounded transition-colors ${currentView === 'admin' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'}`}>Admin</button>
          )}
        </div>
      </div>
      <div className="text-sm flex items-center gap-2">
        {isSuperAdmin && <span className="bg-yellow-600 px-2 py-1 rounded text-xs">ADMIN</span>}
        <span>{userEmail}</span>
      </div>
    </nav>
  );
}
