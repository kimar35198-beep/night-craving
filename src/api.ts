import type {
  AuthSession,
  MenuItem,
  OrderItemSummary,
  TrackedOrder,
} from './types';
import { DEMO_MENU_ITEMS } from './demoData';

const IS_STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === 'true';

const ORDERS_KEY = 'night-craving-demo-orders';
const OTP_KEY = 'night-craving-demo-otp';

const STAGE_DEFINITIONS = [
  { label: 'Order Received', detail: 'Ticket confirmed at the Night Craving pass' },
  { label: 'In the Kitchen', detail: 'Cooked to order over high heat' },
  { label: 'Thermal Seal', detail: 'Packed in insulated heat-retaining sleeve' },
  { label: 'Out for Delivery', detail: 'Dedicated in-house courier en route' },
  { label: 'Delivered', detail: 'Left at your door with confirmation' },
];

const COURIERS = [
  { name: 'Elena Rostova', vehicle: 'Stealth E-Bike · Insulated Box' },
  { name: 'Marcus Vance', vehicle: 'Compact EV · Heated Carrier' },
  { name: 'Devon Takahashi', vehicle: 'Stealth E-Bike · Thermal Seal' },
];

interface DemoOrder extends TrackedOrder {
  createdAtMs: number;
  simulatedOffsetMs: number;
}

