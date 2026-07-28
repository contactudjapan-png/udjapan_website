const db = require('../config/db');

// Cache: { bn: { 'nav.logo': '...', ... }, en: { ... }, de: { ... } }
let _cache = null;

const SUPPORTED_LOCALES = ['bn', 'en', 'de'];

// SEEDS: { key, bn, en, de } — all three locales hardcoded so translations work
// even before the Supabase translations table is populated.
const SEEDS = [
  // nav
  { key: 'nav.logo',              bn: 'উদযাপন',                                                                                                                                             en: 'Udjapon',                                                                                              de: 'Udjapon' },
  { key: 'nav.events',            bn: 'ইভেন্টসমূহ',                                                                                                                                        en: 'Events',                                                                                               de: 'Veranstaltungen' },
  { key: 'nav.privacy',           bn: 'গোপনীয়তা',                                                                                                                                         en: 'Privacy',                                                                                              de: 'Datenschutz' },
  { key: 'nav.volunteer',         bn: 'স্বেচ্ছাসেবী কর্নার',                                                                                                                               en: 'Volunteer Corner',                                                                                     de: 'Freiwilligen-Ecke' },
  { key: 'nav.admin',             bn: 'অ্যাডমিন',                                                                                                                                          en: 'Admin',                                                                                                de: 'Admin' },
  // home
  { key: 'home.coming_soon',      bn: 'শীঘ্রই আসছে',                                                                                                                                       en: 'Coming Soon',                                                                                          de: 'Demnächst' },
  { key: 'home.coming_soon_sub',  bn: 'নতুন ইভেন্টের জন্য অপেক্ষা করুন।',                                                                                                                 en: 'Stay tuned for upcoming events.',                                                                      de: 'Bleiben Sie gespannt auf neue Veranstaltungen.' },
  { key: 'home.upcoming_label',   bn: 'আসন্ন ইভেন্ট',                                                                                                                                     en: 'Upcoming Event',                                                                                       de: 'Kommende Veranstaltung' },
  { key: 'home.register',         bn: 'নিবন্ধন করুন',                                                                                                                                      en: 'Register Now',                                                                                         de: 'Jetzt anmelden' },
  { key: 'home.reg_closed',       bn: 'নিবন্ধন বন্ধ',                                                                                                                                      en: 'Registration Closed',                                                                                  de: 'Anmeldung geschlossen' },
  { key: 'home.reg_open',         bn: 'নিবন্ধন খোলা',                                                                                                                                      en: 'Registration Open',                                                                                    de: 'Anmeldung offen' },
  { key: 'home.about',            bn: 'ইভেন্ট সম্পর্কে',                                                                                                                                   en: 'About the Event',                                                                                      de: 'Über die Veranstaltung' },
  { key: 'home.other_events',     bn: 'অন্যান্য ইভেন্ট',                                                                                                                                   en: 'Other Events',                                                                                         de: 'Weitere Veranstaltungen' },
  { key: 'home.announcements',    bn: '📢 ঘোষণা',                                                                                                                                          en: '📢 Announcements',                                                                                    de: '📢 Ankündigungen' },
  { key: 'home.sponsors',         bn: 'স্পনসর ও বিজ্ঞাপন',                                                                                                                                en: 'Sponsors & Ads',                                                                                       de: 'Sponsoren & Anzeigen' },
  { key: 'home.ad_placeholder',   bn: 'বিজ্ঞাপন',                                                                                                                                          en: 'Advertisement',                                                                                        de: 'Anzeige' },
  // event page
  { key: 'event.payment_heading', bn: 'পেমেন্ট তথ্য জমা দিন',                                                                                                                             en: 'Submit Payment Details',                                                                               de: 'Zahlungsdaten einreichen' },
  { key: 'event.payment_hint',    bn: 'জমা দেওয়ার পরে, অ্যাডমিন আপনার পেমেন্ট যাচাই করবেন এবং ইমেইলে আপনার প্রবেশ QR কোড পাঠাবেন।',                                                    en: 'After submitting, the admin will verify your payment and send your entry QR code by email.',            de: 'Nach dem Einreichen wird der Administrator Ihre Zahlung prüfen und Ihren Einlass-QR-Code per E-Mail zusenden.' },
  { key: 'event.tier_early',      bn: 'হলদে বউ',                                                                                                                                           en: 'Early Bird',                                                                                           de: 'Frühbucher' },
  { key: 'event.tier_mid',        bn: 'নীলকণ্ঠ',                                                                                                                                           en: 'Standard',                                                                                             de: 'Standard' },
  { key: 'event.tier_onspot',     bn: 'কোকিলা',                                                                                                                                            en: 'On the Day',                                                                                           de: 'Tageskasse' },
  { key: 'event.early_ends',      bn: 'হলদে বউ শেষ:',                                                                                                                                      en: 'Early Bird ends:',                                                                                     de: 'Frühbucher endet:' },
  { key: 'event.mid_ends',        bn: 'নীলকণ্ঠ মূল্য শেষ:',                                                                                                                               en: 'Standard price ends:',                                                                                 de: 'Standardpreis endet:' },
  { key: 'event.step1',           bn: 'ধাপ ১: PayPal-এ পেমেন্ট করুন',                                                                                                                     en: 'Step 1: Pay via PayPal',                                                                               de: 'Schritt 1: Per PayPal bezahlen' },
  { key: 'event.scan_qr',         bn: 'প্রথমে নিচের QR কোডটি স্ক্যান করে PayPal পেমেন্ট সম্পন্ন করুন।',                                                                                   en: 'Scan the QR code below to complete your PayPal payment first.',                                        de: 'Scannen Sie zuerst den QR-Code unten, um Ihre PayPal-Zahlung abzuschließen.' },
  { key: 'event.paypal_contact',  bn: 'PayPal পেমেন্ট QR এখানে প্রদর্শিত হবে। পেমেন্ট বিবরণের জন্য আয়োজকের সাথে যোগাযোগ করুন।',                                                        en: 'PayPal payment QR will appear here. Contact the organiser for payment details.',                       de: 'PayPal-Zahlungs-QR wird hier angezeigt. Kontaktieren Sie den Veranstalter für Zahlungsdetails.' },
  { key: 'event.step2',           bn: 'ধাপ ২: আপনার তথ্য জমা দিন',                                                                                                                        en: 'Step 2: Submit Your Details',                                                                          de: 'Schritt 2: Ihre Daten einreichen' },
  { key: 'event.field_name',      bn: 'অংশগ্রহণকারীর/অংশগ্রহণকারীদের নাম *',                                                                                                              en: 'Participant Name(s) *',                                                                                de: 'Name(n) der Teilnehmer *' },
  { key: 'event.field_name_hint', bn: 'একাধিক নাম হলে "/" বা কমা দিয়ে আলাদা করুন',                                                                                                        en: 'For multiple names, separate with "/" or comma',                                                       de: 'Bei mehreren Namen mit "/" oder Komma trennen' },
  { key: 'event.field_children',  bn: 'অনূর্ধ্ব-১৫ বছর বয়সী অংশগ্রহণকারীর সংখ্যা *',                                                                                                    en: 'Number of participants under 15 *',                                                                    de: 'Anzahl der Teilnehmer unter 15 Jahren *' },
  { key: 'event.field_adults',    bn: '১৫ বছর বা তদূর্ধ্ব অংশগ্রহণকারীর সংখ্যা *',                                                                                                       en: 'Number of participants aged 15 and over *',                                                            de: 'Anzahl der Teilnehmer ab 15 Jahren *' },
  { key: 'event.field_pay_ref',   bn: 'পেপাল ট্রানজেকশন নম্বর / ব্যাংক ট্রান্সফারকারীর নাম *',                                                                                           en: 'PayPal transaction ID / Bank transfer sender name *',                                                  de: 'PayPal-Transaktions-ID / Name des Überweisenden *' },
  { key: 'event.field_pay_ref_ph',bn: 'লেনদেন আইডি বা নাম',                                                                                                                               en: 'Transaction ID or name',                                                                               de: 'Transaktions-ID oder Name' },
  { key: 'event.field_phone',     bn: 'ফোন নম্বর *',                                                                                                                                        en: 'Phone Number *',                                                                                       de: 'Telefonnummer *' },
  { key: 'event.field_contact',   bn: 'ইমেইল, ইমেইল যদি না থাকে তবে টেলিফোন নম্বর *',                                                                                                    en: 'Email, or phone number if no email *',                                                                 de: 'E-Mail, oder Telefonnummer falls keine E-Mail *' },
  { key: 'event.field_contact_ph',bn: 'your@email.com অথবা +49...',                                                                                                                        en: 'your@email.com or +49...',                                                                             de: 'ihre@email.de oder +49...' },
  { key: 'event.submit',          bn: 'জমা দিন',                                                                                                                                           en: 'Submit',                                                                                               de: 'Absenden' },
  { key: 'event.closed',          bn: 'এই ইভেন্টের জন্য সাবমিশন বর্তমানে বন্ধ।',                                                                                                          en: 'Submissions are currently closed for this event.',                                                     de: 'Anmeldungen für diese Veranstaltung sind derzeit geschlossen.' },
  { key: 'event.until',           bn: 'পর্যন্ত',                                                                                                                                           en: 'until',                                                                                                de: 'bis' },
  { key: 'event.datenschutz_notice', bn: 'অনুষ্ঠানের সময় ছবি ও ভিডিও ধারণ করা হতে পারে এবং সামাজিক মিডিয়ায় শেয়ার করা হতে পারে।', en: 'Photos and videos may be taken during the event and shared on social media.', de: 'Während der Veranstaltung können Fotos und Videos aufgenommen und in sozialen Medien geteilt werden.' },
  // success / register-success
  { key: 'success.confirmed',     bn: 'নিবন্ধন নিশ্চিত!',                                                                                                                                  en: 'Registration Confirmed!',                                                                              de: 'Anmeldung bestätigt!' },
  { key: 'success.thanks',        bn: 'ধন্যবাদ',                                                                                                                                           en: 'Thank you',                                                                                            de: 'Vielen Dank' },
  { key: 'success.registered',    bn: '-এ নিবন্ধিত হয়েছেন।',                                                                                                                               en: 'has been registered for',                                                                              de: 'wurde angemeldet für' },
  { key: 'success.qr_heading',    bn: 'আপনার প্রবেশ QR কোড',                                                                                                                              en: 'Your Entry QR Code',                                                                                   de: 'Ihr Einlass-QR-Code' },
  { key: 'success.qr_show',       bn: 'প্রবেশদ্বারে এটি দেখান। একটি কপি',                                                                                                                 en: 'Show this at the entrance. A copy has been sent to',                                                   de: 'Zeigen Sie dies am Eingang vor. Eine Kopie wurde gesendet an' },
  { key: 'success.qr_sent',       bn: '-এ পাঠানো হয়েছে।',                                                                                                                                  en: '.',                                                                                                    de: '.' },
  { key: 'success.qr_hint',       bn: 'সহজ অ্যাক্সেসের জন্য QR কোডটি স্ক্রিনশট বা প্রিন্ট করুন।',                                                                                        en: 'Screenshot or print the QR code for easy access.',                                                     de: 'Machen Sie einen Screenshot oder drucken Sie den QR-Code für einfachen Zugang aus.' },
  { key: 'success.details',       bn: 'নিবন্ধন বিবরণ',                                                                                                                                     en: 'Registration Details',                                                                                 de: 'Anmeldedetails' },
  { key: 'success.field_name',    bn: 'নাম',                                                                                                                                               en: 'Name',                                                                                                 de: 'Name' },
  { key: 'success.field_email',   bn: 'ইমেইল',                                                                                                                                             en: 'Email',                                                                                                de: 'E-Mail' },
  { key: 'success.field_event',   bn: 'ইভেন্ট',                                                                                                                                            en: 'Event',                                                                                                de: 'Veranstaltung' },
  { key: 'success.field_date',    bn: 'তারিখ',                                                                                                                                             en: 'Date',                                                                                                 de: 'Datum' },
  { key: 'success.field_place',   bn: 'স্থান',                                                                                                                                             en: 'Venue',                                                                                                de: 'Ort' },
  { key: 'success.pay_status',    bn: 'পেমেন্ট অবস্থা',                                                                                                                                    en: 'Payment Status',                                                                                       de: 'Zahlungsstatus' },
  { key: 'success.paid',          bn: 'পরিশোধিত',                                                                                                                                          en: 'Paid',                                                                                                 de: 'Bezahlt' },
  { key: 'success.pending',       bn: 'যাচাই অপেক্ষমাণ',                                                                                                                                   en: 'Pending Verification',                                                                                 de: 'Ausstehende Prüfung' },
  { key: 'success.pay_ref',       bn: 'পেমেন্ট রেফারেন্স',                                                                                                                                 en: 'Payment Reference',                                                                                    de: 'Zahlungsreferenz' },
  { key: 'success.back',          bn: 'ইভেন্টসমূহে ফিরুন',                                                                                                                                en: 'Back to Events',                                                                                       de: 'Zurück zu den Veranstaltungen' },
  // footer
  { key: 'footer.brand',          bn: 'উদযাপন',                                                                                                                                            en: 'Udjapon',                                                                                              de: 'Udjapon' },
  { key: 'footer.privacy',        bn: 'গোপনীয়তা নীতি',                                                                                                                                    en: 'Privacy Policy',                                                                                       de: 'Datenschutzerklärung' },
];

