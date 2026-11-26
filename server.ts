import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const HAS_SMS_PROVIDER = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nightcraving-admin';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_PATH = 'night-craving/orders.json';

if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
  console.warn('[night-craving] SESSION_SECRET is not set; sessions will reset on restart. Set it in production.');
}
if (IS_PRODUCTION && !HAS_SMS_PROVIDER) {
  console.warn('[night-craving] No SMS provider configured: verification codes are returned to the browser (demo mode). Do not expose publicly.');
}
if (IS_PRODUCTION && !process.env.ADMIN_PASSWORD) {
  console.warn('[night-craving] ADMIN_PASSWORD is not set; using the default demo password. Change it before going public.');
}

interface ServerMenuItem {
  id: string;
  name: string;
  category: 'Veg' | 'Non-Veg' | 'Drinks' | 'Dessert' | 'Tiffin Service';
  description: string;
  priceCents: number;
  prepMinutes: number;
  dietaryNote: string;
  imageUrl: string;
}

const MENU_ITEMS: ServerMenuItem[] = [
  {
    id: 'charcoal-burrata-flatbread',
    name: 'Wood-Fired Burrata Flatbread',
    category: 'Veg',
    description: '72-hour fermented sourdough blistered at 850°F with crushed San Marzano tomatoes, cold pugliese burrata, and sweet basil.',
    priceCents: 44900,
    prepMinutes: 10,
    dietaryNote: 'Veg',
    imageUrl: '/src/assets/images/dish_charcoal_flatbread_1795651223215.jpg',
  },
  {
    id: 'wild-mushroom-risotto',
    name: 'Wild Mushroom Truffle Risotto',
    category: 'Veg',
    description: 'Slow-stirred carnaroli rice with roasted chanterelles, black truffle butter, crispy sage leaves, and aged parmigiano.',
    priceCents: 49900,
    prepMinutes: 13,
    dietaryNote: 'Veg',
    imageUrl: '/src/assets/images/dish_truffle_risotto_1795651945793.jpg',
  },
  {
    id: 'truffle-smash-burger',
    name: 'Black Truffle Wagyu Smash',
    category: 'Non-Veg',
    description: 'Double dry-aged wagyu patties, aged sharp cheddar, shaved black truffle aioli, and caramelized shallots on toasted brioche.',
    priceCents: 54900,
    prepMinutes: 12,
    dietaryNote: 'Non-Veg',
    imageUrl: '/src/assets/images/dish_truffle_burger_1795651221784.jpg',
  },
  {
    id: 'midnight-tonkotsu-ramen',
    name: 'Midnight Black Garlic Ramen',
    category: 'Non-Veg',
    description: '18-hour smoked pork bone broth, charred chashu belly, roasted black garlic tare, jammy ajitama egg, and rye noodles.',
    priceCents: 59900,
    prepMinutes: 14,
    dietaryNote: 'Non-Veg',
    imageUrl: '/src/assets/images/dish_midnight_ramen_1795651222420.jpg',
  },
  {
    id: 'crispy-gochujang-wings',
    name: 'Crispy Gochujang Wings',
    category: 'Non-Veg',
    description: 'Double-fried free-range wings lacquered in fermented chili glaze, toasted white sesame, and charred scallion oil.',
    priceCents: 37900,
    prepMinutes: 11,
    dietaryNote: 'Non-Veg',
    imageUrl: '/src/assets/images/dish_gochujang_wings_1795651222813.jpg',
  },
  {
    id: 'yuzu-espresso-tonic',
    name: 'Iced Yuzu Espresso Tonic',
    category: 'Drinks',
    description: 'Double ristretto pulled over cold-pressed Japanese yuzu botanical tonic, crushed crystal ice, and dehydrated citrus.',
    priceCents: 22900,
    prepMinutes: 4,
    dietaryNote: 'Zero Proof',
    imageUrl: '/src/assets/images/dish_yuzu_espresso_1795651223642.jpg',
  },
  {
    id: 'smoked-hibiscus-cooler',
    name: 'Smoked Blood Orange Hibiscus',
    category: 'Drinks',
    description: 'Steeped hibiscus flower infusion shaken with charred blood orange, smoked rosemary, and sparkling botanical bitters.',
    priceCents: 24900,
    prepMinutes: 4,
    dietaryNote: 'Zero Proof',
    imageUrl: '/src/assets/images/dish_hibiscus_cooler_1795651946168.jpg',
  },
  {
    id: 'burnt-basque-cheesecake',
    name: 'Espresso Burnt Basque Slice',
    category: 'Dessert',
    description: 'Caramelized high-heat custard cheesecake with a molten center and warm single-origin dark espresso reduction.',
    priceCents: 32900,
    prepMinutes: 6,
    dietaryNote: 'Veg',
    imageUrl: '/src/assets/images/dish_basque_cheesecake_1795651223180.jpg',
  },
  {
    id: 'dark-chocolate-tart',
    name: 'Salted Dark Chocolate Tart',
    category: 'Dessert',
    description: '70% single-origin cacao ganache set in a crisp dark cocoa shell, finished with flaky sea salt and roasted hazelnuts.',
    priceCents: 29900,
    prepMinutes: 5,
    dietaryNote: 'Veg',
    imageUrl: '/src/assets/images/dish_chocolate_tart_1795651946106.jpg',
  },
  {
    id: 'veg-midnight-tiffin',
    name: 'Veg Midnight Tiffin Box',
    category: 'Tiffin Service',
    description: '24-hour black lentil dal makhani, charred paneer tikka masala, saffron basmati rice, and buttered tandoori naan in an insulated box.',
    priceCents: 39900,
    prepMinutes: 14,
    dietaryNote: 'Veg · Multi-Course',
    imageUrl: '/src/assets/images/dish_veg_tiffin_1795652451750.jpg',
  },
  {
    id: 'nonveg-midnight-tiffin',
    name: 'Non-Veg Midnight Tiffin Box',
    category: 'Tiffin Service',
    description: 'Smoky charcoal butter chicken, slow-cooked black dal, saffron jeera pulao, blistered garlic naan, and pickled shallots.',
    priceCents: 46900,
    prepMinutes: 15,
    dietaryNote: 'Non-Veg · Multi-Course',
    imageUrl: '/src/assets/images/dish_nonveg_tiffin_1795652451982.jpg',
  },
];

