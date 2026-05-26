'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdminContext } from './AdminContext';
import { LayoutDashboard, Bell, Lock, Eye, EyeOff, ScrollText } from 'lucide-react';

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? '';

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/logs', label: 'API Logs', icon: ScrollText },
];

function AdminSecretGate({ children }: { children: React.ReactNode }) {
  const { secret, setSecret, isUnlocked } = useAdminContext();
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);

  async function unlock() {
    // Quick probe to validate the secret before accepting it
    const res = await fetch('/api/admin/stats', { headers: { 'x-admin-secret': input } });
    if (res.ok) {
      setSecret(input);
      setError(false);
    } else {
      setError(true);
    }
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-zinc-500" />
            <span className="text-zinc-400 font-medium">Admin access</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={show ? 'text' : 'password'}
                placeholder="Admin secret"
                value={input}
                onChange={e => { setInput(e.target.value); setError(false); }}
                onKeyDown={e => e.key === 'Enter' && unlock()}
                className={`w-full bg-zinc-900 border rounded px-3 py-2 text-sm pr-9 focus:outline-none focus:border-zinc-500 ${error ? 'border-red-700 text-red-400' : 'border-zinc-700 text-zinc-200'}`}
              />
              <button
                onClick={() => setShow(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
              >
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={unlock}
              disabled={!input}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm px-4 py-2 rounded"
            >
              Unlock
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">Wrong secret.</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setSecret } = useAdminContext();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-48 min-h-screen border-r border-zinc-800 p-4 flex flex-col gap-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-2 mb-3">Admin</p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-2 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
          <div className="mt-auto pt-4 border-t border-zinc-800">
            <button
              onClick={() => setSecret('')}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Lock admin
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8 min-h-screen">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (isLoaded && (!user || (ADMIN_USER_ID && user.id !== ADMIN_USER_ID))) {
    return <div className="p-8 text-red-500 bg-zinc-950 min-h-screen">Access denied.</div>;
  }

  return (
    <AdminProvider>
      <AdminSecretGate>
        <AdminShell>{children}</AdminShell>
      </AdminSecretGate>
    </AdminProvider>
  );
}
