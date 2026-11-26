import React from 'react';
import { Check, Clock, FastForward, MapPin, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import type { AuthSession, TrackedOrder } from '../types';
import { PhoneAuthPanel } from './PhoneAuthPanel';

interface OrderTrackerProps {
  session: AuthSession | null;
  orders: TrackedOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
  onAdvanceOrder: (id: string) => Promise<void>;
  advancingId: string | null;
  onAuthSuccess: (session: AuthSession) => void;
  onSignOut: () => void;
  loadingOrders: boolean;
}

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

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

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  session,
  orders,
  selectedOrderId,
  onSelectOrder,
  onAdvanceOrder,
  advancingId,
  onAuthSuccess,
  onSignOut,
  loadingOrders,
}) => {
  const activeOrder =
    orders.find((o) => o.id === selectedOrderId) || orders[0] || null;

  return (
    <section id="tracker" className="border-t border-zinc-800/80 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl space-y-3">
          <p className="text-xs font-medium tracking-wider text-amber-400">
            Member Access &amp; Live Dispatch
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-zinc-100 text-balance">
            Sign in with your phone and watch every minute to your door.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            No passwords or third-party courier handoffs. Verify once with SMS OTP to place orders and follow real-time kitchen prep and arrival estimates.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left column: Phone + OTP Sign-In or Verified Account Panel */}
          <div className="lg:col-span-5 rounded-xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 flex flex-col justify-between">
            {!session ? (
              <PhoneAuthPanel
                heading="Phone & OTP Sign-In"
                subheading="Instant access for late-night ordering and live arrival updates."
                onSuccess={onAuthSuccess}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 pb-6 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verified Session</span>
                    </div>
                    <p className="font-mono text-lg text-zinc-100 tabular-nums">
                      {session.phone}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Live dispatch telemetry enabled
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Your Tonight Orders</span>
                    <span className="font-mono tabular-nums">{orders.length}</span>
                  </div>

                  {loadingOrders ? (
                    <div className="py-6 text-xs text-zinc-500">
                      Loading your live orders...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-2">
                      <p className="text-sm text-zinc-200 font-medium">
                        Ready for your first midnight plate
                      </p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Select dishes from the menu below to start a live tracked kitchen ticket.
                      </p>
                      <a
                        href="#menu"
                        className="inline-block pt-1 text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-4"
                      >
                        Go to Midnight Menu
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {orders.map((order) => {
                        const isSelected = activeOrder?.id === order.id;
                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => onSelectOrder(order.id)}
                            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-amber-500/60 bg-amber-500/10'
                                : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm font-medium text-zinc-100 tabular-nums">
                                {order.orderNumber}
                              </span>
                              <span className="text-xs text-amber-400 font-medium tabular-nums">
                                {order.stageIndex === 4
                                  ? 'Delivered'
                                  : `ETA ${formatClockTime(order.etaIso)}`}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
                              <span className="truncate">{order.stageLabel}</span>
                              <span className="font-mono tabular-nums shrink-0">
                                {formatCurrency(order.totalCents)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Live Order Tracker & Estimated Arrival Time */}
          <div className="lg:col-span-7 rounded-xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 flex flex-col justify-between">
            {activeOrder ? (
              <div className="space-y-7">
                {/* ETA Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="font-mono text-zinc-200 tabular-nums">
                        {activeOrder.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeOrder.stageLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-3xl sm:text-4xl font-normal text-zinc-100 tabular-nums">
                        {activeOrder.stageIndex === 4
                          ? 'Delivered'
                          : formatClockTime(activeOrder.etaIso)}
                      </span>
                      <span className="font-mono text-sm text-amber-400 tabular-nums">
                        {activeOrder.stageIndex === 4
                          ? 'At your door'
                          : `${activeOrder.remainingMinutes} min remaining`}
                      </span>
                    </div>
                  </div>

                  {activeOrder.stageIndex < 4 && (
                    <button
                      type="button"
                      disabled={advancingId === activeOrder.id}
                      onClick={() => onAdvanceOrder(activeOrder.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <FastForward className="h-3.5 w-3.5 text-amber-400" />
                      <span>
                        {advancingId === activeOrder.id
                          ? 'Updating...'
                          : 'Simulate Next Stage'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Kitchen-to-door progress</span>
                    <span className="font-mono tabular-nums text-zinc-200">
                      {activeOrder.progressPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${activeOrder.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 5-Stage Timeline */}
                <ol className="space-y-3.5">
                  {activeOrder.stages.map((stage) => (
                    <li
                      key={stage.index}
                      className="flex items-start gap-3.5"
                    >
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                          stage.completed
                            ? 'border-amber-500 bg-amber-500 text-zinc-950'
                            : stage.active
                              ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-600'
                        }`}
                      >
                        {stage.completed ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <span className="font-mono text-[11px] tabular-nums">
                            {stage.index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              stage.completed || stage.active
                                ? 'text-zinc-100'
                                : 'text-zinc-500'
                            }`}
                          >
                            {stage.label}
                          </p>
                          {stage.active && (
                            <span className="text-xs font-medium text-amber-400 whitespace-nowrap">
                              In progress
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">{stage.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Courier & Address Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-zinc-800/80 text-xs">
                  <div className="flex items-start gap-2.5 text-zinc-300">
                    <Truck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-zinc-100">{activeOrder.courierName}</p>
                      <p className="text-zinc-400">{activeOrder.courierVehicle}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 text-zinc-300">
                    <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-zinc-100">Drop-off Address</p>
                      <p className="text-zinc-400 break-words">{activeOrder.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-between space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>Live Arrival Telemetry</span>
                  </div>
                  <h3 className="font-display text-2xl font-normal text-zinc-100">
                    Estimated arrival updates every minute from our pass.
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                    {session
                      ? 'Once you place an order from the midnight menu, your ticket ID, dedicated courier assignment, and exact arrival minute appear right here.'
                      : 'Sign in with your phone number on the left—or add dishes to your bag—to activate live kitchen and courier arrival tracking.'}
                  </p>
                </div>

                <div className="space-y-3 border-t border-zinc-800/80 pt-6">
                  <p className="text-xs font-medium text-zinc-300">
                    How Night Craving tracks your plate
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-400">
                    <div className="space-y-1">
                      <p className="font-mono text-zinc-200 tabular-nums">01 · Kitchen Pass</p>
                      <p>Prep timer locks to the longest-cooking dish on your ticket.</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-zinc-200 tabular-nums">02 · Thermal Seal</p>
                      <p>Packed in heated sleeves moments before courier handoff.</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-mono text-zinc-200 tabular-nums">03 · Live ETA</p>
                      <p>Minute-by-minute countdown with direct courier contact.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-zinc-400" />
                    <span>Average dispatch to arrival: 24–28 minutes</span>
                  </div>
                  <a
                    href="#menu"
                    className="text-amber-400 hover:text-amber-300 font-medium whitespace-nowrap"
                  >
                    Order Now
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