interface OtpRecord {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  requestedCount: number;
  windowStart: number;
}

interface StoredOrderItem {
  menuId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

interface StoredOrder {
  id: string;
  orderNumber: string;
  phone: string;
  maskedPhone: string;
  address: string;
  notes: string;
  items: StoredOrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  courierName: string;
  courierVehicle: string;
  createdAtMs: number;
  simulatedOffsetMs: number;
  estimatedTotalMinutes: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    phone: string;
    maskedPhone: string;
    verifiedAt: string;
  };
}

const otpStore = new Map<string, OtpRecord>();
const orderStore = new Map<string, StoredOrder>();

async function loadOrdersFromBlob(): Promise<void> {
  if (!BLOB_TOKEN) return;
  try {
    const { get } = await import('@vercel/blob');
    const blob = await get(BLOB_PATH, { token: BLOB_TOKEN, access: 'private' });
    if (!blob) return;
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text) as StoredOrder[];
    if (!Array.isArray(parsed)) return;
    orderStore.clear();
    for (const order of parsed) {
      if (order && typeof order.id === 'string') orderStore.set(order.id, order);
    }
  } catch (error) {
    console.warn('[night-craving] Could not load orders from blob storage:', error);
  }
}

async function saveOrdersToBlob(): Promise<void> {
  if (!BLOB_TOKEN) return;
  try {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, JSON.stringify(Array.from(orderStore.values())), {
      access: 'private',
      token: BLOB_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('[night-craving] Could not save orders to blob storage:', error);
  }
}

const COURIERS = [
  { name: 'Elena Rostova', vehicle: 'Stealth E-Bike · Insulated Box' },
  { name: 'Marcus Vance', vehicle: 'Compact EV · Heated Carrier' },
  { name: 'Devon Takahashi', vehicle: 'Stealth E-Bike · Thermal Seal' },
];

const STAGE_DEFINITIONS = [
  { label: 'Order Received', detail: 'Ticket confirmed at the Night Craving pass' },
  { label: 'In the Kitchen', detail: 'Cooked to order over high heat' },
  { label: 'Thermal Seal', detail: 'Packed in insulated heat-retaining sleeve' },
  { label: 'Out for Delivery', detail: 'Dedicated in-house courier en route' },
  { label: 'Delivered', detail: 'Left at your door with confirmation' },
];

function normalizePhone(rawPhone: string): string | null {
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return null;
  }
  return cleaned.startsWith('+') ? `+${digitsOnly}` : `+1${digitsOnly}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const lastFour = digits.slice(-4);
  return `••• ••• ${lastFour}`;
}

function hashOtp(phone: string, otp: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(`${phone}:${otp}`).digest('hex');
}

function signSessionToken(payload: { phone: string; verifiedAt: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string): { phone: string; verifiedAt: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      phone?: unknown;
      verifiedAt?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.phone !== 'string' ||
      typeof parsed.verifiedAt !== 'string' ||
      typeof parsed.exp !== 'number' ||
      Date.now() > parsed.exp
    ) {
      return null;
    }
    return { phone: parsed.phone, verifiedAt: parsed.verifiedAt, exp: parsed.exp };
  } catch {
    return null;
  }
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Phone verification required.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Please verify your phone again.' });
    return;
  }
  req.user = {
    phone: payload.phone,
    maskedPhone: maskPhone(payload.phone),
    verifiedAt: payload.verifiedAt,
  };
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin sign-in required.' });
    return;
  }
  const payload = verifySessionToken(header.slice('Bearer '.length).trim());
  if (!payload || payload.phone !== 'admin') {
    res.status(401).json({ error: 'Admin session invalid or expired.' });
    return;
  }
  req.user = {
    phone: 'admin',
    maskedPhone: 'Kitchen Admin',
    verifiedAt: payload.verifiedAt,
  };
  next();
}

function computeOrderView(order: StoredOrder) {
  const totalMs = order.estimatedTotalMinutes * 60 * 1000;
  const elapsedMs = Math.max(0, Date.now() - order.createdAtMs + order.simulatedOffsetMs);
  const progressRatio = Math.min(1, elapsedMs / totalMs);
  const progressPercent = Math.round(progressRatio * 100);

  let stageIndex = 0;
  if (progressRatio >= 1) {
    stageIndex = 4;
  } else if (progressRatio >= 0.55) {
    stageIndex = 3;
  } else if (progressRatio >= 0.4) {
    stageIndex = 2;
  } else if (progressRatio >= 0.12) {
    stageIndex = 1;
  }

  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  const etaMs = Date.now() + remainingMs;

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
    etaIso: new Date(etaMs).toISOString(),
    stageIndex,
    stageLabel: STAGE_DEFINITIONS[stageIndex].label,
    progressPercent,
    stages,
  };
}

const API_ALIASES: Record<string, string> = {
  '/api/request-otp': '/api/auth/request-otp',
  '/api/verify-otp': '/api/auth/verify-otp',
  '/api/admin-login': '/api/admin/login',
  '/api/admin-orders': '/api/admin/orders',
  '/api/admin-stats': '/api/admin/stats',
};

function rewriteApiAliases(req: Request, _res: Response, next: NextFunction): void {
  const original = req.originalUrl || req.url;
  const question = original.indexOf('?');
  const pathname = question === -1 ? original : original.slice(0, question);
  const query = question === -1 ? '' : original.slice(question);
  let rewritten = API_ALIASES[pathname];

  if (!rewritten && (pathname === '/api/admin-advance' || pathname === '/api/order-advance')) {
    const params = new URLSearchParams(query.slice(1));
    const orderId = encodeURIComponent(params.get('orderId') || '');
    rewritten = pathname === '/api/admin-advance'
      ? `/api/admin/orders/${orderId}/advance`
      : `/api/orders/${orderId}/advance`;
  }

  if (rewritten) {
    req.url = `${rewritten}${query}`;
  }
  next();
}

export async function createApp() {
  const app = express();
  await loadOrdersFromBlob();
  app.disable('x-powered-by');
  app.use(rewriteApiAliases);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/menu', (_req, res) => {
    res.json({ items: MENU_ITEMS });
  });

  app.post('/api/auth/request-otp', (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const normalized = normalizePhone(rawPhone);
    if (!normalized) {
      res.status(400).json({ error: 'Enter a valid 10 to 15 digit phone number.' });
      return;
    }

    const now = Date.now();
    const existing = otpStore.get(normalized);
    const tenMinutesMs = 10 * 60 * 1000;

    let requestedCount = 1;
    let windowStart = now;
    if (existing && now - existing.windowStart < tenMinutesMs) {
      if (existing.requestedCount >= 5) {
        res.status(429).json({ error: 'Too many verification attempts. Wait a few minutes and try again.' });
        return;
      }
      requestedCount = existing.requestedCount + 1;
      windowStart = existing.windowStart;
    }

    const otp = String(crypto.randomInt(100000, 999999));
    otpStore.set(normalized, {
      otpHash: hashOtp(normalized, otp),
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      requestedCount,
      windowStart,
    });

    const responseBody: {
      ok: boolean;
      phone: string;
      maskedPhone: string;
      expiresInSeconds: number;
      previewOtp?: string;
    } = {
      ok: true,
      phone: normalized,
      maskedPhone: maskPhone(normalized),
      expiresInSeconds: 300,
    };

    if (!HAS_SMS_PROVIDER) {
      responseBody.previewOtp = otp;
    }

    res.json(responseBody);
  });

  app.post('/api/auth/verify-otp', (req, res) => {
    const rawPhone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const rawOtp = typeof req.body?.otp === 'string' ? req.body.otp.replace(/\D/g, '') : '';
    const normalized = normalizePhone(rawPhone);

    if (!normalized || rawOtp.length !== 6) {
      res.status(400).json({ error: 'Enter your phone number and the 6-digit code.' });
      return;
    }

    const record = otpStore.get(normalized);
    if (!record) {
      res.status(400).json({ error: 'No active code found for this number. Request a new code.' });
      return;
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalized);
      res.status(400).json({ error: 'Verification code expired. Request a new code.' });
      return;
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalized);
      res.status(429).json({ error: 'Too many incorrect codes. Request a new code.' });
      return;
    }

    const candidateHash = hashOtp(normalized, rawOtp);
    const candidateBuf = Buffer.from(candidateHash);
    const storedBuf = Buffer.from(record.otpHash);
    if (candidateBuf.length !== storedBuf.length || !crypto.timingSafeEqual(candidateBuf, storedBuf)) {
      record.attempts += 1;
      res.status(401).json({ error: 'Incorrect verification code. Check the digits and try again.' });
      return;
    }

    otpStore.delete(normalized);
    const verifiedAt = new Date().toISOString();
    const exp = Date.now() + 24 * 60 * 60 * 1000;
    const token = signSessionToken({ phone: normalized, verifiedAt, exp });

    res.json({
      token,
      phone: normalized,
      maskedPhone: maskPhone(normalized),
      verifiedAt,
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const userPhone = req.user!.phone;
    const userOrders = Array.from(orderStore.values())
      .filter((order) => order.phone === userPhone)
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map(computeOrderView);

    res.json({ orders: userOrders });
  });

  app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const address = typeof req.body?.address === 'string' ? req.body.address.trim().slice(0, 200) : '';
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 200) : '';

    if (address.length < 5) {
      res.status(400).json({ error: 'Enter a valid street address for late-night delivery.' });
      return;
    }

    if (rawItems.length === 0 || rawItems.length > 20) {
      res.status(400).json({ error: 'Your bag must contain at least one item.' });
      return;
    }

    const menuMap = new Map(MENU_ITEMS.map((item) => [item.id, item]));
    const validatedItems: StoredOrderItem[] = [];
    let subtotalCents = 0;
    let maxPrepMinutes = 8;

    for (const entry of rawItems) {
      const menuId = typeof entry?.menuId === 'string' ? entry.menuId : '';
      const quantity = Number(entry?.quantity);
      const item = menuMap.get(menuId);
      if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        res.status(400).json({ error: 'Invalid item or quantity in your order.' });
        return;
      }
      const lineTotalCents = item.priceCents * quantity;
      subtotalCents += lineTotalCents;
      maxPrepMinutes = Math.max(maxPrepMinutes, item.prepMinutes);
      validatedItems.push({
        menuId: item.id,
        name: item.name,
        quantity,
        unitPriceCents: item.priceCents,
        lineTotalCents,
      });
    }

    const deliveryFeeCents = subtotalCents >= 79900 ? 0 : 4900;
    const taxCents = Math.round((subtotalCents * 0.05) / 100) * 100;
    const totalCents = subtotalCents + deliveryFeeCents + taxCents;
    const estimatedTotalMinutes = maxPrepMinutes + 14;

    const id = crypto.randomUUID();
    const orderNumber = `NC-${crypto.randomInt(1000, 9999)}`;
    const courier = COURIERS[crypto.randomInt(0, COURIERS.length)];

    const newOrder: StoredOrder = {
      id,
      orderNumber,
      phone: req.user!.phone,
      maskedPhone: req.user!.maskedPhone,
      address,
      notes,
      items: validatedItems,
      subtotalCents,
      deliveryFeeCents,
      taxCents,
      totalCents,
      courierName: courier.name,
      courierVehicle: courier.vehicle,
      createdAtMs: Date.now(),
      simulatedOffsetMs: 0,
      estimatedTotalMinutes,
    };

    orderStore.set(id, newOrder);
    await saveOrdersToBlob();
    res.status(201).json({ order: computeOrderView(newOrder) });
  });

  app.post('/api/orders/:id/advance', requireAuth, async (req: AuthenticatedRequest, res) => {
    const orderId = String(req.params.id || '');
    const order = orderStore.get(orderId);
    if (!order || order.phone !== req.user!.phone) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const totalMs = order.estimatedTotalMinutes * 60 * 1000;
    const currentView = computeOrderView(order);
    const targetRatios = [0, 0.16, 0.44, 0.62, 1.0];
    const nextStage = Math.min(4, currentView.stageIndex + 1);
    const targetElapsedMs = Math.ceil(totalMs * targetRatios[nextStage]);
    const realElapsedMs = Date.now() - order.createdAtMs;
    order.simulatedOffsetMs = Math.max(order.simulatedOffsetMs, targetElapsedMs - realElapsedMs);
    await saveOrdersToBlob();

    res.json({ order: computeOrderView(order) });
  });

  // ---------- Kitchen admin ----------
  app.post('/api/admin/login', (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const candidate = Buffer.from(password);
    const expected = Buffer.from(ADMIN_PASSWORD);
    if (candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) {
      res.status(401).json({ error: 'Incorrect admin password.' });
      return;
    }
    const token = signSessionToken({
      phone: 'admin',
      verifiedAt: new Date().toISOString(),
      exp: Date.now() + 12 * 60 * 60 * 1000,
    });
    res.json({ token });
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    const orders = Array.from(orderStore.values())
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map(computeOrderView);
    res.json({ orders });
  });

  app.get('/api/admin/stats', requireAdmin, (_req, res) => {
    const orders = Array.from(orderStore.values()).map(computeOrderView);
    res.json({
      totalOrders: orders.length,
      activeOrders: orders.filter((order) => order.stageIndex < 4).length,
      deliveredOrders: orders.filter((order) => order.stageIndex === 4).length,
      revenueCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
    });
  });

  app.post('/api/admin/orders/:id/advance', requireAdmin, async (req, res) => {
    const orderId = String(req.params.id || '');
    const order = orderStore.get(orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const totalMs = order.estimatedTotalMinutes * 60 * 1000;
    const currentView = computeOrderView(order);
    const targetRatios = [0, 0.16, 0.44, 0.62, 1];
    const nextStage = Math.min(4, currentView.stageIndex + 1);
    const targetElapsedMs = Math.ceil(totalMs * targetRatios[nextStage]);
    const realElapsedMs = Date.now() - order.createdAtMs;
    order.simulatedOffsetMs = Math.max(order.simulatedOffsetMs, targetElapsedMs - realElapsedMs);
    await saveOrdersToBlob();

    res.json({ order: computeOrderView(order) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Night Craving server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start Night Craving server:', err);
    process.exit(1);
  });
}
