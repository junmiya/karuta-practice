import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProfileCompleteRouteProps {
  children: ReactNode;
}

export function ProfileCompleteRoute({ children }: ProfileCompleteRouteProps) {
  const { isAuthenticated, isProfileComplete, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-karuta-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  if (!isProfileComplete) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
