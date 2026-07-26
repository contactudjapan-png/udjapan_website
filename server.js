require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', '*'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session — cookie-based, persists across serverless invocations
app.use(cookieSession({
  name: 'udjsess',
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
}));

// Flash middleware (replaces connect-flash)
app.use((req, res, next) => {
  const flash = req.session._flash || {};
  req.session._flash = {};
  req.flash = (type, msg) => {
    if (!req.session._flash) req.session._flash = {};
    if (!req.session._flash[type]) req.session._flash[type] = [];
    req.session._flash[type].push(msg);
  };
  res.locals.success = flash.success || [];
  res.locals.error = flash.error || [];
  res.locals.adminUser = req.session.adminUser || null;
  next();
});

// Storage proxy — serves private bucket files via signed URLs
app.use('/storage', async (req, res) => {
  try {
    const db = require('./config/db');
    const parts = req.path.split('/').filter(Boolean);
    const bucket = parts[0];
    const filePath = parts.slice(1).join('/');
    const { data, error } = await db.storage.from(bucket).createSignedUrl(filePath, 3600);
    if (error || !data?.signedUrl) return res.status(404).send('Not found');
    res.redirect(data.signedUrl);
  } catch (err) {
    res.status(500).send('Storage error');
  }
});

// Routes
const publicRouter = require('./routes/public');
const adminRouter = require('./routes/admin');
const apiRouter = require('./routes/api');
const validatorRouter = require('./routes/validator');

app.use('/', publicRouter);
app.use('/admin', adminRouter);
app.use('/api', apiRouter);
app.use('/validate', validatorRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('public/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('public/error', { title: 'Server Error', message: err.message });
});

