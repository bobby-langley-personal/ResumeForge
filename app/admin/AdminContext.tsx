'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextValue {
  secret: string;
  setSecret: (s: string) => void;
  isUnlocked: boolean;
}

const AdminContext = createContext<AdminContextValue>({
  secret: '',
  setSecret: () => {},
  isUnlocked: false,
});

export function useAdminContext() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [secret, setSecretState] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('ea_admin_secret') ?? '';
    setSecretState(stored);
  }, []);

  function setSecret(s: string) {
    localStorage.setItem('ea_admin_secret', s);
    setSecretState(s);
  }

  return (
    <AdminContext.Provider value={{ secret, setSecret, isUnlocked: secret.length > 0 }}>
      {children}
    </AdminContext.Provider>
  );
}
