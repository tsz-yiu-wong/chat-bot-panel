'use client';

import React, { createContext, useContext, useState } from 'react';
import { type UserRole } from '@/lib/permissions';

interface UserProfile {
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

interface UserContextType {
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  initialRole,
  initialProfile,
}: {
  children: React.ReactNode;
  initialRole: UserRole | null;
  initialProfile: UserProfile | null;
}) {
  const [userRole] = useState<UserRole | null>(initialRole);
  const [userProfile] = useState<UserProfile | null>(initialProfile);
  const [loading] = useState(false); // Data is now pre-fetched
  const [error] = useState<string | null>(null); // Errors can be handled on the server

  return (
    <UserContext.Provider value={{ userRole, userProfile, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
