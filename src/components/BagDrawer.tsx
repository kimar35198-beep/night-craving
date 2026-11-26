import React, { useEffect, useState } from 'react';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { createOrder } from '../api';
import type { AuthSession, CartItem, TrackedOrder } from '../types';
import { PhoneAuthPanel } from './PhoneAuthPanel';
import { ResilientImage } from './ResilientImage';

interface BagDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  session: AuthSession | null;
  onUpdateQty: (menuId: string, delta: number) => void;
  onRemoveItem: (menuId: string) => void;
  onAuthSuccess: (session: AuthSession) => void;
  onOrderPlaced: (order: TrackedOrder) => void;
}

function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export const BagDrawer: React.FC<BagDrawerProps> = ({
  isOpen,
  onClose,
  items,
  session,
  onUpdateQty,
  onRemoveItem,
  onAuthSuccess,
  onOrderPlaced,
}) => {
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.menuItem.priceCents * item.quantity,
    0
  );
  const deliveryFeeCents = subtotalCents === 0 ? 0 : subtotalCents >= 79900 ? 0 : 4900;
  const taxCents = Math.round((subtotalCents * 0.05) / 100) * 100;
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setError(null);

    if (address.trim().length < 5) {
      setError('Enter a street address (at least 5 characters) for late-night delivery.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder(session.token, {
        items: items.map((entry) => ({
          menuId: entry.menuItem.id,
          quantity: entry.quantity,
        })),
        address: address.trim(),
        notes: notes.trim(),
      });
      onOrderPlaced(order);
      setAddress('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while placing your order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Order Bag"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-[#09090B] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            <h2 className="font-display text-lg font-normal text-zinc-100">
              Your Late-Night Bag
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bag drawer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="font-display text-xl text-zinc-200">Your bag is empty</p>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                Add cooked-to-order dishes from the Night Craving kitchen to start a live delivery.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-zinc-800/80">
                {items.map(({ menuItem, quantity }) => (
                  <li key={menuItem.id} className="py-4 first:pt-0 flex gap-4">
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
                      <ResilientImage
                        src={menuItem.imageUrl}
                        alt={menuItem.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {menuItem.name}
                        </p>
                        <span className="font-mono text-sm text-zinc-200 tabular-nums shrink-0">
                          {formatPrice(menuItem.priceCents * quantity)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 font-mono tabular-nums">
                        {formatPrice(menuItem.priceCents)} each · {menuItem.prepMinutes}m prep
                      </p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${menuItem.name}`}
                            onClick={() => onUpdateQty(menuItem.id, -1)}
                            className="inline-flex h-7 w-7 items-center justify-center text-zinc-300 hover:text-zinc-100 cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs text-zinc-100 tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${menuItem.name}`}
                            onClick={() => onUpdateQty(menuItem.id, 1)}
                            className="inline-flex h-7 w-7 items-center justify-center text-zinc-300 hover:text-zinc-100 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${menuItem.name}`}
                          onClick={() => onRemoveItem(menuItem.id)}
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Totals */}
              <div className="rounded-lg border border-zinc-800/80 bg-[#121215] p-4 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-zinc-200 tabular-nums">
                    {formatPrice(subtotalCents)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Direct Courier Delivery</span>
                  <span className="font-mono text-zinc-200 tabular-nums">
                    {deliveryFeeCents === 0 ? 'Free' : formatPrice(deliveryFeeCents)}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>GST (5%)</span>
                  <span className="font-mono text-zinc-200 tabular-nums">
                    {formatPrice(taxCents)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-2.5 text-sm font-medium text-zinc-100">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatPrice(totalCents)}</span>
                </div>
              </div>

              {/* Auth gate or Delivery checkout */}
              {!session ? (
                <div className="rounded-lg border border-zinc-800 bg-[#121215] p-5">
                  <PhoneAuthPanel
                    compact
                    heading="Verify Phone to Checkout"
                    subheading="Sign in with your mobile number to confirm your order and receive live arrival updates."
                    onSuccess={onAuthSuccess}
                  />
                </div>
              ) : (
                <form id="nc-checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Ordering as</span>
                    <span className="font-mono text-zinc-200 tabular-nums">
                      {session.maskedPhone}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="nc-address" className="block text-xs font-medium text-zinc-300">
                      Delivery Street Address
                    </label>
                    <input
                      id="nc-address"
                      type="text"
                      required
                      placeholder="742 Evergreen Terrace, Apt 4B"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setError(null);
                      }}
                      className="h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="nc-notes" className="block text-xs font-medium text-zinc-300">
                      Drop-off Instructions (Optional)
                    </label>
                    <input
                      id="nc-notes"
                      type="text"
                      placeholder="Call on arrival, leave quietly on bench"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-11 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs text-red-200"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-11 w-full items-center justify-center rounded-md bg-amber-500 px-5 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {submitting
                      ? 'Confirming with Kitchen...'
                      : `Place Order · ${formatPrice(totalCents)}`}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
