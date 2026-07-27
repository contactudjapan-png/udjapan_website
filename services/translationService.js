const db = require('../config/db');

// Cache: { bn: { 'nav.logo': '...', ... }, en: { ... }, de: { ... } }
let _cache = null;

const SUPPORTED_LOCALES = ['bn', 'en', 'de'];

const SEEDS = [
  // nav
  { key: 'nav.logo',              value: 'উদযাপন' },
  { key: 'nav.events',            value: 'ইভেন্টসমূহ' },
  { key: 'nav.privacy',           value: 'গোপনীয়তা' },
  { key: 'nav.volunteer',         value: 'স্বেচ্ছাসেবী কর্নার' },
  { key: 'nav.admin',             value: 'অ্যাডমিন' },
  // home
  { key: 'home.coming_soon',      value: 'শীঘ্রই আসছে' },
  { key: 'home.coming_soon_sub',  value: 'নতুন ইভেন্টের জন্য অপেক্ষা করুন।' },
  { key: 'home.upcoming_label',   value: 'আসন্ন ইভেন্ট' },
  { key: 'home.register',         value: 'নিবন্ধন করুন' },
  { key: 'home.reg_closed',       value: 'নিবন্ধন বন্ধ' },
  { key: 'home.reg_open',         value: 'নিবন্ধন খোলা' },
  { key: 'home.about',            value: 'ইভেন্ট সম্পর্কে' },
  { key: 'home.other_events',     value: 'অন্যান্য ইভেন্ট' },
  { key: 'home.announcements',    value: '📢 ঘোষণা' },
  { key: 'home.sponsors',         value: 'স্পনসর ও বিজ্ঞাপন' },
  { key: 'home.ad_placeholder',   value: 'বিজ্ঞাপন' },
  // event page
  { key: 'event.payment_heading', value: 'পেমেন্ট তথ্য জমা দিন' },
  { key: 'event.payment_hint',    value: 'জমা দেওয়ার পরে, অ্যাডমিন আপনার পেমেন্ট যাচাই করবেন এবং ইমেইলে আপনার প্রবেশ QR কোড পাঠাবেন।' },
  { key: 'event.tier_early',      value: 'হলদে বউ' },
  { key: 'event.tier_mid',        value: 'নীলকণ্ঠ' },
  { key: 'event.tier_onspot',     value: 'কোকিলা' },
  { key: 'event.early_ends',      value: 'হলদে বউ শেষ:' },
  { key: 'event.mid_ends',        value: 'নীলকণ্ঠ মূল্য শেষ:' },
  { key: 'event.step1',           value: 'ধাপ ১: PayPal-এ পেমেন্ট করুন' },
  { key: 'event.scan_qr',         value: 'প্রথমে নিচের QR কোডটি স্ক্যান করে PayPal পেমেন্ট সম্পন্ন করুন।' },
  { key: 'event.paypal_contact',  value: 'PayPal পেমেন্ট QR এখানে প্রদর্শিত হবে। পেমেন্ট বিবরণের জন্য আয়োজকের সাথে যোগাযোগ করুন।' },
  { key: 'event.step2',           value: 'ধাপ ২: আপনার তথ্য জমা দিন' },
  { key: 'event.field_name',      value: 'অংশগ্রহণকারীর/অংশগ্রহণকারীদের নাম *' },
  { key: 'event.field_name_hint', value: 'একাধিক নাম হলে "/" বা কমা দিয়ে আলাদা করুন' },
  { key: 'event.field_children',  value: 'অনূর্ধ্ব-১৫ বছর বয়সী অংশগ্রহণকারীর সংখ্যা *' },
  { key: 'event.field_adults',    value: '১৫ বছর বা তদূর্ধ্ব অংশগ্রহণকারীর সংখ্যা *' },
  { key: 'event.field_pay_ref',   value: 'পেপাল ট্রানজেকশন নম্বর / ব্যাংক ট্রান্সফারকারীর নাম *' },
  { key: 'event.field_pay_ref_ph',value: 'লেনদেন আইডি বা নাম' },
  { key: 'event.field_contact',   value: 'ইমেইল, ইমেইল যদি না থাকে তবে টেলিফোন নম্বর *' },
  { key: 'event.field_contact_ph',value: 'your@email.com অথবা +49...' },
  { key: 'event.submit',          value: 'জমা দিন' },
  { key: 'event.closed',          value: 'এই ইভেন্টের জন্য সাবমিশন বর্তমানে বন্ধ।' },
  { key: 'event.until',           value: 'পর্যন্ত' },
  // success / register-success
  { key: 'success.confirmed',     value: 'নিবন্ধন নিশ্চিত!' },
  { key: 'success.thanks',        value: 'ধন্যবাদ' },
  { key: 'success.registered',    value: '-এ নিবন্ধিত হয়েছেন।' },
  { key: 'success.qr_heading',    value: 'আপনার প্রবেশ QR কোড' },
  { key: 'success.qr_show',       value: 'প্রবেশদ্বারে এটি দেখান। একটি কপি' },
  { key: 'success.qr_sent',       value: '-এ পাঠানো হয়েছে।' },
  { key: 'success.qr_hint',       value: 'সহজ অ্যাক্সেসের জন্য QR কোডটি স্ক্রিনশট বা প্রিন্ট করুন।' },
  { key: 'success.details',       value: 'নিবন্ধন বিবরণ' },
  { key: 'success.field_name',    value: 'নাম' },
  { key: 'success.field_email',   value: 'ইমেইল' },
  { key: 'success.field_event',   value: 'ইভেন্ট' },
  { key: 'success.field_date',    value: 'তারিখ' },
  { key: 'success.field_place',   value: 'স্থান' },
  { key: 'success.pay_status',    value: 'পেমেন্ট অবস্থা' },
  { key: 'success.paid',          value: 'পরিশোধিত' },
  { key: 'success.pending',       value: 'যাচাই অপেক্ষমাণ' },
  { key: 'success.pay_ref',       value: 'পেমেন্ট রেফারেন্স' },
  { key: 'success.back',          value: 'ইভেন্টসমূহে ফিরুন' },
  // footer
  { key: 'footer.brand',          value: 'উদযাপন' },
  { key: 'footer.privacy',        value: 'গোপনীয়তা নীতি' },
];

