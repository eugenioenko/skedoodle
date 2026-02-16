import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Navigate, Outlet } from 'react-router-dom';

export function AuthGuard() {
  const { token } = useAuthStore();

  if (!token) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the children routes
  return <Outlet />;
}