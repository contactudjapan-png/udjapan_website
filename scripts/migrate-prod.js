#!/usr/bin/env node
/**
 * Run pending migrations and seed translations to production Supabase.
 * Usage: node scripts/migrate-prod.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SEEDS = [
  { key: 'nav.logo',              value: 'উদযাপন' },
  { key: 'nav.events',            value: 'ইভেন্টসমূহ' },
  { key: 'nav.privacy',           value: 'গোপনীয়তা' },
  { key: 'nav.volunteer',         value: 'স্বেচ্ছাসেবী কর্নার' },
  { key: 'nav.admin',             value: 'অ্যাডমিন' },
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
  { key: 'footer.brand',          value: 'উদযাপন' },
  { key: 'footer.privacy',        value: 'গোপনীয়তা নীতি' },
];

async function runSQL(sql) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  // Use the pg REST endpoint via supabase-js rpc if available, otherwise use raw fetch
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
    method: 'HEAD',
    headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY },
  });
  // Fall back: use supabase.rpc if exec_sql function exists, else skip
}

async function ensureTranslationsTable() {
  // Try inserting a dummy record to see if table exists; if error, we need to create it
  const { error } = await supabase.from('translations').select('key').limit(1);
  if (error && error.code === '42P01') {
    console.log('translations table does not exist — please run supabase_migration_translations.sql manually in Supabase dashboard SQL editor.');
    return false;
  }
  if (error) {
    console.error('Error checking translations table:', error.message);
    return false;
  }
  return true;
}

async function ensurePopupColumn() {
  // Try selecting popup_image_url from events
  const { error } = await supabase.from('events').select('popup_image_url').limit(1);
  if (error && (error.message.includes('popup_image_url') || error.code === '42703')) {
    console.log('popup_image_url column missing — please run supabase_migration_event_popup.sql in Supabase dashboard SQL editor.');
    return false;
  }
  if (error) {
    console.error('Error checking popup_image_url column:', error.message);
  }
  return true;
}

async function seedTranslations() {
  console.log(`Seeding ${SEEDS.length} Bengali translations...`);
  let inserted = 0, skipped = 0;
  for (const s of SEEDS) {
    const { data: existing } = await supabase
      .from('translations')
      .select('key')
      .eq('key', s.key)
      .eq('locale', 'bn')
      .maybeSingle();

    if (existing) {
      skipped++;
    } else {
      const { error } = await supabase.from('translations').insert({ key: s.key, locale: 'bn', value: s.value });
      if (error) {
        console.error(`  Error inserting ${s.key}:`, error.message);
      } else {
        inserted++;
      }
    }
  }
  console.log(`  Done: ${inserted} inserted, ${skipped} already existed.`);
}

async function main() {
  console.log('=== Production Migration Script ===');
  console.log('Supabase URL:', process.env.SUPABASE_URL);

  const tableOk = await ensureTranslationsTable();
  if (tableOk) {
    await seedTranslations();
  }

  const popupOk = await ensurePopupColumn();
  console.log('popup_image_url column:', popupOk ? 'OK' : 'MISSING (run SQL manually)');

  console.log('=== Done ===');
}

main().catch(err => { console.error(err); process.exit(1); });
