import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  LogOut,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  adminLogin,
  advanceAdminOrder,
  getAdminOrders,
  getAdminStats,
  type AdminStats,
} from '../api';
import type { TrackedOrder } from '../types';

const TOKEN_KEY = 'night-craving-admin-token';

function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '--:--';
  }
}

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async (authToken: string) => {
    try {
      const [nextOrders, nextStats] = await Promise.all([
        getAdminOrders(authToken),
        getAdminStats(authToken),
      ]);
      setOrders(nextOrders);
      setStats(nextStats);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Admin')) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setOrders([]);
      setStats(null);
      return;
    }
    refresh(token);
    const interval = window.setInterval(() => refresh(token), 5000);
    return () => window.clearInterval(interval);
  }, [token, refresh]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    try {
      const nextToken = await adminLogin(password);
      localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin sign-in failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAdvance = async (orderId: string) => {
    if (!token) return;
    setBusyId(orderId);
    try {
      await advanceAdminOrder(token, orderId);
      await refresh(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance the order.');
    } finally {
      setBusyId(null);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090B] px-6 text-zinc-100">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-800 bg-[#121215] p-8 shadow-2xl">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
              <ShieldCheck className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="font-display text-2xl font-normal">Night Craving · Kitchen Admin</h1>
            <p className="text-sm text-zinc-400">Enter the admin password to manage live orders.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="block text-xs font-medium text-zinc-300">
                Admin Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                placeholder="Admin password"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !password}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-500 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {loggingIn ? 'Signing in...' : 'Open Kitchen Dashboard'}
            </button>
          </form>

          <a href="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300">
            Back to customer site
          </a>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? '—', icon: Package },
    { label: 'Active', value: stats?.activeOrders ?? '—', icon: Truck },
    { label: 'Delivered', value: stats?.deliveredOrders ?? '—', icon: CheckCircle2 },
    { label: 'Revenue', value: stats ? formatPrice(stats.revenueCents) : '—', icon: IndianRupee },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#09090B]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-display text-lg leading-none">Night Craving</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">Kitchen Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refresh(token)}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="space-y-3 rounded-xl border border-zinc-800 bg-[#121215] p-5">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{label}</span>
                <Icon className="h-4 w-4 text-amber-400/80" />
              </div>
              <p className="font-display text-2xl text-zinc-100 tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-normal">Live Orders</h2>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="h-3.5 w-3.5" />
              Auto-refreshes every 5 seconds
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-[#121215] py-16 text-center">
              <p className="font-display text-xl text-zinc-200">No orders yet</p>
              <p className="mt-2 text-sm text-zinc-500">New customer orders will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border border-zinc-800 bg-[#121215] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-amber-400">{order.orderNumber}</span>
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                          {order.stageLabel}
                        </span>
                        <span className="text-[10px] text-zinc-600">placed {formatTime(order.createdAt)}</span>
                      </div>
                      <p className="text-sm text-zinc-200">{order.maskedPhone}</p>
                      <p className="text-xs text-zinc-500">{order.address}</p>
                      {order.notes && (
                        <p className="text-xs italic text-zinc-500">“{order.notes}”</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg text-zinc-100 tabular-nums">{formatPrice(order.totalCents)}</p>
                      <p className="text-[10px] text-zinc-500">ETA {order.remainingMinutes} min · {order.courierName}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${order.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600">
                      {order.stages.map((stage) => (
                        <span key={stage.index} className={stage.completed || stage.active ? 'text-amber-400/80' : ''}>
                          {stage.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                      {order.items.map((item) => (
                        <li key={item.menuId}>
                          <span className="font-mono text-zinc-300">{item.quantity}×</span> {item.name}
                        </li>
                      ))}
                    </ul>
                    {order.stageIndex < 4 && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => handleAdvance(order.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-xs font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                      >
                        Advance to {order.stages.find((stage) => stage.index === order.stageIndex + 1)?.label}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
