import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import type { CartItem, MenuCategory, MenuItem } from '../types';
import { ResilientImage } from './ResilientImage';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  bag: CartItem[];
  onAddToBag: (item: MenuItem) => void;
  onUpdateQty: (menuId: string, delta: number) => void;
  onOpenBag: () => void;
}

const CATEGORIES: Array<{
  key: MenuCategory;
  index: string;
  label: string;
  subtitle: string;
}> = [
  {
    key: 'Veg',
    index: '01',
    label: 'Veg',
    subtitle: 'Wood-fired flatbreads and slow-stirred truffle plates.',
  },
  {
    key: 'Non-Veg',
    index: '02',
    label: 'Non-Veg',
    subtitle: 'Seared wagyu, 18-hour tonkotsu broth, and crispy wings.',
  },
  {
    key: 'Drinks',
    index: '03',
    label: 'Drinks',
    subtitle: 'Cold-pressed yuzu tonics and smoked botanical nightcaps.',
  },
  {
    key: 'Dessert',
    index: '04',
    label: 'Dessert',
    subtitle: 'Caramelized Basque cheesecake and dark cacao tarts.',
  },
  {
    key: 'Tiffin Service',
    index: '05',
    label: 'Tiffin Service',
    subtitle: 'Complete late-night multi-course Veg & Non-Veg insulated meal boxes.',
  },
];

function formatPrice(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  loading,
  error,
  bag,
  onAddToBag,
  onUpdateQty,
  onOpenBag,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bagCount = bag.reduce((sum, entry) => sum + entry.quantity, 0);
  const bagSubtotal = bag.reduce(
    (sum, entry) => sum + entry.menuItem.priceCents * entry.quantity,
    0
  );

  const visibleItems = selectedCategory
    ? menuItems.filter((item) => item.category === selectedCategory)
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Night Craving Menu"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#09090B] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Categories</span>
              </button>
            )}
            <h2 className="font-display text-xl font-normal text-zinc-100">
              {selectedCategory ? `Menu · ${selectedCategory}` : 'Midnight Menu Categories'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Switcher Strip when inside a category */}
        {selectedCategory && (
          <div className="border-b border-zinc-800/80 bg-[#121215] px-6 py-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                    }`}
                  >
                    {cat.index}. {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedCategory ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Select a category to browse plates cooked to order tonight.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CATEGORIES.map((cat, idx) => {
                  const count = menuItems.filter((item) => item.category === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`group flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#121215] p-6 text-left hover:border-amber-500/60 transition-colors cursor-pointer ${
                        idx === CATEGORIES.length - 1 ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className="font-mono text-xs text-amber-400 tabular-nums">
                          {cat.index}
                        </span>
                        <span className="font-mono text-xs text-zinc-500 tabular-nums">
                          {count} items
                        </span>
                      </div>
                      <div className="mt-5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-2xl font-normal text-zinc-100 group-hover:text-amber-400 transition-colors">
                            {cat.label}
                          </h3>
                          <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {cat.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Loading {selectedCategory} selections...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-300">{error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {visibleItems.map((item) => {
                const inBag = bag.find((entry) => entry.menuItem.id === item.id);
                return (
                  <article
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-800/90 bg-[#121215] overflow-hidden"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-950">
                        <ResilientImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-5 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{item.prepMinutes} min prep</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-base font-semibold text-zinc-100">
                            {item.name}
                          </h3>
                          <span className="font-mono text-sm font-medium text-zinc-100 tabular-nums shrink-0">
                            {formatPrice(item.priceCents)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5">
                      {inBag ? (
                        <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => onUpdateQty(item.id, -1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="font-mono text-xs font-medium text-zinc-100 tabular-nums">
                            {inBag.quantity} in bag
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one more ${item.name}`}
                            onClick={() => onUpdateQty(item.id, 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToBag(item)}
                          className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 text-xs font-medium text-zinc-100 hover:border-amber-500/60 hover:bg-amber-500 hover:text-zinc-950 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Add to Bag
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Bag Summary Footer when items added */}
        {bagCount > 0 && (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-800 bg-[#121215] px-6 py-4">
            <div className="flex items-center gap-2.5 text-sm text-zinc-200">
              <ShoppingBag className="h-4 w-4 text-amber-400" />
              <span className="font-mono tabular-nums">
                {bagCount} {bagCount === 1 ? 'item' : 'items'} · {formatPrice(bagSubtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBag();
              }}
              className="px-4 py-2 text-xs font-medium text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Review Bag &amp; Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
