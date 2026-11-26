export type MenuCategory = 'Veg' | 'Non-Veg' | 'Drinks' | 'Dessert' | 'Tiffin Service';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  priceCents: number;
  prepMinutes: number;
  dietaryNote: string;
  imageUrl: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface AuthSession {
  token: string;
  phone: string;
  maskedPhone: string;
  verifiedAt: string;
}

export interface OrderStageDetail {
  index: number;
  label: string;
  detail: string;
  completed: boolean;
  active: boolean;
}

export interface OrderItemSummary {
  menuId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  phone: string;
  maskedPhone: string;
  address: string;
  notes: string;
  items: OrderItemSummary[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  courierName: string;
  courierVehicle: string;
  createdAt: string;
  estimatedTotalMinutes: number;
  remainingMinutes: number;
  etaIso: string;
  stageIndex: number;
  stageLabel: string;
  progressPercent: number;
  stages: OrderStageDetail[];
}