async function loadAll() {
  if (_cache) return _cache;
  try {
    const { data, error } = await db.from('translations').select('*');
    if (error) throw new Error(error.message);
    _cache = {};
    for (const row of (data || [])) {
      if (!_cache[row.locale]) _cache[row.locale] = {};
      _cache[row.locale][row.key] = row.value;
    }
    // If DB is empty, seed Bengali defaults into cache only (no DB write needed at load time)
    if (!_cache.bn || Object.keys(_cache.bn).length === 0) {
      _cache.bn = {};
      for (const s of SEEDS) _cache.bn[s.key] = s.value;
    }
  } catch (e) {
    // Fallback: serve from seeds
    _cache = { bn: {} };
    for (const s of SEEDS) _cache.bn[s.key] = s.value;
  }
  return _cache;
}

function invalidateCache() {
  _cache = null;
}

// Returns a sync lookup function for a given locale (call after await loadAll())
function makeT(all, locale) {
  const localeData = all[locale] || {};
  const bnData = all['bn'] || {};
  return (key) => localeData[key] || bnData[key] || key;
}

// Upsert a single translation
async function upsertTranslation(key, locale, value) {
  invalidateCache();
  // Check if exists
  const { data: existing } = await db.from('translations').select('key').eq('key', key).eq('locale', locale);
  if (existing && existing.length > 0) {
    await db.from('translations').update({ value }).eq('key', key).eq('locale', locale);
  } else {
    await db.from('translations').insert({ key, locale, value });
  }
}

// Bulk upsert array of { key, locale, value }
async function bulkUpsert(rows) {
  for (const row of rows) {
    await upsertTranslation(row.key, row.locale, row.value);
  }
}

// Seed Bengali defaults to DB if table is empty
async function seedDefaults() {
  try {
    const { data } = await db.from('translations').select('key').eq('locale', 'bn');
    if (data && data.length > 0) return;
    for (const s of SEEDS) {
      await db.from('translations').insert({ key: s.key, locale: 'bn', value: s.value });
    }
  } catch (e) {
    // Ignore seed errors (table may not exist yet)
  }
}

module.exports = { loadAll, makeT, invalidateCache, upsertTranslation, bulkUpsert, seedDefaults, SEEDS, SUPPORTED_LOCALES };
