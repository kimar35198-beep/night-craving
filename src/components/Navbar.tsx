import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { AuthSession } from '../types';

interface NavbarProps {
  session: AuthSession | null;
  bagCount: number;
  onOpenMenu: () => void;
  onOpenBag: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  bagCount,
  onOpenMenu,
  onOpenBag,
  onOpenAuth,
  onSignOut,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
        {/* Zone 1: Brand wordmark only */}
        <a
          href="#top"
          className="font-display text-xl font-medium tracking-tight text-zinc-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm"
        >
          Night Craving
        </a>

        {/* Zone 2: Concise single-line nav links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <button
            type="button"
            onClick={onOpenMenu}
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-amber-500 cursor-pointer"
          >
            Menu
          </button>
          <a
            href="#signin"
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-zinc-500"
          >
            Phone Login
          </a>
          <a
            href="#kitchen"
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-zinc-500"
          >
            Our Kitchen
          </a>
          <button
            type="button"
            onClick={onOpenBag}
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-zinc-500 cursor-pointer tabular-nums"
          >
            {bagCount > 0 ? `Bag (${bagCount})` : 'Bag'}
          </button>
          <a
            href="/admin"
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-zinc-500"
          >
            Admin
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="hidden md:flex items-center shrink-0">
          {session ? (
            <button
              type="button"
              onClick={onSignOut}
              className="px-4 py-2 text-xs font-medium text-zinc-100 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
              title={`Signed in as ${session.phone}`}
            >
              {session.maskedPhone} · Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-medium text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="md:hidden inline-flex items-center justify-center h-10 w-10 text-zinc-300 hover:text-zinc-100 rounded-md border border-zinc-800 bg-zinc-900/70"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-[#09090B] px-6 py-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenMenu();
            }}
            className="block w-full text-left py-2 text-sm text-amber-400 hover:text-amber-300 font-medium"
          >
            Menu
          </button>
          <a
            href="#signin"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-zinc-300 hover:text-zinc-100"
          >
            Phone Login
          </a>
          <a
            href="#kitchen"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-zinc-300 hover:text-zinc-100"
          >
            Our Kitchen
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenBag();
            }}
            className="block w-full text-left py-2 text-sm text-zinc-300 hover:text-zinc-100 tabular-nums"
          >
            {bagCount > 0 ? `Bag (${bagCount})` : 'Bag'}
          </button>
          <a
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm text-zinc-300 hover:text-zinc-100"
          >
            Admin
          </a>
          <div className="pt-2 border-t border-zinc-800">
            {session ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onSignOut();
                }}
                className="w-full px-4 py-2.5 text-xs font-medium text-zinc-100 border border-zinc-700 bg-zinc-900 rounded-md tabular-nums"
              >
                {session.maskedPhone} · Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth();
                }}
                className="w-full px-4 py-2.5 text-xs font-medium text-zinc-950 bg-amber-500 rounded-md"
              >
                Sign In with Phone
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
