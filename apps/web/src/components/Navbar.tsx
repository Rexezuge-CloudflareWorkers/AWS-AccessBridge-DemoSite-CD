'use client';

import Link from 'next/link';

interface NavbarProps {
  isSuperAdmin?: boolean;
  isDemoMode?: boolean;
  currentView?: 'accounts' | 'costs' | 'resources' | 'admin';
  userEmail?: string;
}

export default function Navbar({ isSuperAdmin = false, isDemoMode = false, currentView = 'accounts', userEmail = '' }: NavbarProps) {
  return (
    <>
      {isDemoMode && (
        <div className="bg-yellow-500 text-black text-center py-2 font-semibold text-sm sticky top-0 z-50">
          Demo Mode — Data shown is for demonstration purposes only. Admin operations are disabled.
        </div>
      )}
      <nav className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center space-x-6">
          <div className="text-xl font-bold">
            <span className="text-blue-400">AWS</span> AccessBridge
          </div>
          <div className="flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-1 rounded transition-colors ${
                currentView === 'accounts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Accounts
            </Link>
            <Link
              href="/costs"
              className={`px-3 py-1 rounded transition-colors ${
                currentView === 'costs' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Costs
            </Link>
            <Link
              href="/resources"
              className={`px-3 py-1 rounded transition-colors ${
                currentView === 'resources' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Resources
            </Link>
            {isSuperAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-1 rounded transition-colors ${
                  currentView === 'admin' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="text-sm flex items-center gap-2">
          {isSuperAdmin && <span className="bg-yellow-600 px-2 py-1 rounded text-xs">ADMIN</span>}
          <span>{userEmail}</span>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 7l4.5 4 4.5-4H5.5z" />
          </svg>
        </div>
      </nav>
    </>
  );
}