function buildSeedCache() {
  const cache = {};
  for (const locale of SUPPORTED_LOCALES) cache[locale] = {};
  for (const s of SEEDS) {
    for (const locale of SUPPORTED_LOCALES) {
      if (s[locale]) cache[locale][s.key] = s[locale];
    }
  }
  return cache;
}

async function loadAll() {
  if (_cache) return _cache;
  // Start with hardcoded seeds for all locales (ensures EN/DE always work)
  _cache = buildSeedCache();
  try {
    const { data, error } = await db.from('translations').select('*');
    if (!error && data && data.length > 0) {
      // DB values override seeds (admin can customize)
      for (const row of data) {
        if (!_cache[row.locale]) _cache[row.locale] = {};
        _cache[row.locale][row.key] = row.value;
      }
    }
  } catch (e) {
    // Seeds already applied above — nothing to do
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

// Seed all locale defaults to DB if table is empty
async function seedDefaults() {
  try {
    const { data } = await db.from('translations').select('key').limit(1);
    if (data && data.length > 0) return;
    for (const s of SEEDS) {
      for (const locale of SUPPORTED_LOCALES) {
        if (s[locale]) {
          await db.from('translations').insert({ key: s.key, locale, value: s[locale] });
        }
      }
    }
  } catch (e) {
    // Ignore seed errors (table may not exist yet)
  }
}

module.exports = { loadAll, makeT, invalidateCache, upsertTranslation, bulkUpsert, seedDefaults, SEEDS, SUPPORTED_LOCALES };
