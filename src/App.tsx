import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownRight,
  Clock,
  FastForward,
  Shield,
  ShieldCheck,
  Utensils,
} from 'lucide-react';
import { advanceOrder, getMenu, getOrders } from './api';
import { AuthModal } from './components/AuthModal';
import { BagDrawer } from './components/BagDrawer';
import { MenuModal } from './components/MenuModal';
import { Navbar } from './components/Navbar';
import { PhoneAuthPanel } from './components/PhoneAuthPanel';
import type { AuthSession, CartItem, MenuItem, TrackedOrder } from './types';

function formatClockTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '--:--';
  }
}

export default function App() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [menuModalOpen, setMenuModalOpen] = useState(false);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [bag, setBag] = useState<CartItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);

  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadMenu = async () => {
      try {
        const items = await getMenu();
        if (active) setMenuItems(items);
      } catch {
        if (active) setMenuError('Unable to load menu items right now.');
      } finally {
        if (active) setMenuLoading(false);
      }
    };
    loadMenu();
    return () => {
      active = false;
    };
  }, []);

  const fetchOrders = useCallback(async (authToken: string) => {
    try {
      const items = await getOrders(authToken);
      setOrders(items);
    } catch {
      // Keep previous orders on transient failure
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setOrders([]);
      return;
    }
    fetchOrders(session.token);
    const interval = window.setInterval(() => {
      fetchOrders(session.token);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [session, fetchOrders]);

  const handleAddToBag = (item: MenuItem) => {
    setBag((prev) => {
      const existing = prev.find((entry) => entry.menuItem.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.menuItem.id === item.id
            ? { ...entry, quantity: Math.min(20, entry.quantity + 1) }
            : entry
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQty = (menuId: string, delta: number) => {
    setBag((prev) =>
      prev
        .map((entry) =>
          entry.menuItem.id === menuId
            ? { ...entry, quantity: entry.quantity + delta }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const handleRemoveItem = (menuId: string) => {
    setBag((prev) => prev.filter((entry) => entry.menuItem.id !== menuId));
  };

  const handleOrderPlaced = (newOrder: TrackedOrder) => {
    setBag([]);
    setBagOpen(false);
    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleAdvanceOrder = async (orderId: string) => {
    if (!session) return;
    setAdvancingId(orderId);
    try {
      const updated = await advanceOrder(session.token, orderId);
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? updated : order))
      );
    } finally {
      setAdvancingId(null);
    }
  };

  const bagCount = bag.reduce((sum, entry) => sum + entry.quantity, 0);
  const latestOrder = orders[0] || null;

  return (
    <div id="top" className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      <Navbar
        session={session}
        bagCount={bagCount}
        onOpenMenu={() => setMenuModalOpen(true)}
        onOpenBag={() => setBagOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={() => setSession(null)}
      />

      <main className="flex-1">
        {/* Minimalist Nocturnal Hero + Phone OTP Login */}
        <section id="signin" className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Editorial Headline & Value Proposition */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-5">
                <p id="hours" className="text-xs font-medium tracking-wider text-amber-400">
                  Night Craving Kitchen · Open 24*7
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.75rem] font-normal leading-[1.06] tracking-tight text-zinc-100 text-balance max-w-xl">
                  Midnight cravings, plated to order.
                </h1>
                <p className="text-base text-zinc-400 leading-relaxed max-w-lg">
                  Night Craving cooks every late-night dish in our own dedicated kitchen and dispatches it via in-house couriers with live minute-by-minute arrival tracking.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMenuModalOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-amber-500 px-6 text-sm font-medium text-zinc-950 hover:bg-amber-400 transition-colors duration-150 whitespace-nowrap cursor-pointer"
                >
                  <span>Browse Menu</span>
                  <ArrowDownRight className="h-4 w-4" />
                </button>
                {!session && (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-800 bg-[#121215] px-5 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap cursor-pointer"
                  >
                    Sign In with Phone
                  </button>
                )}
                <a
                  href="#kitchen"
                  className="inline-flex h-12 items-center justify-center px-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap"
                >
                  Our Kitchen
                </a>
              </div>
            </div>

            {/* Right: Minimalist Phone & OTP Login Surface */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-zinc-800/90 bg-[#121215] p-6 sm:p-8">
                {session ? (
                  <div className="space-y-6 py-2">
                    <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-800/80">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Verified Member</span>
                        </div>
                        <p className="font-mono text-xl text-zinc-100 tabular-nums">
                          {session.phone}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Signed in via SMS one-time verification.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSession(null)}
                        className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Sign Out
                      </button>
                    </div>

                    {latestOrder ? (
                      <div className="space-y-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs text-zinc-400 tabular-nums">
                              {latestOrder.orderNumber} · {latestOrder.stageLabel}
                            </p>
                            <p className="font-display text-2xl text-zinc-100 tabular-nums">
                              {latestOrder.stageIndex === 4
                                ? 'Delivered'
                                : `ETA ${formatClockTime(latestOrder.etaIso)}`}
                            </p>
                          </div>
                          <span className="font-mono text-xs text-amber-400 tabular-nums">
                            {latestOrder.stageIndex === 4
                              ? 'At door'
                              : `${latestOrder.remainingMinutes} min`}
                          </span>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${latestOrder.progressPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                          <span>{latestOrder.courierName}</span>
                          {latestOrder.stageIndex < 4 && (
                            <button
                              type="button"
                              disabled={advancingId === latestOrder.id}
                              onClick={() => handleAdvanceOrder(latestOrder.id)}
                              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium cursor-pointer disabled:opacity-50"
                            >
                              <FastForward className="h-3.5 w-3.5" />
                              <span>Simulate Next Stage</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 text-sm text-zinc-300">
                        <p className="font-medium text-zinc-100">
                          Your phone is verified for Night Craving.
                        </p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Open the menu to pick from Veg, Non-Veg, Drinks, Dessert, or Tiffin Service and track your arrival time live.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMenuModalOpen(true)}
                          className="inline-flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          <span>Open Menu Categories</span>
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <PhoneAuthPanel
                    heading="Sign in with Phone"
                    subheading="Verify your mobile number with a 6-digit OTP to access Night Craving."
                    onSuccess={setSession}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Minimalist Kitchen Ethos Section */}
        <section id="kitchen" className="border-t border-zinc-800/80 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-5 space-y-3">
                <p className="text-xs font-medium tracking-wider text-amber-400">
                  Our Own Kitchen
                </p>
                <h2 className="font-display text-3xl font-normal tracking-tight text-zinc-100 text-balance">
                  Why Night Craving never uses marketplace middlemen.
                </h2>
              </div>
              <div id="tracking" className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div className="space-y-2.5">
                  <Utensils className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Single Dedicated Pass
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Every dish leaves our own late-night line directly into insulated packaging.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Honest Arrival Times
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Live ETAs are calculated from your dish prep time and our direct courier queue.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Direct Phone Verification
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your verified mobile number links directly to your courier for quiet doorstep drop-offs after midnight.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-800/80 py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-zinc-500">
          <div className="space-y-1">
            <p className="font-display text-base text-zinc-200">Night Craving</p>
            <p>Open 24*7 · Direct kitchen delivery</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setMenuModalOpen(true)}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Menu
            </button>
            <a href="#signin" className="hover:text-zinc-300 transition-colors">
              Phone Login
            </a>
            <a href="#kitchen" className="hover:text-zinc-300 transition-colors">
              Our Kitchen
            </a>
            <button
              type="button"
              onClick={() => setBagOpen(true)}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Bag
            </button>
          </div>
        </div>
      </footer>

      <MenuModal
        isOpen={menuModalOpen}
        onClose={() => setMenuModalOpen(false)}
        menuItems={menuItems}
        loading={menuLoading}
        error={menuError}
        bag={bag}
        onAddToBag={handleAddToBag}
        onUpdateQty={handleUpdateQty}
        onOpenBag={() => setBagOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={setSession}
      />

      <BagDrawer
        isOpen={bagOpen}
        onClose={() => setBagOpen(false)}
        items={bag}
        session={session}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onAuthSuccess={setSession}
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}