// ── Auto-seed in-memory DB on startup ────────────────────────────────────────
async function seedIfEmpty() {
  if (!process.env.USE_MEMORY_DB) return;
  const db = require('./config/db');
  const eventService = require('./services/eventService');

  const existing = await eventService.getAllEvents();
  if (existing.length > 0) return;

  console.log('[Seed] Populating in-memory DB with test data...');

  const names = ['রাহেলা বেগম','মো. আরিফ হোসেন','সুমাইয়া আক্তার','তানভীর আহমেদ','নাজমা খানম','শফিকুল ইসলাম','রুমানা পারভীন','মাহমুদুল হাসান','ফারজানা ইসলাম','আব্দুল্লাহ আল মামুন','তাহমিনা বেগম','রিয়াজ উদ্দিন','নুসরাত জাহান','মশিউর রহমান','শিরীন আক্তার','জাহিদুল হক','মাহফুজা খানম','সাইফুল আলম','রোকেয়া বেগম','ইমরান হোসেন','ডালিয়া রহমান','নাজমুল হুদা','সাবিনা ইয়াসমিন','মিজানুর রহমান','আফসানা মিমি','কামরুজ্জামান','নাদিয়া ইসলাম','হাসিবুর রহমান','মোসাম্মত লাইলা','আনিসুজ্জামান','প্রিয়া দত্ত','সুজন দাস','করিমা বেগম','শহিদুল ইসলাম','লিপি আক্তার','ইসমাইল হোসেন','নুরুন্নাহার','বেলাল হোসেন','তামান্না তাসনিম','রফিকুল ইসলাম'];
  const domains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','bangla.net'];
  const expDescs = ['ভেন্যু ভাড়া','সাউন্ড সিস্টেম','ডেকোরেশন','খাবার ও পানীয়','মুদ্রণ সামগ্রী','পরিবহন','ফটোগ্রাফি','ভিডিওগ্রাফি','স্টেজ ব্যবস্থাপনা','বিদ্যুৎ ও জেনারেটর','নিরাপত্তা','পরিষ্কার সেবা','ফুল ও সজ্জা','আলোকসজ্জা','মিডিয়া কভারেজ','স্মৃতিচিহ্ন','অতিথি আপ্যায়ন','ব্যানার ও সাইনেজ','টেকনিক্যাল সাপোর্ট','রেজিস্ট্রেশন ডেস্ক'];
  const stallNames = ['বাংলাদেশ হস্তশিল্প','জাপানি মিষ্টি','ঐতিহ্যবাহী পোশাক','স্থানীয় রন্ধনশিল্প','বইমেলা','গহনা ও জুয়েলারি','চিত্রকলা প্রদর্শনী','ফটো বুথ','স্বাস্থ্য কর্নার','শিশু খেলাঘর','সংগীত যন্ত্র','মসলা ও আচার','কুটিরশিল্প','মৃৎশিল্প','নকশিকাঁথা','রিকশা চিত্র','ঘরোয়া উদ্ভিদ','ডিজিটাল আর্ট','ফুডকোর্ট','পানীয় স্টল'];
  const volNames = ['সাজিয়া ইসলাম','তাওহীদুল ইসলাম','মারিয়া আক্তার','আরমান হোসেন','জান্নাতুল ফেরদৌস','রিফাত হাসান','সামিয়া রহমান','নাফিস আহমেদ','তানজিলা খানম','শাহেদ আলী','মিথিলা দাস','ওমর ফারুক','আয়েশা সিদ্দিকা','রাকিব হাসান','লুবনা আক্তার'];
  const tasks = ['রেজিস্ট্রেশন ডেস্ক','মঞ্চ ব্যবস্থাপনা','স্বাগত দল','নির্দেশনা সহায়তা','ফটোগ্রাফি সহায়তা','খাদ্য বিতরণ','পার্কিং ব্যবস্থাপনা','তথ্য কেন্দ্র','শিশু যত্ন','প্রাথমিক চিকিৎসা','মিডিয়া টিম','স্টল তদারকি','পরিষ্কার দল','নিরাপত্তা সহায়তা','কারিগরি সহায়তা'];
  const statuses = ['pending','approved','approved','approved','rejected'];

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

  const eventDefs = [
    { title: 'বাংলা নববর্ষ উৎসব ২০২৪', description: 'বাংলাদেশ সম্প্রদায়ের সবচেয়ে বড় বার্ষিক উৎসব। সংগীত, নৃত্য, খাবার এবং ঐতিহ্যবাহী পোশাকে সমৃদ্ধ এই আয়োজনে সকলকে স্বাগতম।', event_date: '2024-04-14T10:00:00', location: 'টোকিও বাংলাদেশ সেন্টার, জাপান', daysBack: 300 },
    { title: 'ঈদুল আযহা পুনর্মিলন ২০২৪', description: 'পবিত্র ঈদুল আযহা উপলক্ষে প্রবাসী বাংলাদেশিদের মিলনমেলা। একসাথে নামাজ, খাবার এবং আনন্দ ভাগ করে নেওয়ার সুযোগ।', event_date: '2024-06-17T09:00:00', location: 'ওসাকা কমিউনিটি হল, জাপান', daysBack: 200 },
    { title: 'জাপান-বাংলাদেশ সাংস্কৃতিক মেলা ২০২৫', description: 'দুই দেশের সংস্কৃতির মেলবন্ধনে আয়োজিত বিশেষ সাংস্কৃতিক অনুষ্ঠান। বাংলাদেশি ও জাপানি শিল্পীদের পরিবেশনায় এক অসাধারণ সন্ধ্যা।', event_date: '2025-09-20T14:00:00', location: 'শিনজুকু কালচারাল সেন্টার, টোকিও', daysBack: 60 },
  ];

  for (const def of eventDefs) {
    const { daysBack, ...eventData } = def;
    const ev = await eventService.createEvent({
      ...eventData,
      is_active: true,
      registration_open: true,
      max_capacity: 250,
      price_early_bird: 15,
      early_bird_deadline: new Date(new Date(def.event_date).getTime() - 30 * 86400000).toISOString(),
      price_mid: 25,
      mid_deadline: new Date(new Date(def.event_date).getTime() - 7 * 86400000).toISOString(),
      price_onspot: 35,
    });

    for (let i = 0; i < 200; i++) {
      const name = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '');
      const emailUser = name.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10) + i;
      await db.from('registrations').insert({
        event_id: ev.id, name,
        email: `${emailUser}@${rand(domains)}`,
        payment_reference: `PP-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
        is_paid: Math.random() > 0.25,
        qr_token: crypto.randomUUID(),
        created_at: daysAgo(randInt(1, daysBack)),
      });
    }

    for (let i = 0; i < 50; i++) {
      await db.from('expenses').insert({
        event_id: ev.id,
        description: expDescs[i % expDescs.length],
        amount: randFloat(50, 800),
        receipt_url: null,
        created_at: daysAgo(randInt(1, daysBack)),
      });
    }

    for (let i = 0; i < 20; i++) {
      const hasVendor = Math.random() > 0.3;
      await db.from('stalls').insert({
        event_id: ev.id,
        stall_name: stallNames[i % stallNames.length],
        description: `${stallNames[i % stallNames.length]} বিভাগের স্টল`,
        location_info: `এলাকা ${String.fromCharCode(65 + Math.floor(i / 5))}, বুথ ${(i % 5) + 1}`,
        assigned_to_name: hasVendor ? rand(names) : null,
        assigned_to_email: hasVendor ? `vendor${i}@${rand(domains)}` : null,
        assigned_to_phone: hasVendor ? `+81${randInt(70,90)}${randInt(1000,9999)}${randInt(1000,9999)}` : null,
        is_occupied: hasVendor,
        created_at: daysAgo(randInt(10, daysBack)),
      });
    }

    for (let i = 0; i < 15; i++) {
      const status = statuses[i % statuses.length];
      await db.from('volunteers').insert({
        event_id: ev.id,
        name: volNames[i],
        email: `vol${i}_${ev.id.slice(0,4)}@${rand(domains)}`,
        phone: `+81${randInt(70,90)}${randInt(1000,9999)}${randInt(1000,9999)}`,
        assigned_task: status === 'approved' ? tasks[i % tasks.length] : null,
        status,
        created_at: daysAgo(randInt(5, 60)),
      });
    }

    console.log(`[Seed] Event "${ev.title}" — 200 registrations, 50 expenses, 20 stalls, 15 volunteers`);
  }

  console.log('[Seed] Done.');
}

app.listen(PORT, async () => {
  console.log(`UDJapon running at http://localhost:${PORT}`);
  await seedIfEmpty().catch(err => console.error('[Seed] Error:', err.message));
});
