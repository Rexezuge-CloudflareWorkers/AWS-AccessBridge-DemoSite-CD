'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import AdminPage from './AdminPage';
import Unauthorized from './Unauthorized';

export default function AdminPageView() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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

  if (isAuthorized === null) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized || !isSuperAdmin) {
    return <Unauthorized />;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Navbar isSuperAdmin={isSuperAdmin} currentView="admin" userEmail={userEmail} />
      <AdminPage />
    </div>
  );
}