interface OtpRecord {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

function normalizePhone(rawPhone: string): string | null {
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return null;
  return cleaned.startsWith('+') ? `+${digitsOnly}` : `+1${digitsOnly}`;
}

function maskPhone(phone: string): string {
  const lastFour = phone.replace(/\D/g, '').slice(-4);
  return `••• ••• ${lastFour}`;
}

function tokenForPhone(phone: string): string {
  return `demo.${btoa(phone)}`;
}

function phoneFromToken(token: string): string | null {
  try {
    if (!token.startsWith('demo.')) return null;
    const phone = atob(token.slice('demo.'.length));
    return normalizePhone(phone);
  } catch {
    return null;
  }
}

function readOrders(): DemoOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as DemoOrder[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: DemoOrder[]): void {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function computeOrderView(order: DemoOrder): TrackedOrder {
  const totalMs = order.estimatedTotalMinutes * 60 * 1000;
  const elapsedMs = Math.max(0, Date.now() - order.createdAtMs + order.simulatedOffsetMs);
  const progressRatio = Math.min(1, elapsedMs / totalMs);
  const progressPercent = Math.round(progressRatio * 100);

  let stageIndex = 0;
  if (progressRatio >= 1) stageIndex = 4;
  else if (progressRatio >= 0.55) stageIndex = 3;
  else if (progressRatio >= 0.4) stageIndex = 2;
  else if (progressRatio >= 0.12) stageIndex = 1;

  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  const stages = STAGE_DEFINITIONS.map((stage, idx) => ({
    index: idx,
    label: stage.label,
    detail: stage.detail,
    completed: idx < stageIndex || (stageIndex === 4 && idx === 4),
    active: idx === stageIndex && stageIndex < 4,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    phone: order.phone,
    maskedPhone: order.maskedPhone,
    address: order.address,
    notes: order.notes,
    items: order.items,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    courierName: order.courierName,
    courierVehicle: order.courierVehicle,
    createdAt: new Date(order.createdAtMs).toISOString(),
    estimatedTotalMinutes: order.estimatedTotalMinutes,
    remainingMinutes,
    etaIso: new Date(Date.now() + remainingMs).toISOString(),
    stageIndex,
    stageLabel: STAGE_DEFINITIONS[stageIndex].label,
    progressPercent,
    stages,
  };
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const body = data as { error?: string } | null;
  if (!res.ok) {
    throw new Error(body?.error || 'Request failed. Please try again.');
  }
  return data as T;
}

function jsonPost(body: unknown, token?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

export async function getMenu(): Promise<MenuItem[]> {
  if (IS_STATIC_DEMO) return DEMO_MENU_ITEMS;
  const data = await apiRequest<{ items: MenuItem[] }>('/api/menu');
  return Array.isArray(data.items) ? data.items : [];
}

export async function requestOtp(rawPhone: string): Promise<{
  phone: string;
  maskedPhone: string;
  previewOtp?: string;
}> {
  if (!IS_STATIC_DEMO) {
    return apiRequest('/api/request-otp', jsonPost({ phone: rawPhone }));
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error('Enter a valid 10 to 15 digit phone number.');

  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const code = String(100000 + (random[0] % 900000));
  const record: OtpRecord = { phone, code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };
  localStorage.setItem(OTP_KEY, JSON.stringify(record));

  return { phone, maskedPhone: maskPhone(phone), previewOtp: code };
}

export async function verifyOtp(rawPhone: string, otp: string): Promise<AuthSession> {
  if (!IS_STATIC_DEMO) {
    return apiRequest<AuthSession>('/api/verify-otp', jsonPost({ phone: rawPhone, otp }));
  }

  const phone = normalizePhone(rawPhone);
  if (!phone || otp.replace(/\D/g, '').length !== 6) {
    throw new Error('Enter your phone number and the 6-digit code.');
  }

  let record: OtpRecord | null = null;
  try {
    const raw = localStorage.getItem(OTP_KEY);
    record = raw ? (JSON.parse(raw) as OtpRecord) : null;
  } catch {
    record = null;
  }

  if (!record || record.phone !== phone) {
    throw new Error('No active code found for this number. Request a new code.');
  }
  if (Date.now() > record.expiresAt) {
    localStorage.removeItem(OTP_KEY);
    throw new Error('Verification code expired. Request a new code.');
  }
  if (record.attempts >= 5) {
    localStorage.removeItem(OTP_KEY);
    throw new Error('Too many incorrect codes. Request a new code.');
  }
  if (record.code !== otp.replace(/\D/g, '')) {
    record.attempts += 1;
    localStorage.setItem(OTP_KEY, JSON.stringify(record));
    throw new Error('Incorrect verification code. Check the digits and try again.');
  }

  localStorage.removeItem(OTP_KEY);
  return {
    token: tokenForPhone(phone),
    phone,
    maskedPhone: maskPhone(phone),
    verifiedAt: new Date().toISOString(),
  };
}

export async function getOrders(token: string): Promise<TrackedOrder[]> {
  if (!IS_STATIC_DEMO) {
    const data = await apiRequest<{ orders: TrackedOrder[] }>('/api/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return Array.isArray(data.orders) ? data.orders : [];
  }

  const phone = phoneFromToken(token);
  if (!phone) return [];
  return readOrders()
    .filter((order) => order.phone === phone)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .map(computeOrderView);
}

export async function createOrder(
  token: string,
  payload: {
    items: { menuId: string; quantity: number }[];
    address: string;
    notes: string;
  }
): Promise<TrackedOrder> {
  if (!IS_STATIC_DEMO) {
    const data = await apiRequest<{ order: TrackedOrder }>(
      '/api/orders',
      jsonPost(payload, token)
    );
    return data.order;
  }

  const phone = phoneFromToken(token);
  if (!phone) throw new Error('Phone verification required.');
  if (payload.address.trim().length < 5) {
    throw new Error('Enter a valid street address for late-night delivery.');
  }
  if (!payload.items.length || payload.items.length > 20) {
    throw new Error('Your bag must contain at least one item.');
  }

  const menuMap = new Map(DEMO_MENU_ITEMS.map((item) => [item.id, item]));
  const items: OrderItemSummary[] = [];
  let subtotalCents = 0;
  let maxPrepMinutes = 8;

  for (const entry of payload.items) {
    const item = menuMap.get(entry.menuId);
    if (!item || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 20) {
      throw new Error('Invalid item or quantity in your order.');
    }
    subtotalCents += item.priceCents * entry.quantity;
    maxPrepMinutes = Math.max(maxPrepMinutes, item.prepMinutes);
    items.push({
      menuId: item.id,
      name: item.name,
      quantity: entry.quantity,
      unitPriceCents: item.priceCents,
      lineTotalCents: item.priceCents * entry.quantity,
    });
  }

  const deliveryFeeCents = subtotalCents >= 79900 ? 0 : 4900;
  const taxCents = Math.round((subtotalCents * 0.05) / 100) * 100;
  const courier = COURIERS[Math.floor(Math.random() * COURIERS.length)];
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);

  const order: DemoOrder = {
    id: crypto.randomUUID(),
    orderNumber: `NC-${1000 + (random[0] % 9000)}`,
    phone,
    maskedPhone: maskPhone(phone),
    address: payload.address.trim().slice(0, 200),
    notes: payload.notes.trim().slice(0, 200),
    items,
    subtotalCents,
    deliveryFeeCents,
    taxCents,
    totalCents: subtotalCents + deliveryFeeCents + taxCents,
    courierName: courier.name,
    courierVehicle: courier.vehicle,
    createdAtMs: Date.now(),
    simulatedOffsetMs: 0,
    estimatedTotalMinutes: maxPrepMinutes + 14,
    createdAt: new Date().toISOString(),
    remainingMinutes: maxPrepMinutes + 14,
    etaIso: new Date(Date.now() + (maxPrepMinutes + 14) * 60000).toISOString(),
    stageIndex: 0,
    stageLabel: STAGE_DEFINITIONS[0].label,
    progressPercent: 0,
    stages: [],
  };

  writeOrders([order, ...readOrders()]);
  return computeOrderView(order);
}

export interface AdminStats {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  revenueCents: number;
}

function requireBackend(): void {
  if (IS_STATIC_DEMO) {
    throw new Error('Admin requires the backend server. Run npm run dev or deploy the Docker image.');
  }
}

export async function adminLogin(password: string): Promise<string> {
  requireBackend();
  const data = await apiRequest<{ token: string }>('/api/admin-login', jsonPost({ password }));
  return data.token;
}

export async function getAdminOrders(token: string): Promise<TrackedOrder[]> {
  requireBackend();
  const data = await apiRequest<{ orders: TrackedOrder[] }>('/api/admin-orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  requireBackend();
  return apiRequest<AdminStats>('/api/admin-stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function advanceAdminOrder(token: string, orderId: string): Promise<void> {
  requireBackend();
  await apiRequest(`/api/admin-advance?orderId=${encodeURIComponent(orderId)}`, jsonPost({}, token));
}

export async function advanceOrder(token: string, orderId: string): Promise<TrackedOrder> {
  if (!IS_STATIC_DEMO) {
    const data = await apiRequest<{ order: TrackedOrder }>(
      `/api/order-advance?orderId=${encodeURIComponent(orderId)}`,
      jsonPost({}, token)
    );
    return data.order;
  }

  const phone = phoneFromToken(token);
  if (!phone) throw new Error('Phone verification required.');
  const orders = readOrders();
  const order = orders.find((entry) => entry.id === orderId && entry.phone === phone);
  if (!order) throw new Error('Order not found.');

  const totalMs = order.estimatedTotalMinutes * 60 * 1000;
  const currentStage = computeOrderView(order).stageIndex;
  const nextStage = Math.min(4, currentStage + 1);
  const targetRatios = [0, 0.16, 0.44, 0.62, 1];
  const targetElapsedMs = Math.ceil(totalMs * targetRatios[nextStage]);
  const realElapsedMs = Date.now() - order.createdAtMs;
  order.simulatedOffsetMs = Math.max(order.simulatedOffsetMs, targetElapsedMs - realElapsedMs);
  writeOrders(orders);

  return computeOrderView(order);
}
