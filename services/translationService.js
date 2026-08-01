const db = require('../config/db');

// Cache: { bn: { 'nav.logo': '...', ... }, en: { ... }, de: { ... } }
let _cache = null;

const SUPPORTED_LOCALES = ['bn', 'en', 'de'];

// SEEDS: { key, bn, en, de } — all three locales hardcoded so translations work
// even before the Supabase translations table is populated.
const SEEDS = [
  // nav
  { key: 'nav.logo',              bn: 'উদযাপন',                                                                                                                                             en: 'Udjapan',                                                                                              de: 'Udjapan' },
  { key: 'nav.events',            bn: 'ইভেন্টসমূহ',                                                                                                                                        en: 'Events',                                                                                               de: 'Veranstaltungen' },
  { key: 'nav.faq',               bn: 'সাধারণ জিজ্ঞাসা',                                                                                                                              en: 'FAQ',                                                                                                  de: 'FAQ' },
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
  { key: 'event.paypal_ff_warn',  bn: '⚠️ পেমেন্ট করার সময় অবশ্যই <strong>"Friends and Family"</strong> নির্বাচন করুন। এটি নির্বাচন না করলে লেনদেন গৃহীত হবে না।',                         en: '⚠️ You must select <strong>"Friends and Family"</strong> when paying. The transaction will not be accepted if this is not selected.',                                   de: '⚠️ Wählen Sie beim Bezahlen unbedingt <strong>„Freunde und Familie"</strong> aus. Die Transaktion wird nicht akzeptiert, wenn dies nicht ausgewählt ist.' },
  { key: 'event.paypal_contact',  bn: 'PayPal পেমেন্ট QR এখানে প্রদর্শিত হবে। পেমেন্ট বিবরণের জন্য আয়োজকের সাথে যোগাযোগ করুন।',                                                        en: 'PayPal payment QR will appear here. Contact the organiser for payment details.',                       de: 'PayPal-Zahlungs-QR wird hier angezeigt. Kontaktieren Sie den Veranstalter für Zahlungsdetails.' },
  { key: 'event.step2',           bn: 'ধাপ ২: আপনার তথ্য জমা দিন',                                                                                                                        en: 'Step 2: Submit Your Details',                                                                          de: 'Schritt 2: Ihre Daten einreichen' },
  { key: 'event.field_name',      bn: 'অংশগ্রহণকারীর/অংশগ্রহণকারীদের নাম *',                                                                                                              en: 'Participant Name(s) *',                                                                                de: 'Name(n) der Teilnehmer *' },
  { key: 'event.field_name_hint', bn: 'একাধিক নাম হলে "/" বা কমা দিয়ে আলাদা করুন',                                                                                                        en: 'For multiple names, separate with "/" or comma',                                                       de: 'Bei mehreren Namen mit "/" oder Komma trennen' },
  { key: 'event.field_name_ph',  bn: 'নাম',                                                                                                                                                    en: 'Name',                                                                                                 de: 'Name' },
  { key: 'event.field_children',  bn: 'অনূর্ধ্ব-১৫ বছর বয়সী অংশগ্রহণকারীর সংখ্যা *',                                                                                                    en: 'Number of participants under 15 *',                                                                    de: 'Anzahl der Teilnehmer unter 15 Jahren *' },
  { key: 'event.field_adults',    bn: '১৫ বছর বা তদূর্ধ্ব অংশগ্রহণকারীর সংখ্যা *',                                                                                                       en: 'Number of participants aged 15 and over *',                                                            de: 'Anzahl der Teilnehmer ab 15 Jahren *' },
  { key: 'event.field_pay_ref',   bn: 'পেপাল ট্রানজেকশন নম্বর / ব্যাংক ট্রান্সফারকারীর নাম *',                                                                                           en: 'PayPal transaction ID / Bank transfer sender name *',                                                  de: 'PayPal-Transaktions-ID / Name des Überweisenden *' },
  { key: 'event.field_pay_ref_ph',bn: 'লেনদেন আইডি বা নাম',                                                                                                                               en: 'Transaction ID or name',                                                                               de: 'Transaktions-ID oder Name' },
  { key: 'event.field_phone',     bn: 'ফোন নম্বর *',                                                                                                                                        en: 'Phone Number *',                                                                                       de: 'Telefonnummer *' },
  { key: 'event.field_contact',   bn: 'ইমেইল, ইমেইল যদি না থাকে তবে টেলিফোন নম্বর *',                                                                                                    en: 'Email, or phone number if no email *',                                                                 de: 'E-Mail, oder Telefonnummer falls keine E-Mail *' },
  { key: 'event.field_contact_ph',bn: 'your@email.com অথবা +49...',                                                                                                                        en: 'your@email.com or +49...',                                                                             de: 'ihre@email.de oder +49...' },
  { key: 'event.submit',          bn: 'জমা দিন',                                                                                                                                           en: 'Submit',                                                                                               de: 'Absenden' },
  { key: 'event.closed',          bn: 'এই ইভেন্টের জন্য সাবমিশন বর্তমানে বন্ধ।',                                                                                                          en: 'Submissions are currently closed for this event.',                                                     de: 'Anmeldungen für diese Veranstaltung sind derzeit geschlossen.' },
  { key: 'event.volunteer_heading', bn: 'স্বেচ্ছাসেবক হতে চান?',                   en: 'Want to Volunteer?',                                          de: 'Als Freiwilliger mitmachen?' },
  { key: 'event.volunteer_sub',     bn: 'এই ইভেন্টে স্বেচ্ছাসেবক হিসেবে যোগ দিতে চাইলে নিচের বাটনে ক্লিক করুন।', en: 'If you would like to volunteer at this event, click below.', de: 'Wenn Sie bei dieser Veranstaltung helfen möchten, klicken Sie unten.' },
  { key: 'event.volunteer_btn',     bn: 'স্বেচ্ছাসেবক হিসেবে নিবন্ধন করুন',       en: 'Register as Volunteer',                                       de: 'Als Freiwilliger anmelden' },
  { key: 'event.until',           bn: 'পর্যন্ত',                                                                                                                                           en: 'until',                                                                                                de: 'bis' },
  { key: 'event.privacy_consent', bn: 'নিবন্ধন করার মাধ্যমে আপনি আমাদের', en: 'By registering you accept our', de: 'Mit der Anmeldung akzeptieren Sie unsere' },
  { key: 'event.privacy_policy',  bn: 'গোপনীয়তা নীতি গ্রহণ করছেন', en: 'privacy policy', de: 'Datenschutzerklärung' },
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
  { key: 'footer.brand',          bn: 'উদযাপন',             en: 'Udjapon',            de: 'Udjapon' },
  { key: 'footer.privacy',        bn: 'গোপনীয়তা নীতি',     en: 'Privacy Policy',     de: 'Datenschutzerklärung' },
  // admin sidebar nav
  { key: 'admin.group_main',      bn: 'প্রধান',             en: 'Main',               de: 'Hauptmenü' },
  { key: 'admin.group_content',   bn: 'বিষয়বস্তু',          en: 'Content',            de: 'Inhalte' },
  { key: 'admin.group_settings',  bn: 'সেটিংস',             en: 'Settings',           de: 'Einstellungen' },
  { key: 'admin.group_log',       bn: 'লগ',                 en: 'Log',                de: 'Protokoll' },
  { key: 'admin.dashboard',       bn: 'ড্যাশবোর্ড',         en: 'Dashboard',          de: 'Dashboard' },
  { key: 'admin.events',          bn: 'ইভেন্টসমূহ',         en: 'Events',             de: 'Veranstaltungen' },
  { key: 'admin.ads',             bn: 'বিজ্ঞাপন',            en: 'Ads',                de: 'Anzeigen' },
  { key: 'admin.announcements',   bn: 'ঘোষণা',              en: 'Announcements',      de: 'Ankündigungen' },
  { key: 'admin.volunteer_tasks', bn: 'স্বেচ্ছাসেবী কাজ',   en: 'Volunteer Tasks',    de: 'Freiwilligenaufgaben' },
  { key: 'admin.stall_obs',       bn: 'স্টল পর্যবেক্ষণ',    en: 'Stall Observations', de: 'Standbeobachtungen' },
  { key: 'admin.expense_cats',    bn: 'খরচ ক্যাটাগরি',       en: 'Expense Categories', de: 'Ausgabenkategorien' },
  { key: 'admin.income_cats',     bn: 'আয় ক্যাটাগরি',       en: 'Income Categories',  de: 'Einnahmekategorien' },
  { key: 'admin.translations',    bn: 'অনুবাদ',              en: 'Translations',       de: 'Übersetzungen' },
  { key: 'admin.audit_log',       bn: 'অডিট লগ',            en: 'Audit Log',          de: 'Audit-Protokoll' },
  { key: 'admin.view_site',       bn: 'সাইট দেখুন ↗',       en: 'View Site ↗',        de: 'Seite ansehen ↗' },
  { key: 'admin.logout',          bn: 'লগআউট',              en: 'Logout',             de: 'Abmelden' },
  // event subnav
  { key: 'subnav.settings',       bn: 'সেটিংস',             en: 'Settings',           de: 'Einstellungen' },
  { key: 'subnav.submissions',    bn: 'সাবমিশন',            en: 'Submissions',        de: 'Einreichungen' },
  { key: 'subnav.registrations',  bn: 'নিবন্ধন',             en: 'Registrations',      de: 'Anmeldungen' },
  { key: 'subnav.bulk_payment',   bn: 'বাল্ক পেমেন্ট',      en: 'Bulk Payment',       de: 'Massenzahlung' },
  { key: 'subnav.expenses',       bn: 'খরচ',                en: 'Expenses',           de: 'Ausgaben' },
  { key: 'subnav.income',         bn: 'আয়',                 en: 'Income',             de: 'Einnahmen' },
  { key: 'subnav.financial',      bn: 'আর্থিক',             en: 'Financial',          de: 'Finanzen' },
  { key: 'subnav.polls',          bn: 'ভোট',                en: 'Polls',              de: 'Abstimmungen' },
  { key: 'subnav.stalls',         bn: 'স্টল',               en: 'Stalls',             de: 'Stände' },
  { key: 'subnav.volunteers',     bn: 'স্বেচ্ছাসেবী',        en: 'Volunteers',         de: 'Freiwillige' },
  { key: 'subnav.waitlist',       bn: 'ওয়েটলিস্ট',          en: 'Waitlist',           de: 'Warteliste' },
  { key: 'subnav.refunds',        bn: 'রিফান্ড',             en: 'Refunds',            de: 'Erstattungen' },
  { key: 'subnav.emails',         bn: 'ইমেইল',              en: 'Emails',             de: 'E-Mails' },
  { key: 'subnav.reports',        bn: 'রিপোর্ট',             en: 'Reports',            de: 'Berichte' },
  { key: 'subnav.scan_log',       bn: 'স্ক্যান লগ',          en: 'Scan Log',           de: 'Scan-Protokoll' },
  { key: 'subnav.feedback',       bn: 'ফিডব্যাক',            en: 'Feedback',           de: 'Rückmeldung' },
  { key: 'subnav.competitions',   bn: 'প্রতিযোগিতা',         en: 'Competitions',       de: 'Wettbewerbe' },
  { key: 'subnav.import',         bn: 'ইম্পোর্ট',            en: 'Import',             de: 'Import' },

  // ── common buttons ────────────────────────────────────────────────────────
  { key: 'btn.save',              bn: 'সংরক্ষণ করুন',         en: 'Save',               de: 'Speichern' },
  { key: 'btn.save_changes',      bn: 'পরিবর্তন সংরক্ষণ',    en: 'Save Changes',       de: 'Änderungen speichern' },
  { key: 'btn.cancel',            bn: 'বাতিল',                en: 'Cancel',             de: 'Abbrechen' },
  { key: 'btn.delete',            bn: 'মুছুন',                en: 'Delete',             de: 'Löschen' },
  { key: 'btn.edit',              bn: 'সম্পাদনা',             en: 'Edit',               de: 'Bearbeiten' },
  { key: 'btn.create',            bn: 'তৈরি করুন',            en: 'Create',             de: 'Erstellen' },
  { key: 'btn.update',            bn: 'আপডেট করুন',           en: 'Update',             de: 'Aktualisieren' },
  { key: 'btn.add',               bn: 'যোগ করুন',             en: 'Add',                de: 'Hinzufügen' },
  { key: 'btn.back',              bn: '← ফিরুন',             en: '← Back',             de: '← Zurück' },
  { key: 'btn.view',              bn: 'দেখুন',                en: 'View',               de: 'Ansehen' },
  { key: 'btn.approve',           bn: 'অনুমোদন',              en: 'Approve',            de: 'Genehmigen' },
  { key: 'btn.reject',            bn: 'প্রত্যাখ্যান',          en: 'Reject',             de: 'Ablehnen' },
  { key: 'btn.remove',            bn: 'সরান',                 en: 'Remove',             de: 'Entfernen' },
  { key: 'btn.assign',            bn: 'নির্ধারণ',              en: 'Assign',             de: 'Zuweisen' },
  { key: 'btn.process',           bn: 'প্রক্রিয়া করুন',       en: 'Process',            de: 'Verarbeiten' },
  { key: 'btn.login',             bn: 'প্রবেশ করুন',          en: 'Login',              de: 'Anmelden' },
  { key: 'btn.details',           bn: 'বিস্তারিত',             en: 'Details',            de: 'Details' },
  { key: 'btn.send_email',        bn: 'ইমেইল পাঠান',          en: 'Send Email',         de: 'E-Mail senden' },
  { key: 'btn.import_data',       bn: 'ডেটা আমদানি করুন',     en: 'Import Data',        de: 'Daten importieren' },
  { key: 'btn.new_event',         bn: '+ নতুন ইভেন্ট',        en: '+ New Event',        de: '+ Neue Veranstaltung' },
  { key: 'btn.add_expense',       bn: '+ খরচ যোগ করুন',      en: '+ Add Expense',      de: '+ Ausgabe hinzufügen' },
  { key: 'btn.add_income',        bn: '+ আয় যোগ করুন',       en: '+ Add Income',       de: '+ Einnahme hinzufügen' },
  { key: 'btn.add_refund',        bn: '+ রিফান্ড যোগ করুন',   en: '+ Add Refund',       de: '+ Erstattung hinzufügen' },
  { key: 'btn.new_volunteer',     bn: '+ নতুন স্বেচ্ছাসেবী',   en: '+ New Volunteer',    de: '+ Neuer Freiwilliger' },
  { key: 'btn.new_stall',         bn: '+ নতুন স্টল',           en: '+ New Stall',        de: '+ Neuer Stand' },
  { key: 'btn.new_poll',          bn: '+ নতুন ভোট',           en: '+ New Poll',         de: '+ Neue Abstimmung' },
  { key: 'btn.new_announcement',  bn: '+ নতুন ঘোষণা',         en: '+ New Announcement', de: '+ Neue Ankündigung' },
  { key: 'btn.new_ad',            bn: '+ নতুন বিজ্ঞাপন',      en: '+ New Ad',           de: '+ Neue Anzeige' },
  { key: 'btn.add_manually',      bn: '+ ম্যানুয়ালি যোগ করুন', en: '+ Add Manually',    de: '+ Manuell hinzufügen' },
  { key: 'btn.promote',          bn: 'নিবন্ধনে নিন',          en: 'Promote to Registration', de: 'Zur Anmeldung befördern' },
  { key: 'btn.pending',          bn: 'অপেক্ষমাণ করুন',        en: 'Set Pending',        de: 'Ausstehend setzen' },
  { key: 'btn.start',            bn: 'শুরু',                  en: 'Start',              de: 'Starten' },
  { key: 'btn.stop',             bn: 'বন্ধ',                  en: 'Stop',               de: 'Stoppen' },
  { key: 'btn.add_task',         bn: '+ কাজ যোগ করুন',       en: '+ Add Task',         de: '+ Aufgabe hinzufügen' },
  { key: 'btn.add_question',     bn: 'প্রশ্ন যোগ করুন',      en: 'Add Question',       de: 'Frage hinzufügen' },
  { key: 'btn.add_option',       bn: '+ বিকল্প যোগ করুন',    en: '+ Add Option',       de: '+ Option hinzufügen' },
  { key: 'btn.add_competition',  bn: 'যোগ করুন',             en: 'Add',                de: 'Hinzufügen' },
  { key: 'btn.load_test_data',   bn: 'টেস্ট ডেটা লোড করুন', en: 'Load Test Data',     de: 'Testdaten laden' },
  { key: 'btn.excel_download',   bn: 'Excel ডাউনলোড',        en: 'Excel Download',     de: 'Excel herunterladen' },
  { key: 'btn.inactive',         bn: 'নিষ্ক্রিয় করুন',        en: 'Deactivate',         de: 'Deaktivieren' },
  { key: 'btn.activate',         bn: 'সক্রিয় করুন',           en: 'Activate',           de: 'Aktivieren' },
  { key: 'btn.toggle_paid',      bn: 'পরিশোধিত চিহ্নিত করুন', en: 'Mark as Paid',       de: 'Als bezahlt markieren' },
  { key: 'btn.toggle_unpaid',    bn: 'অপরিশোধিত চিহ্নিত করুন', en: 'Mark as Unpaid',  de: 'Als unbezahlt markieren' },
  { key: 'btn.public_form',      bn: 'পাবলিক ফর্ম ↗',        en: 'Public Form ↗',      de: 'Öffentliches Formular ↗' },
  { key: 'btn.save_all',         bn: 'সব পরিবর্তন সংরক্ষণ করুন', en: 'Save All Changes', de: 'Alle Änderungen speichern' },
  { key: 'btn.add_key',         bn: 'যোগ করুন',              en: 'Add',                de: 'Hinzufügen' },
  { key: 'btn.new_key',         bn: '+ নতুন কী যোগ করুন',   en: '+ Add New Key',      de: '+ Neuen Schlüssel hinzufügen' },

  // ── common table headers ───────────────────────────────────────────────────
  { key: 'tbl.name',             bn: 'নাম',                  en: 'Name',               de: 'Name' },
  { key: 'tbl.date',             bn: 'তারিখ',                en: 'Date',               de: 'Datum' },
  { key: 'tbl.status',           bn: 'অবস্থা',               en: 'Status',             de: 'Status' },
  { key: 'tbl.actions',          bn: 'কার্যক্রম',             en: 'Actions',            de: 'Aktionen' },
  { key: 'tbl.email',            bn: 'ইমেইল',                en: 'Email',              de: 'E-Mail' },
  { key: 'tbl.amount',           bn: 'পরিমাণ',               en: 'Amount',             de: 'Betrag' },
  { key: 'tbl.paid',             bn: 'পরিশোধিত',             en: 'Paid',               de: 'Bezahlt' },
  { key: 'tbl.ref',              bn: 'রেফারেন্স',             en: 'Reference',          de: 'Referenz' },
  { key: 'tbl.title',            bn: 'শিরোনাম',              en: 'Title',              de: 'Titel' },
  { key: 'tbl.event',            bn: 'ইভেন্ট',               en: 'Event',              de: 'Veranstaltung' },
  { key: 'tbl.active',           bn: 'সক্রিয়',              en: 'Active',             de: 'Aktiv' },
  { key: 'tbl.submissions',      bn: 'সাবমিশন',              en: 'Submissions',        de: 'Einreichungen' },
  { key: 'tbl.registrations',    bn: 'নিবন্ধন',              en: 'Registrations',      de: 'Anmeldungen' },
  { key: 'tbl.phone',            bn: 'ফোন',                  en: 'Phone',              de: 'Telefon' },
  { key: 'tbl.transaction_id',   bn: 'লেনদেন আইডি',          en: 'Transaction ID',     de: 'Transaktions-ID' },
  { key: 'tbl.registered',       bn: 'নিবন্ধিত',             en: 'Registered',         de: 'Angemeldet' },
  { key: 'tbl.category',         bn: 'ক্যাটাগরি',             en: 'Category',           de: 'Kategorie' },
  { key: 'tbl.description',      bn: 'বিবরণ',                en: 'Description',        de: 'Beschreibung' },
  { key: 'tbl.receipt',          bn: 'রসিদ',                 en: 'Receipt',            de: 'Quittung' },
  { key: 'tbl.payer',            bn: 'প্রদানকারী',            en: 'Payer',              de: 'Zahler' },
  { key: 'tbl.payment_date',     bn: 'পেমেন্টের তারিখ/সময়',  en: 'Payment Date/Time',  de: 'Zahlungsdatum/-zeit' },
  { key: 'tbl.reason',           bn: 'কারণ',                 en: 'Reason',             de: 'Grund' },
  { key: 'tbl.stall_name',       bn: 'স্টলের নাম',            en: 'Stall Name',         de: 'Standname' },
  { key: 'tbl.location',         bn: 'অবস্থান',               en: 'Location',           de: 'Standort' },
  { key: 'tbl.assigned',         bn: 'বরাদ্দ',                en: 'Assigned',           de: 'Zugewiesen' },
  { key: 'tbl.fee',              bn: 'ফি',                   en: 'Fee',                de: 'Gebühr' },
  { key: 'tbl.preference',       bn: 'পছন্দ',                en: 'Preference',         de: 'Präferenz' },
  { key: 'tbl.remuneration',     bn: 'পারিশ্রমিক',            en: 'Remuneration',       de: 'Vergütung' },
  { key: 'tbl.session',          bn: 'সেশন',                 en: 'Session',            de: 'Sitzung' },
  { key: 'tbl.task',             bn: 'কাজ',                  en: 'Task',               de: 'Aufgabe' },
  { key: 'tbl.option',           bn: 'বিকল্প',                en: 'Option',             de: 'Option' },
  { key: 'tbl.votes',            bn: 'ভোট',                  en: 'Votes',              de: 'Stimmen' },
  { key: 'tbl.content',          bn: 'বিষয়বস্তু',             en: 'Content',            de: 'Inhalt' },
  { key: 'tbl.order',            bn: 'ক্রম',                 en: 'Order',              de: 'Reihenfolge' },
  { key: 'tbl.link',             bn: 'লিংক',                 en: 'Link',               de: 'Link' },
  { key: 'tbl.ad',               bn: 'বিজ্ঞাপন',             en: 'Ad',                 de: 'Anzeige' },
  { key: 'tbl.joined',           bn: 'যোগ দিয়েছেন',          en: 'Joined',             de: 'Beigetreten' },
  { key: 'tbl.time',             bn: 'সময়',                  en: 'Time',               de: 'Zeit' },
  { key: 'tbl.result',           bn: 'ফলাফল',                en: 'Result',             de: 'Ergebnis' },
  { key: 'tbl.code',             bn: 'কোড',                  en: 'Code',               de: 'Code' },
  { key: 'tbl.user',             bn: 'ব্যবহারকারী',           en: 'User',               de: 'Benutzer' },
  { key: 'tbl.action',           bn: 'কার্যক্রম',             en: 'Action',             de: 'Aktion' },
  { key: 'tbl.entity_type',      bn: 'সত্তা ধরন',             en: 'Entity Type',        de: 'Entitätstyp' },
  { key: 'tbl.entity_id',        bn: 'সত্তা আইডি',            en: 'Entity ID',          de: 'Entitäts-ID' },
  { key: 'tbl.type',             bn: 'ধরন',                  en: 'Type',               de: 'Typ' },
  { key: 'tbl.rating',           bn: 'রেটিং',                en: 'Rating',             de: 'Bewertung' },
  { key: 'tbl.notes',            bn: 'নোট',                  en: 'Notes',              de: 'Notizen' },
  { key: 'tbl.by',               bn: 'দ্বারা',                en: 'By',                 de: 'Von' },
  { key: 'tbl.comp_name',        bn: 'প্রতিযোগিতার নাম',      en: 'Competition Name',   de: 'Wettbewerbsname' },
  { key: 'tbl.winner',           bn: 'বিজয়ী',               en: 'Winner',             de: 'Gewinner' },
  { key: 'tbl.comment',          bn: 'মন্তব্য',               en: 'Comment',            de: 'Kommentar' },
  { key: 'tbl.pay_ref',          bn: 'পেমেন্ট রেফ.',          en: 'Pay Ref.',           de: 'Zahlungsref.' },
  { key: 'tbl.column',           bn: 'কলাম',                 en: 'Column',             de: 'Spalte' },
  { key: 'tbl.req',              bn: 'প্রয়োজনীয়',            en: 'Required',           de: 'Erforderlich' },
  { key: 'tbl.key',              bn: 'কী',                   en: 'Key',                de: 'Schlüssel' },
  { key: 'tbl.percentage',       bn: 'শতাংশ',                en: 'Percentage',         de: 'Prozentsatz' },

  // ── dashboard ────────────────────────────────────────────────────────────
  { key: 'admin.pg_dashboard',      bn: 'ড্যাশবোর্ড',              en: 'Dashboard',              de: 'Dashboard' },
  { key: 'admin.stat_total_events', bn: 'মোট ইভেন্ট',              en: 'Total Events',           de: 'Gesamt Veranstaltungen' },
  { key: 'admin.stat_active_events',bn: 'সক্রিয় ইভেন্ট',          en: 'Active Events',          de: 'Aktive Veranstaltungen' },
  { key: 'admin.stat_total_regs',   bn: 'মোট নিবন্ধন',             en: 'Total Registrations',    de: 'Anmeldungen gesamt' },
  { key: 'admin.stat_paid_regs',    bn: 'পরিশোধিত',                en: 'Paid',                   de: 'Bezahlt' },
  { key: 'admin.empty_events',      bn: 'এখনো কোনো ইভেন্ট নেই।',  en: 'No events yet.',         de: 'Noch keine Veranstaltungen.' },
  { key: 'admin.create_first_event',bn: 'প্রথম ইভেন্ট তৈরি করুন।', en: 'Create your first event.', de: 'Erste Veranstaltung erstellen.' },
  { key: 'admin.badge_active',      bn: 'সক্রিয়',                  en: 'Active',                 de: 'Aktiv' },
  { key: 'admin.badge_inactive',    bn: 'নিষ্ক্রিয়',               en: 'Inactive',               de: 'Inaktiv' },
  { key: 'admin.paid_of_total',     bn: 'পরিশোধিত / মোট',          en: 'paid / total',           de: 'bezahlt / gesamt' },

  // ── events list ───────────────────────────────────────────────────────────
  { key: 'admin.pg_events',         bn: 'ইভেন্টসমূহ',              en: 'Events',                 de: 'Veranstaltungen' },
  { key: 'admin.empty_events_list', bn: 'এখনো কোনো ইভেন্ট নেই।',  en: 'No events yet.',         de: 'Noch keine Veranstaltungen.' },
  { key: 'admin.open',              bn: 'খোলা',                    en: 'Open',                   de: 'Offen' },
  { key: 'admin.closed',            bn: 'বন্ধ',                    en: 'Closed',                 de: 'Geschlossen' },

  // ── event detail ─────────────────────────────────────────────────────────
  { key: 'admin.field_description', bn: 'বিবরণ',                   en: 'Description',            de: 'Beschreibung' },
  { key: 'admin.field_datetime',    bn: 'তারিখ ও সময়',             en: 'Date & Time',            de: 'Datum & Uhrzeit' },
  { key: 'admin.field_capacity',    bn: 'সর্বোচ্চ ধারণক্ষমতা',     en: 'Max Capacity',           de: 'Maximale Kapazität' },
  { key: 'admin.field_location',    bn: 'স্থান',                   en: 'Location',               de: 'Ort' },
  { key: 'admin.ticket_prices',     bn: 'টিকিট মূল্য',             en: 'Ticket Prices',          de: 'Ticketpreise' },
  { key: 'admin.price_early',       bn: 'হলদে বউ মূল্য',           en: 'Early Bird Price',       de: 'Frühbucher-Preis' },
  { key: 'admin.deadline_early',    bn: 'হলদে বউ সময়সীমা',        en: 'Early Bird Deadline',    de: 'Frühbucher-Frist' },
  { key: 'admin.price_mid',         bn: 'নীলকণ্ঠ মূল্য',           en: 'Standard Price',         de: 'Standardpreis' },
  { key: 'admin.deadline_mid',      bn: 'নীলকণ্ঠ সময়সীমা',        en: 'Standard Deadline',      de: 'Standard-Frist' },
  { key: 'admin.price_onspot',      bn: 'কোকিলা (অনস্পট) মূল্য',   en: 'On-the-Day Price',       de: 'Tageskassen-Preis' },
  { key: 'admin.field_submissions', bn: 'সাবমিশন',                 en: 'Submissions',            de: 'Einreichungen' },
  { key: 'admin.open_label',        bn: 'উন্মুক্ত',                en: 'Open',                   de: 'Offen' },
  { key: 'admin.closed_label',      bn: 'বন্ধ',                   en: 'Closed',                 de: 'Geschlossen' },
  { key: 'admin.field_banner',      bn: 'ব্যানার',                  en: 'Banner',                 de: 'Banner' },

  // ── event form ────────────────────────────────────────────────────────────
  { key: 'admin.pg_edit_event',     bn: 'ইভেন্ট সম্পাদনা',         en: 'Edit Event',             de: 'Veranstaltung bearbeiten' },
  { key: 'admin.pg_new_event',      bn: 'নতুন ইভেন্ট',             en: 'New Event',              de: 'Neue Veranstaltung' },
  { key: 'admin.section_event_info',bn: 'ইভেন্ট তথ্য',             en: 'Event Info',             de: 'Veranstaltungsinfo' },
  { key: 'admin.lbl_event_title',   bn: 'ইভেন্টের শিরোনাম *',      en: 'Event Title *',          de: 'Titel der Veranstaltung *' },
  { key: 'admin.lbl_desc_bn',       bn: 'বিবরণ (বাংলা)',            en: 'Description (Bengali)',  de: 'Beschreibung (Bengalisch)' },
  { key: 'admin.lbl_event_active',  bn: 'ইভেন্ট সক্রিয় (সাইটে দৃশ্যমান)', en: 'Event active (visible on site)', de: 'Veranstaltung aktiv (auf der Website sichtbar)' },
  { key: 'admin.banner_timed',      bn: 'ব্যানার ছবি (সময়ভিত্তিক)', en: 'Banner Images (time-based)', de: 'Banner-Bilder (zeitbasiert)' },
  { key: 'admin.banner_hint',       bn: 'প্রতিটি মূল্য-স্তরে আলাদা ব্যানার দেখানো হবে। খালি রাখলে হলদে বউ ব্যানারটি ব্যবহার হবে।', en: 'A different banner is shown for each price tier. Leave blank to use the Early Bird banner.', de: 'Für jede Preisstufe wird ein anderes Banner angezeigt. Leer lassen, um das Frühbucher-Banner zu verwenden.' },
  { key: 'admin.lbl_banner_early',  bn: '🟡 হলদে বউ ব্যানার (ডিফল্ট)', en: '🟡 Early Bird Banner (default)', de: '🟡 Frühbucher-Banner (Standard)' },
  { key: 'admin.lbl_banner_mid',    bn: '🔵 নীলকণ্ঠ ব্যানার',       en: '🔵 Standard Banner',     de: '🔵 Standard-Banner' },
  { key: 'admin.lbl_banner_onspot', bn: '🟤 কোকিলা ব্যানার',        en: '🟤 On-the-Day Banner',   de: '🟤 Tageskassen-Banner' },
  { key: 'admin.lbl_banner_post',   bn: '🔴 ইভেন্ট-পরবর্তী ব্যানার', en: '🔴 Post-Event Banner',  de: '🔴 Nachveranstaltungs-Banner' },
  { key: 'admin.lbl_popup',         bn: 'পপআপ ছবি',                 en: 'Popup Image',            de: 'Popup-Bild' },
  { key: 'admin.popup_hint',        bn: 'হোম পেজে লোডে পপআপ হিসেবে দেখাবে। খালি রাখলে পপআপ নেই।', en: 'Shown as a popup when the home page loads. Leave blank for no popup.', de: 'Wird als Popup beim Laden der Startseite angezeigt. Leer lassen für kein Popup.' },
  { key: 'admin.btn_save_event_info', bn: 'তথ্য সংরক্ষণ',           en: 'Save Info',              de: 'Info speichern' },
  { key: 'admin.btn_create_event',  bn: 'ইভেন্ট তৈরি করুন',         en: 'Create Event',           de: 'Veranstaltung erstellen' },
  { key: 'admin.section_payment',   bn: 'পেমেন্ট তথ্য',             en: 'Payment Info',           de: 'Zahlungsinfo' },
  { key: 'admin.lbl_pay_desc_bn',   bn: 'পেমেন্ট নির্দেশনা (বাংলা)', en: 'Payment Instructions (Bengali)', de: 'Zahlungsanweisungen (Bengalisch)' },
  { key: 'admin.price_hint',        bn: 'খালি রাখলে মূল্য প্রদর্শিত হবে না। প্রতিটি স্তর তার নির্ধারিত সময়সীমা পর্যন্ত সক্রিয় থাকে।', en: 'Leave blank to hide pricing. Each tier is active until its deadline.', de: 'Leer lassen, um Preise auszublenden. Jede Stufe ist bis zu ihrer Frist aktiv.' },
  { key: 'admin.lbl_price_early',   bn: 'হলদে বউ মূল্য (€)',        en: 'Early Bird Price (€)',   de: 'Frühbucher-Preis (€)' },
  { key: 'admin.lbl_deadline_early',bn: 'হলদে বউ সময়সীমা',         en: 'Early Bird Deadline',    de: 'Frühbucher-Frist' },
  { key: 'admin.lbl_price_mid',     bn: 'নীলকণ্ঠ মূল্য (€)',        en: 'Standard Price (€)',     de: 'Standardpreis (€)' },
  { key: 'admin.lbl_deadline_mid',  bn: 'নীলকণ্ঠ সময়সীমা',         en: 'Standard Deadline',      de: 'Standard-Frist' },
  { key: 'admin.mid_hint',          bn: 'হলদে বউ সময়সীমার পর থেকে এই তারিখ পর্যন্ত নীলকণ্ঠ মূল্য প্রযোজ্য।', en: 'Standard price applies from the Early Bird deadline to this date.', de: 'Standardpreis gilt ab der Frühbucher-Frist bis zu diesem Datum.' },
  { key: 'admin.lbl_price_onspot',  bn: 'কোকিলা মূল্য (€)',         en: 'On-the-Day Price (€)',   de: 'Tageskassen-Preis (€)' },
  { key: 'admin.onspot_hint',       bn: 'নীলকণ্ঠ সময়সীমার পর থেকে ইভেন্ট শেষ পর্যন্ত কোকিলা মূল্য প্রযোজ্য।', en: 'On-the-day price applies from the Standard deadline until the event ends.', de: 'Tageskassen-Preis gilt ab der Standard-Frist bis zum Ende der Veranstaltung.' },
  { key: 'admin.lbl_group_min',          bn: 'গ্রুপ ছাড়ের ন্যূনতম সদস্য সংখ্যা', en: 'Min. group size for discount',  de: 'Mindestgruppengröße für Rabatt' },
  { key: 'admin.lbl_group_min_hint',     bn: 'এতজন বা তার বেশি হলে ছাড় পাবে',   en: 'Discount applies at this many adults or more', de: 'Rabatt ab dieser Personenzahl' },
  { key: 'admin.lbl_group_discount',     bn: 'গ্রুপ ছাড়ের পরিমাণ (€)',           en: 'Group Discount (€)',             de: 'Gruppenrabatt (€)' },
  { key: 'admin.lbl_group_discount_hint',bn: 'মোট মূল্য থেকে কাটা হবে',          en: 'Deducted from total price',      de: 'Wird vom Gesamtpreis abgezogen' },
  { key: 'admin.lbl_paypal_qr',     bn: 'PayPal QR কোড',            en: 'PayPal QR Code',         de: 'PayPal QR-Code' },
  { key: 'admin.lbl_sub_open',      bn: 'সাবমিশন উন্মুক্ত',         en: 'Submissions open',       de: 'Einreichungen offen' },
  { key: 'admin.btn_save_payment',  bn: 'পেমেন্ট তথ্য সংরক্ষণ',     en: 'Save Payment Info',      de: 'Zahlungsinfo speichern' },
  { key: 'admin.danger_zone',       bn: 'বিপদ অঞ্চল',               en: 'Danger Zone',            de: 'Gefahrenzone' },
  { key: 'admin.btn_delete_event',  bn: 'ইভেন্ট মুছুন',             en: 'Delete Event',           de: 'Veranstaltung löschen' },
  { key: 'admin.lbl_location_ph',   bn: 'ভেন্যুর নাম, ঠিকানা',      en: 'Venue name, address',    de: 'Veranstaltungsort, Adresse' },

  // ── registrations ─────────────────────────────────────────────────────────
  { key: 'admin.pg_registrations',  bn: 'নিবন্ধনসমূহ',              en: 'Registrations',          de: 'Anmeldungen' },
  { key: 'admin.total',             bn: 'মোট',                      en: 'Total',                  de: 'Gesamt' },
  { key: 'admin.pending',           bn: 'অপেক্ষমাণ',                en: 'Pending',                de: 'Ausstehend' },
  { key: 'admin.empty_regs',        bn: 'এখনো কোনো নিবন্ধন নেই।',  en: 'No registrations yet.',  de: 'Noch keine Anmeldungen.' },
  { key: 'admin.status_paid',       bn: 'পরিশোধিত',                 en: 'Paid',                   de: 'Bezahlt' },
  { key: 'admin.status_pending',    bn: 'অপেক্ষমাণ',                en: 'Pending',                de: 'Ausstehend' },
  { key: 'admin.status_unpaid',     bn: 'অপরিশোধিত',               en: 'Unpaid',                 de: 'Unbezahlt' },

  // ── registration form ─────────────────────────────────────────────────────
  { key: 'admin.pg_add_reg',        bn: 'নিবন্ধন যোগ করুন',         en: 'Add Registration',       de: 'Anmeldung hinzufügen' },
  { key: 'admin.current_price',     bn: 'বর্তমান মূল্য:',           en: 'Current Price:',         de: 'Aktueller Preis:' },
  { key: 'admin.lbl_full_name',     bn: 'পূর্ণ নাম *',              en: 'Full Name *',            de: 'Vollständiger Name *' },
  { key: 'admin.lbl_email',         bn: 'ইমেইল',                   en: 'Email',                  de: 'E-Mail' },
  { key: 'admin.email_qr_hint',     bn: 'ইমেইল দিলে QR কোড পাঠানো হবে।', en: 'A QR code will be sent if email is provided.', de: 'Bei Angabe der E-Mail wird ein QR-Code gesendet.' },
  { key: 'admin.lbl_phone',         bn: 'ফোন নম্বর *',              en: 'Phone Number *',         de: 'Telefonnummer *' },
  { key: 'admin.lbl_ticket_price',  bn: 'টিকেট মূল্য (€)',          en: 'Ticket Price (€)',       de: 'Ticketpreis (€)' },
  { key: 'admin.lbl_transaction_id',bn: 'লেনদেন আইডি',              en: 'Transaction ID',         de: 'Transaktions-ID' },
  { key: 'admin.lbl_pay_ref',       bn: 'পুরোনো পেমেন্ট রেফারেন্স', en: 'Legacy Payment Reference', de: 'Alter Zahlungsreferenz' },
  { key: 'admin.lbl_pay_ref_ph',    bn: 'অতিরিক্ত নোট',             en: 'Additional note',        de: 'Zusätzliche Anmerkung' },
  { key: 'admin.btn_add_reg',       bn: 'নিবন্ধন যোগ করুন',         en: 'Add Registration',       de: 'Anmeldung hinzufügen' },

  // ── submissions ───────────────────────────────────────────────────────────
  { key: 'admin.pg_submissions',    bn: 'সাবমিশনসমূহ',              en: 'Submissions',            de: 'Einreichungen' },
  { key: 'admin.empty_submissions', bn: 'কোনো অপেক্ষমাণ সাবমিশন নেই।', en: 'No pending submissions.', de: 'Keine ausstehenden Einreichungen.' },
  { key: 'admin.tbl_contact',       bn: 'যোগাযোগ',                  en: 'Contact',                de: 'Kontakt' },
  { key: 'admin.tbl_children',      bn: 'শিশু (অনূর্ধ্ব-১৫)',        en: 'Children (under 15)',    de: 'Kinder (unter 15)' },
  { key: 'admin.tbl_adults',        bn: 'প্রাপ্তবয়স্ক (১৫+)',        en: 'Adults (15+)',           de: 'Erwachsene (15+)' },
  { key: 'admin.tbl_pay_ref',       bn: 'পেমেন্ট রেফারেন্স',         en: 'Payment Reference',      de: 'Zahlungsreferenz' },

  // ── expenses ──────────────────────────────────────────────────────────────
  { key: 'admin.pg_expenses',       bn: 'খরচসমূহ',                  en: 'Expenses',               de: 'Ausgaben' },
  { key: 'admin.total_expense',     bn: 'মোট খরচ:',                 en: 'Total Expenses:',        de: 'Gesamtausgaben:' },
  { key: 'admin.empty_expenses',    bn: 'কোনো খরচ নথিভুক্ত হয়নি।', en: 'No expenses recorded.',  de: 'Keine Ausgaben erfasst.' },

  // ── expense form ──────────────────────────────────────────────────────────
  { key: 'admin.pg_add_expense',    bn: 'খরচ যোগ করুন',             en: 'Add Expense',            de: 'Ausgabe hinzufügen' },
  { key: 'admin.lbl_category',      bn: 'ক্যাটাগরি',                en: 'Category',               de: 'Kategorie' },
  { key: 'admin.select_category',   bn: '— ক্যাটাগরি বাছুন —',      en: '— Select Category —',   de: '— Kategorie wählen —' },
  { key: 'admin.lbl_description',   bn: 'বিবরণ *',                  en: 'Description *',          de: 'Beschreibung *' },
  { key: 'admin.lbl_amount',        bn: 'পরিমাণ (€) *',             en: 'Amount (€) *',           de: 'Betrag (€) *' },
  { key: 'admin.lbl_receipt',       bn: 'রসিদের ছবি (ঐচ্ছিক)',      en: 'Receipt Image (optional)', de: 'Quittungsbild (optional)' },
  { key: 'admin.btn_add_expense',   bn: 'খরচ যোগ করুন',             en: 'Add Expense',            de: 'Ausgabe hinzufügen' },

  // ── expense categories ────────────────────────────────────────────────────
  { key: 'admin.pg_expense_cats',   bn: 'খরচের ক্যাটাগরি',          en: 'Expense Categories',     de: 'Ausgabenkategorien' },
  { key: 'admin.expense_cats_hint', bn: 'এই তালিকা খরচ যোগ করার ফর্মে ড্রপডাউনে দেখাবে।', en: 'This list appears in the expense form dropdown.', de: 'Diese Liste erscheint im Dropdown des Ausgabenformulars.' },
  { key: 'admin.lbl_cats_per_line', bn: 'ক্যাটাগরিসমূহ (প্রতি লাইনে একটি)', en: 'Categories (one per line)', de: 'Kategorien (eine pro Zeile)' },

  // ── incomes ───────────────────────────────────────────────────────────────
  { key: 'admin.pg_incomes',        bn: 'আয়সমূহ',                  en: 'Incomes',                de: 'Einnahmen' },
  { key: 'admin.total_income',      bn: 'মোট আয়:',                 en: 'Total Income:',          de: 'Gesamteinnahmen:' },
  { key: 'admin.empty_incomes',     bn: 'কোনো আয় নথিভুক্ত হয়নি।', en: 'No income recorded.',    de: 'Keine Einnahmen erfasst.' },

  // ── income form ───────────────────────────────────────────────────────────
  { key: 'admin.pg_add_income',     bn: 'আয় যোগ করুন',             en: 'Add Income',             de: 'Einnahme hinzufügen' },
  { key: 'admin.select_income_cat', bn: '— বেছে নিন —',             en: '— Select —',             de: '— Auswählen —' },
  { key: 'admin.lbl_amount_opt',    bn: 'পরিমাণ (€) *',             en: 'Amount (€) *',           de: 'Betrag (€) *' },
  { key: 'admin.lbl_payment_date',  bn: 'পেমেন্টের তারিখ ও সময়',   en: 'Payment Date & Time',    de: 'Zahlungsdatum & -uhrzeit' },
  { key: 'admin.lbl_payer_name',    bn: 'প্রদানকারীর নাম',          en: 'Payer Name',             de: 'Name des Zahlers' },
  { key: 'admin.lbl_payer_email',   bn: 'প্রদানকারীর ইমেইল',        en: 'Payer Email',            de: 'E-Mail des Zahlers' },
  { key: 'admin.btn_save_income',   bn: 'আয় সংরক্ষণ করুন',         en: 'Save Income',            de: 'Einnahme speichern' },

  // ── income categories ─────────────────────────────────────────────────────
  { key: 'admin.pg_income_cats',    bn: 'আয়ের ক্যাটাগরি',           en: 'Income Categories',      de: 'Einnahmekategorien' },
  { key: 'admin.income_cats_hint',  bn: 'এই তালিকা আয় যোগ করার ফর্মে ড্রপডাউনে দেখাবে।', en: 'This list appears in the income form dropdown.', de: 'Diese Liste erscheint im Dropdown des Einnahmenformulars.' },
  { key: 'admin.lbl_income_cats',   bn: 'ক্যাটাগরিসমূহ (প্রতি লাইনে একটি)', en: 'Categories (one per line)', de: 'Kategorien (eine pro Zeile)' },

  // ── bulk payment ──────────────────────────────────────────────────────────
  { key: 'admin.pg_bulk_payment',   bn: 'বাল্ক পেমেন্ট আমদানি',    en: 'Bulk Payment Import',    de: 'Massenzahlung importieren' },
  { key: 'bulk.csv_format',         bn: 'CSV/Excel ফরম্যাট:',       en: 'CSV/Excel Format:',      de: 'CSV/Excel-Format:' },
  { key: 'bulk.csv_hint',           bn: 'কলামগুলো হবে: <code>name</code>, <code>email</code>, <code>transaction_id</code>, <code>amount</code><br>প্রথম সারি হেডার হিসেবে ব্যবহার হবে। <code>amount</code> ঐচ্ছিক।', en: 'Columns: <code>name</code>, <code>email</code>, <code>transaction_id</code>, <code>amount</code><br>First row used as header. <code>amount</code> is optional.', de: 'Spalten: <code>name</code>, <code>email</code>, <code>transaction_id</code>, <code>amount</code><br>Erste Zeile als Header. <code>amount</code> ist optional.' },
  { key: 'bulk.lbl_payment_file',   bn: 'পেমেন্ট ফাইল (CSV বা Excel .xlsx)', en: 'Payment File (CSV or Excel .xlsx)', de: 'Zahlungsdatei (CSV oder Excel .xlsx)' },
  { key: 'bulk.transaction_date',   bn: 'পেমেন্টের তারিখ',           en: 'Transaction Date',       de: 'Transaktionsdatum' },
  { key: 'bulk.stat_paid',          bn: 'পরিশোধিত হয়েছে',           en: 'Marked as Paid',         de: 'Als bezahlt markiert' },
  { key: 'bulk.stat_already_paid',  bn: 'ইতিমধ্যে পরিশোধিত / এড়ানো হয়েছে', en: 'Already Paid / Skipped', de: 'Bereits bezahlt / Übersprungen' },
  { key: 'bulk.stat_not_found',     bn: 'পাওয়া যায়নি',              en: 'Not Found',              de: 'Nicht gefunden' },
  { key: 'bulk.section_paid',       bn: 'পরিশোধিত',                 en: 'Paid',                   de: 'Bezahlt' },
  { key: 'bulk.section_not_found',  bn: 'পাওয়া যায়নি',              en: 'Not Found',              de: 'Nicht gefunden' },
  { key: 'bulk.section_skipped',    bn: 'এড়ানো হয়েছে',              en: 'Skipped',                de: 'Übersprungen' },

  // ── financial dashboard ───────────────────────────────────────────────────
  { key: 'admin.pg_financial',      bn: 'আর্থিক ড্যাশবোর্ড',        en: 'Financial Dashboard',    de: 'Finanzdashboard' },
  { key: 'admin.stat_total_income', bn: 'মোট আয়',                  en: 'Total Income',           de: 'Gesamteinnahmen' },
  { key: 'admin.stat_total_expense',bn: 'মোট খরচ',                  en: 'Total Expenses',         de: 'Gesamtausgaben' },
  { key: 'admin.stat_total_refund', bn: 'মোট রিফান্ড',              en: 'Total Refunds',          de: 'Gesamterstattungen' },
  { key: 'admin.stat_net_profit',   bn: 'নেট লাভ',                  en: 'Net Profit',             de: 'Nettogewinn' },
  { key: 'admin.stat_net_loss',     bn: 'নেট ক্ষতি',                en: 'Net Loss',               de: 'Nettoverlust' },
  { key: 'admin.stat_paid_regs2',   bn: 'পরিশোধিত নিবন্ধন',         en: 'Paid Registrations',     de: 'Bezahlte Anmeldungen' },
  { key: 'admin.stat_unpaid_regs',  bn: 'অপরিশোধিত নিবন্ধন',       en: 'Unpaid Registrations',   de: 'Unbezahlte Anmeldungen' },
  { key: 'admin.income_by_cat',     bn: 'আয়ের ক্যাটাগরি',           en: 'Income by Category',     de: 'Einnahmen nach Kategorie' },
  { key: 'admin.expense_by_cat',    bn: 'খরচের ক্যাটাগরি',          en: 'Expenses by Category',   de: 'Ausgaben nach Kategorie' },
  { key: 'admin.income_breakdown',  bn: 'আয়ের বিভাজন',              en: 'Income Breakdown',       de: 'Einnahmenaufschlüsselung' },
  { key: 'admin.other',             bn: 'অন্যান্য',                 en: 'Other',                  de: 'Sonstige' },
  { key: 'admin.btn_export_financial', bn: 'Excel ডাউনলোড',         en: 'Excel Download',         de: 'Excel herunterladen' },
  { key: 'admin.btn_export_regs',   bn: 'নিবন্ধন Excel',            en: 'Registrations Excel',    de: 'Anmeldungen Excel' },
  { key: 'admin.btn_export_incomes',bn: 'আয় Excel',                en: 'Income Excel',           de: 'Einnahmen Excel' },
  { key: 'admin.btn_export_expenses',bn: 'খরচ Excel',              en: 'Expenses Excel',         de: 'Ausgaben Excel' },

  // ── volunteers ────────────────────────────────────────────────────────────
  { key: 'admin.pg_volunteers',     bn: 'স্বেচ্ছাসেবী',              en: 'Volunteers',             de: 'Freiwillige' },
  { key: 'admin.empty_volunteers',  bn: 'এখনো কোনো স্বেচ্ছাসেবী নিবন্ধন নেই।', en: 'No volunteers registered yet.', de: 'Noch keine Freiwilligen registriert.' },
  { key: 'admin.vol_status_pending',bn: 'অপেক্ষমাণ',               en: 'Pending',                de: 'Ausstehend' },
  { key: 'admin.vol_status_approved',bn: 'অনুমোদিত',               en: 'Approved',               de: 'Genehmigt' },
  { key: 'admin.vol_status_rejected',bn: 'প্রত্যাখ্যাত',            en: 'Rejected',               de: 'Abgelehnt' },
  { key: 'admin.session_expired',   bn: 'মেয়াদ শেষ',               en: 'Expired',                de: 'Abgelaufen' },
  { key: 'admin.session_none',      bn: 'নেই',                     en: 'None',                   de: 'Keine' },
  { key: 'admin.session_min',       bn: 'মিনিট',                   en: 'min',                    de: 'Min.' },
  { key: 'admin.select_task',       bn: '— কাজ বেছে নিন —',         en: '— Select Task —',        de: '— Aufgabe wählen —' },
  { key: 'admin.task_input_ph',     bn: 'কাজ নির্ধারণ...',          en: 'Assign task...',         de: 'Aufgabe zuweisen...' },
  { key: 'admin.vt_stall',          bn: 'স্টল পর্যবেক্ষণ',         en: 'Stall Supervision',      de: 'Standaufsicht' },
  { key: 'admin.vt_reg',            bn: 'রেজিস্ট্রেশন',             en: 'Registration',           de: 'Anmeldung' },
  { key: 'admin.vt_qr',             bn: 'QR যাচাইকারী',             en: 'QR Validator',           de: 'QR-Prüfer' },
  { key: 'admin.vt_music',          bn: 'সংগীত ও মঞ্চ',             en: 'Music & Stage',          de: 'Musik & Bühne' },
  { key: 'admin.vt_competition',    bn: 'প্রতিযোগিতা',              en: 'Competition',            de: 'Wettbewerb' },
  { key: 'admin.vt_anchor',         bn: 'উপস্থাপনা',                en: 'Anchoring',              de: 'Moderation' },
  { key: 'admin.vt_performer',      bn: 'সংগীতশিল্পী ও পরিবেশক',   en: 'Performers',             de: 'Darsteller' },
  { key: 'admin.vt_control_room',   bn: 'কন্ট্রোল রুম',             en: 'Control Room',           de: 'Kontrollraum' },

  // ── volunteer form ────────────────────────────────────────────────────────
  { key: 'admin.pg_new_volunteer',  bn: 'নতুন স্বেচ্ছাসেবী',         en: 'New Volunteer',          de: 'Neuer Freiwilliger' },
  { key: 'admin.lbl_remuneration',  bn: 'পারিশ্রমিক (€)',            en: 'Remuneration (€)',       de: 'Vergütung (€)' },
  { key: 'admin.btn_add_volunteer', bn: 'স্বেচ্ছাসেবী যোগ করুন',     en: 'Add Volunteer',          de: 'Freiwilligen hinzufügen' },

  // ── volunteer tasks ───────────────────────────────────────────────────────
  { key: 'admin.pg_volunteer_tasks',bn: 'স্বেচ্ছাসেবী কাজের তালিকা', en: 'Volunteer Task List',   de: 'Freiwilligenaufgabenliste' },
  { key: 'admin.vol_tasks_hint',    bn: 'প্রতিটি কাজের নাম ও ভূমিকা নির্ধারণ করুন। ভূমিকা অনুযায়ী স্বেচ্ছাসেবী লগইনের পর সঠিক পেজে পাঠানো হবে।', en: 'Set the name and role for each task. Volunteers are directed to the correct page based on their role.', de: 'Legen Sie Name und Rolle für jede Aufgabe fest. Freiwillige werden basierend auf ihrer Rolle zur richtigen Seite geleitet.' },
  { key: 'admin.task_name_ph',      bn: 'কাজের নাম',                 en: 'Task name',              de: 'Aufgabenname' },

  // ── stalls ────────────────────────────────────────────────────────────────
  { key: 'admin.pg_stalls',         bn: 'স্টলসমূহ',                 en: 'Stalls',                 de: 'Stände' },
  { key: 'admin.empty_stalls',      bn: 'কোনো স্টল কনফিগার করা হয়নি।', en: 'No stalls configured.', de: 'Keine Stände konfiguriert.' },
  { key: 'admin.stalls_occupied',   bn: 'দখলকৃত',                  en: 'Occupied',               de: 'Belegt' },
  { key: 'admin.stalls_free',       bn: 'খালি',                    en: 'Free',                   de: 'Frei' },
  { key: 'admin.stall_occupied',    bn: 'দখলকৃত',                  en: 'Occupied',               de: 'Belegt' },
  { key: 'admin.stall_free',        bn: 'খালি',                    en: 'Free',                   de: 'Frei' },
  { key: 'admin.observation',       bn: 'পর্যবেক্ষণ',               en: 'Observation',            de: 'Beobachtung' },
  { key: 'admin.edit_assign',       bn: 'সম্পাদনা/বরাদ্দ',          en: 'Edit/Assign',            de: 'Bearbeiten/Zuweisen' },

  // ── stall form ────────────────────────────────────────────────────────────
  { key: 'admin.pg_edit_stall',     bn: 'স্টল সম্পাদনা',            en: 'Edit Stall',             de: 'Stand bearbeiten' },
  { key: 'admin.pg_new_stall',      bn: 'নতুন স্টল',                en: 'New Stall',              de: 'Neuer Stand' },
  { key: 'admin.lbl_stall_name',    bn: 'স্টলের নাম *',             en: 'Stall Name *',           de: 'Standname *' },
  { key: 'admin.lbl_location_spot', bn: 'অবস্থান / স্পট',           en: 'Location / Spot',        de: 'Standort / Platz' },
  { key: 'admin.lbl_location_ph2',  bn: 'যেমন: এলাকা ক, বুথ ৩',    en: 'e.g. Zone A, Booth 3',  de: 'z.B. Zone A, Stand 3' },
  { key: 'admin.section_assignment',bn: 'বরাদ্দ',                  en: 'Assignment',             de: 'Zuweisung' },
  { key: 'admin.lbl_vendor_name',   bn: 'বিক্রেতা / ব্যক্তির নাম',  en: 'Vendor / Person Name',  de: 'Händler / Personenname' },
  { key: 'admin.lbl_stall_fee',     bn: 'স্টল ফি (€)',              en: 'Stall Fee (€)',          de: 'Standgebühr (€)' },
  { key: 'admin.lbl_obs_notes',     bn: 'পর্যবেক্ষণ নোট',           en: 'Observation Notes',      de: 'Beobachtungsnotizen' },
  { key: 'admin.obs_notes_ph',      bn: 'স্টল পরিদর্শনের নোট, সমস্যা বা মন্তব্য...', en: 'Stall inspection notes, issues or comments...', de: 'Stand-Inspektionsnotizen, Probleme oder Kommentare...' },
  { key: 'admin.btn_save_stall',    bn: 'পরিবর্তন সংরক্ষণ',         en: 'Save Changes',           de: 'Änderungen speichern' },
  { key: 'admin.btn_create_stall',  bn: 'স্টল তৈরি করুন',           en: 'Create Stall',           de: 'Stand erstellen' },

  // ── stall obs types ───────────────────────────────────────────────────────
  { key: 'admin.pg_stall_obs_types',bn: 'স্টল পর্যবেক্ষণ ধরন',      en: 'Stall Observation Types', de: 'Standbeobachtungstypen' },
  { key: 'admin.stall_obs_hint',    bn: 'এই তালিকা সকল ইভেন্টের স্টল পর্যবেক্ষণ ফর্মে ড্রপডাউনে দেখাবে।', en: 'This list appears in the stall observation form dropdown for all events.', de: 'Diese Liste erscheint im Dropdown des Stand-Beobachtungsformulars für alle Veranstaltungen.' },
  { key: 'admin.lbl_obs_types',     bn: 'পর্যবেক্ষণের ধরনসমূহ (প্রতি লাইনে একটি)', en: 'Observation Types (one per line)', de: 'Beobachtungstypen (eine pro Zeile)' },

  // ── stall observations ────────────────────────────────────────────────────
  { key: 'admin.pg_observations',   bn: 'পর্যবেক্ষণ',               en: 'Observations',           de: 'Beobachtungen' },
  { key: 'admin.empty_observations',bn: 'এই স্টলে এখনো কোনো পর্যবেক্ষণ নেই।', en: 'No observations yet for this stall.', de: 'Noch keine Beobachtungen für diesen Stand.' },
  { key: 'admin.back_stalls',       bn: '← স্টলসমূহ',              en: '← Stalls',               de: '← Stände' },

  // ── polls ─────────────────────────────────────────────────────────────────
  { key: 'admin.pg_polls',          bn: 'ভোটসমূহ',                 en: 'Polls',                  de: 'Abstimmungen' },
  { key: 'admin.empty_polls',       bn: 'এখনো কোনো ভোট তৈরি হয়নি।', en: 'No polls created yet.', de: 'Noch keine Abstimmungen erstellt.' },
  { key: 'admin.poll_active',       bn: 'সক্রিয়',                  en: 'Active',                 de: 'Aktiv' },
  { key: 'admin.poll_inactive',     bn: 'নিষ্ক্রিয়',               en: 'Inactive',               de: 'Inaktiv' },

  // ── poll form ─────────────────────────────────────────────────────────────
  { key: 'admin.pg_new_poll',       bn: 'নতুন ভোট',                en: 'New Poll',               de: 'Neue Abstimmung' },
  { key: 'admin.lbl_poll_question', bn: 'ভোটের প্রশ্ন *',           en: 'Poll Question *',        de: 'Abstimmungsfrage *' },
  { key: 'admin.poll_question_ph',  bn: 'যেমন: কোন পরিবেশনাটি আপনার সবচেয়ে ভালো লেগেছে?', en: 'e.g. Which performance did you enjoy most?', de: 'z.B. Welche Darbietung hat Ihnen am besten gefallen?' },
  { key: 'admin.lbl_options',       bn: 'বিকল্পসমূহ (সর্বোচ্চ ৬টি)', en: 'Options (max 6)',       de: 'Optionen (max. 6)' },
  { key: 'admin.btn_create_poll',   bn: 'ভোট তৈরি করুন',            en: 'Create Poll',            de: 'Abstimmung erstellen' },

  // ── announcements ─────────────────────────────────────────────────────────
  { key: 'admin.pg_announcements',  bn: 'ঘোষণা',                   en: 'Announcements',          de: 'Ankündigungen' },
  { key: 'admin.empty_announcements',bn: 'কোনো ঘোষণা যোগ করা হয়নি।', en: 'No announcements added.', de: 'Keine Ankündigungen hinzugefügt.' },
  { key: 'admin.ann_active',        bn: 'সক্রিয়',                  en: 'Active',                 de: 'Aktiv' },
  { key: 'admin.ann_inactive',      bn: 'নিষ্ক্রিয়',               en: 'Inactive',               de: 'Inaktiv' },

  // ── announcement form ─────────────────────────────────────────────────────
  { key: 'admin.pg_edit_announcement', bn: 'ঘোষণা সম্পাদনা',        en: 'Edit Announcement',      de: 'Ankündigung bearbeiten' },
  { key: 'admin.pg_new_announcement', bn: 'নতুন ঘোষণা',             en: 'New Announcement',       de: 'Neue Ankündigung' },
  { key: 'admin.lbl_title',         bn: 'শিরোনাম *',                en: 'Title *',                de: 'Titel *' },
  { key: 'admin.lbl_content_bn',    bn: 'বিষয়বস্তু (বাংলা) *',     en: 'Content (Bengali) *',    de: 'Inhalt (Bengalisch) *' },
  { key: 'admin.ann_content_ph',    bn: 'ঘোষণার বিস্তারিত লিখুন...', en: 'Write announcement details...', de: 'Ankündigungsdetails schreiben...' },
  { key: 'admin.lbl_sort_order',    bn: 'ক্রম',                    en: 'Order',                  de: 'Reihenfolge' },
  { key: 'admin.sort_order_hint',   bn: 'ছোট সংখ্যা আগে দেখাবে।',  en: 'Smaller numbers show first.', de: 'Kleinere Zahlen werden zuerst angezeigt.' },
  { key: 'admin.lbl_is_active',     bn: 'সক্রিয়',                  en: 'Active',                 de: 'Aktiv' },

  // ── ads ───────────────────────────────────────────────────────────────────
  { key: 'admin.pg_ads',            bn: 'বিজ্ঞাপন',                 en: 'Ads',                    de: 'Anzeigen' },
  { key: 'admin.empty_ads',         bn: 'কোনো বিজ্ঞাপন যোগ করা হয়নি।', en: 'No ads added.',       de: 'Keine Anzeigen hinzugefügt.' },
  { key: 'admin.ad_active',         bn: 'সক্রিয়',                  en: 'Active',                 de: 'Aktiv' },
  { key: 'admin.ad_inactive',       bn: 'নিষ্ক্রিয়',               en: 'Inactive',               de: 'Inaktiv' },

  // ── ad form ───────────────────────────────────────────────────────────────
  { key: 'admin.pg_edit_ad',        bn: 'বিজ্ঞাপন সম্পাদনা',        en: 'Edit Ad',                de: 'Anzeige bearbeiten' },
  { key: 'admin.pg_new_ad',         bn: 'নতুন বিজ্ঞাপন',            en: 'New Ad',                 de: 'Neue Anzeige' },
  { key: 'admin.lbl_ad_title',      bn: 'শিরোনাম *',                en: 'Title *',                de: 'Titel *' },
  { key: 'admin.lbl_ad_title_ph',   bn: 'যেমন: স্পনসর ব্যানার',     en: 'e.g. Sponsor Banner',   de: 'z.B. Sponsor-Banner' },
  { key: 'admin.lbl_desc_bn2',      bn: 'বিবরণ (বাংলা)',            en: 'Description (Bengali)',  de: 'Beschreibung (Bengalisch)' },
  { key: 'admin.lbl_link_url',      bn: 'লিংক (ক্লিক করলে যাবে)',   en: 'Link (click target)',    de: 'Link (Klickziel)' },
  { key: 'admin.lbl_image',         bn: 'ছবি',                      en: 'Image',                  de: 'Bild' },
  { key: 'admin.image_replace',     bn: '(বর্তমান ছবি আছে — নতুন আপলোড করলে বদলাবে)', en: '(existing image — upload new to replace)', de: '(vorhandenes Bild — neues hochladen zum Ersetzen)' },
  { key: 'admin.lbl_sort_order2',   bn: 'প্রদর্শন ক্রম (ছোট = আগে)', en: 'Display Order (smaller = first)', de: 'Anzeigereihenfolge (kleiner = zuerst)' },
  { key: 'admin.lbl_ad_active',     bn: 'সক্রিয় রাখুন',            en: 'Keep active',            de: 'Aktiv halten' },
  { key: 'admin.btn_save_ad',       bn: 'পরিবর্তন সংরক্ষণ',         en: 'Save Changes',           de: 'Änderungen speichern' },
  { key: 'admin.btn_create_ad',     bn: 'বিজ্ঞাপন তৈরি করুন',       en: 'Create Ad',              de: 'Anzeige erstellen' },

  // ── waitlist ──────────────────────────────────────────────────────────────
  { key: 'admin.pg_waitlist',       bn: 'ওয়েটলিস্ট',               en: 'Waitlist',               de: 'Warteliste' },
  { key: 'admin.empty_waitlist',    bn: 'ওয়েটলিস্টে কেউ নেই।',     en: 'No one on the waitlist.', de: 'Niemand auf der Warteliste.' },

  // ── refunds ───────────────────────────────────────────────────────────────
  { key: 'admin.pg_refunds',        bn: 'রিফান্ডসমূহ',              en: 'Refunds',                de: 'Erstattungen' },
  { key: 'admin.total_refund',      bn: 'মোট রিফান্ড:',             en: 'Total Refunds:',         de: 'Gesamterstattungen:' },
  { key: 'admin.empty_refunds',     bn: 'কোনো রিফান্ড নথিভুক্ত হয়নি।', en: 'No refunds recorded.', de: 'Keine Erstattungen erfasst.' },

  // ── refund form ───────────────────────────────────────────────────────────
  { key: 'admin.pg_add_refund',     bn: 'রিফান্ড যোগ করুন',         en: 'Add Refund',             de: 'Erstattung hinzufügen' },
  { key: 'admin.lbl_refund_amount', bn: 'রিফান্ড পরিমাণ (€) *',     en: 'Refund Amount (€) *',    de: 'Erstattungsbetrag (€) *' },
  { key: 'admin.lbl_refund_txn_id', bn: 'লেনদেন আইডি',              en: 'Transaction ID',         de: 'Transaktions-ID' },
  { key: 'admin.lbl_reg_optional',  bn: 'নিবন্ধন (ঐচ্ছিক)',         en: 'Registration (optional)', de: 'Anmeldung (optional)' },
  { key: 'admin.lbl_reason',        bn: 'কারণ',                    en: 'Reason',                 de: 'Grund' },
  { key: 'admin.reason_ph',         bn: 'রিফান্ডের কারণ লিখুন...',  en: 'Reason for refund...',   de: 'Grund für die Erstattung...' },
  { key: 'admin.btn_save_refund',   bn: 'রিফান্ড সংরক্ষণ করুন',     en: 'Save Refund',            de: 'Erstattung speichern' },

  // ── reports ───────────────────────────────────────────────────────────────
  { key: 'admin.pg_reports',        bn: 'রিপোর্ট',                  en: 'Report',                 de: 'Bericht' },
  { key: 'admin.stat_registrations',bn: 'নিবন্ধন',                  en: 'Registrations',          de: 'Anmeldungen' },
  { key: 'admin.stat_paid',         bn: 'পরিশোধিত',                 en: 'Paid',                   de: 'Bezahlt' },
  { key: 'admin.stat_unpaid',       bn: 'বাকি পেমেন্ট',             en: 'Pending Payment',        de: 'Ausstehende Zahlung' },
  { key: 'admin.stat_total_exp',    bn: 'মোট ব্যয়',                 en: 'Total Expenses',         de: 'Gesamtausgaben' },
  { key: 'admin.stat_pending_subs', bn: 'অপেক্ষমাণ জমা',            en: 'Pending Submissions',    de: 'Ausstehende Einreichungen' },
  { key: 'admin.stat_approved_vols',bn: 'অনুমোদিত স্বেচ্ছাসেবী',   en: 'Approved Volunteers',    de: 'Genehmigte Freiwillige' },
  { key: 'admin.suggestions',       bn: 'পরামর্শ ও পর্যবেক্ষণ',     en: 'Suggestions & Observations', de: 'Vorschläge & Beobachtungen' },
  { key: 'admin.reg_trend',         bn: 'নিবন্ধন প্রবণতা',          en: 'Registration Trend',     de: 'Anmeldetrend' },
  { key: 'admin.empty_reg_trend',   bn: 'এখনো কোনো নিবন্ধন নেই।', en: 'No registrations yet.',  de: 'Noch keine Anmeldungen.' },
  { key: 'admin.chart_reg_hint',    bn: 'বার = দৈনিক নিবন্ধন · লাইন = ৩-পর্যায়ের মুভিং অ্যাভারেজ · ড্যাশ = পূর্বাভাস', en: 'Bar = daily registrations · Line = 3-period moving avg · Dashed = forecast', de: 'Balken = tägliche Anmeldungen · Linie = 3-Perioden-MA · Gestrichelt = Prognose' },
  { key: 'admin.expense_trend',     bn: 'ব্যয় প্রবণতা',             en: 'Expense Trend',          de: 'Ausgabentrend' },
  { key: 'admin.empty_exp_trend',   bn: 'কোনো ব্যয় নথিভুক্ত নেই।', en: 'No expenses recorded.',  de: 'Keine Ausgaben erfasst.' },
  { key: 'admin.chart_exp_hint',    bn: 'বার = দৈনিক ব্যয় · লাইন = ৩-পর্যায়ের মুভিং অ্যাভারেজ · ড্যাশ = পূর্বাভাস', en: 'Bar = daily expenses · Line = 3-period moving avg · Dashed = forecast', de: 'Balken = tägliche Ausgaben · Linie = 3-Perioden-MA · Gestrichelt = Prognose' },
  { key: 'admin.registered_participants', bn: 'নিবন্ধিত অংশগ্রহণকারী', en: 'Registered Participants', de: 'Registrierte Teilnehmer' },
  { key: 'admin.empty_participants',bn: 'এখনো কোনো নিবন্ধন নেই।', en: 'No registrations yet.',  de: 'Noch keine Anmeldungen.' },
  { key: 'admin.section_expenses',  bn: 'ব্যয়সমূহ',                en: 'Expenses',               de: 'Ausgaben' },
  { key: 'admin.empty_expenses2',   bn: 'কোনো ব্যয় নথিভুক্ত নেই।', en: 'No expenses recorded.',  de: 'Keine Ausgaben erfasst.' },
  { key: 'admin.total_label',       bn: 'মোট',                     en: 'Total',                  de: 'Gesamt' },
  { key: 'admin.section_volunteers',bn: 'স্বেচ্ছাসেবী',             en: 'Volunteers',             de: 'Freiwillige' },
  { key: 'admin.vol_total',         bn: 'মোট',                     en: 'Total',                  de: 'Gesamt' },
  { key: 'admin.vol_approved',      bn: 'অনুমোদিত',                en: 'Approved',               de: 'Genehmigt' },
  { key: 'admin.vol_pending',       bn: 'অপেক্ষমাণ',               en: 'Pending',                de: 'Ausstehend' },
  { key: 'admin.vol_rejected',      bn: 'প্রত্যাখ্যাত',            en: 'Rejected',               de: 'Abgelehnt' },
  { key: 'admin.attendance',        bn: 'উপস্থিতি বিশ্লেষণ',        en: 'Attendance Analysis',    de: 'Anwesenheitsanalyse' },
  { key: 'admin.att_checked_in',    bn: 'চেক-ইন',                  en: 'Checked In',             de: 'Eingecheckt' },
  { key: 'admin.att_no_show',       bn: 'অনুপস্থিত',               en: 'No Show',                de: 'Nicht erschienen' },
  { key: 'admin.att_rate',          bn: 'উপস্থিতির হার',            en: 'Attendance Rate',        de: 'Anwesenheitsrate' },
  { key: 'admin.att_total_scans',   bn: 'মোট স্ক্যান',              en: 'Total Scans',            de: 'Gesamtscans' },
  { key: 'admin.att_chart_hint',    bn: 'ঘণ্টা অনুযায়ী চেক-ইন বিতরণ', en: 'Check-in distribution by hour', de: 'Check-in-Verteilung nach Stunde' },
  { key: 'admin.poll_results',      bn: 'ভোটের ফলাফল',              en: 'Poll Results',           de: 'Abstimmungsergebnisse' },
  { key: 'admin.total_votes',       bn: 'মোট ভোট:',                en: 'Total votes:',           de: 'Gesamtstimmen:' },
  { key: 'admin.poll_status_active',bn: 'সক্রিয়',                  en: 'Active',                 de: 'Aktiv' },
  { key: 'admin.poll_status_closed',bn: 'বন্ধ',                   en: 'Closed',                 de: 'Geschlossen' },
  { key: 'admin.tbl_reg_date',      bn: 'নিবন্ধনের তারিখ',          en: 'Registration Date',      de: 'Anmeldedatum' },

  // ── scan logs ─────────────────────────────────────────────────────────────
  { key: 'admin.pg_scan_log',       bn: 'স্ক্যান লগ',               en: 'Scan Log',               de: 'Scan-Protokoll' },
  { key: 'admin.empty_scan_log',    bn: 'এখনো কোনো স্ক্যান হয়নি।', en: 'No scans yet.',          de: 'Noch keine Scans.' },
  { key: 'admin.scan_valid',        bn: 'বৈধ',                     en: 'Valid',                  de: 'Gültig' },
  { key: 'admin.scan_invalid',      bn: 'অবৈধ',                    en: 'Invalid',                de: 'Ungültig' },
  { key: 'admin.scan_total',        bn: 'মোট:',                    en: 'Total:',                 de: 'Gesamt:' },

  // ── feedback ──────────────────────────────────────────────────────────────
  { key: 'admin.pg_feedback',       bn: 'ফিডব্যাক',                 en: 'Feedback',               de: 'Rückmeldung' },
  { key: 'admin.add_question',      bn: 'নতুন প্রশ্ন যোগ করুন',     en: 'Add New Question',       de: 'Neue Frage hinzufügen' },
  { key: 'admin.lbl_question',      bn: 'প্রশ্ন *',                 en: 'Question *',             de: 'Frage *' },
  { key: 'admin.question_ph',       bn: 'প্রশ্নটি লিখুন',           en: 'Write the question',     de: 'Frage schreiben' },
  { key: 'admin.lbl_type',          bn: 'ধরন',                     en: 'Type',                   de: 'Typ' },
  { key: 'admin.type_rating',       bn: 'রেটিং (১-৫)',              en: 'Rating (1–5)',           de: 'Bewertung (1–5)' },
  { key: 'admin.type_text',         bn: 'মন্তব্য (টেক্সট)',          en: 'Comment (Text)',         de: 'Kommentar (Text)' },
  { key: 'admin.empty_questions',   bn: 'এখনো কোনো প্রশ্ন নেই।',   en: 'No questions yet.',      de: 'Noch keine Fragen.' },
  { key: 'admin.fb_respondents',    bn: 'জন উত্তর দিয়েছেন · ধরন:', en: 'respondents · Type:',    de: 'Befragte · Typ:' },
  { key: 'admin.fb_type_rating',    bn: 'রেটিং',                   en: 'Rating',                 de: 'Bewertung' },
  { key: 'admin.fb_type_text',      bn: 'মন্তব্য',                  en: 'Comment',                de: 'Kommentar' },
  { key: 'admin.fb_no_answers',     bn: 'এখনো কোনো উত্তর নেই।',    en: 'No answers yet.',        de: 'Noch keine Antworten.' },
  { key: 'admin.fb_more',           bn: '...আরও',                  en: '...and',                 de: '...und' },
  { key: 'admin.fb_more_suffix',    bn: 'টি',                      en: 'more',                   de: 'weitere' },

  // ── competitions ──────────────────────────────────────────────────────────
  { key: 'admin.pg_competitions',   bn: 'প্রতিযোগিতা',              en: 'Competitions',           de: 'Wettbewerbe' },
  { key: 'admin.add_competition',   bn: 'নতুন প্রতিযোগিতা যোগ করুন', en: 'Add New Competition',   de: 'Neuen Wettbewerb hinzufügen' },
  { key: 'admin.lbl_comp_name',     bn: 'প্রতিযোগিতার নাম *',       en: 'Competition Name *',     de: 'Wettbewerbsname *' },
  { key: 'admin.lbl_winner_name',   bn: 'বিজয়ীর নাম',              en: 'Winner Name',            de: 'Name des Gewinners' },
  { key: 'admin.winner_ph',         bn: 'ঘোষণার আগে খালি রাখুন',   en: 'Leave blank before announcement', de: 'Vor der Bekanntgabe leer lassen' },
  { key: 'admin.lbl_notes',         bn: 'মন্তব্য',                  en: 'Notes',                  de: 'Anmerkungen' },
  { key: 'admin.notes_ph',          bn: 'অতিরিক্ত তথ্য (ঐচ্ছিক)',  en: 'Additional info (optional)', de: 'Zusätzliche Infos (optional)' },
  { key: 'admin.empty_competitions',bn: 'এখনো কোনো প্রতিযোগিতা নেই।', en: 'No competitions yet.', de: 'Noch keine Wettbewerbe.' },
  { key: 'admin.edit_competition',  bn: 'প্রতিযোগিতা সম্পাদনা',     en: 'Edit Competition',       de: 'Wettbewerb bearbeiten' },
  { key: 'admin.btn_save',          bn: 'সংরক্ষণ',                  en: 'Save',                   de: 'Speichern' },

  // ── translations page ─────────────────────────────────────────────────────
  { key: 'admin.pg_translations',   bn: 'অনুবাদ পরিচালনা',           en: 'Translation Management', de: 'Übersetzungsverwaltung' },
  { key: 'admin.translations_hint', bn: 'সব পাবলিক স্ট্রিং এখানে তিনটি ভাষায় সম্পাদনা করুন:', en: 'Edit all public strings here in three languages:', de: 'Hier alle öffentlichen Texte in drei Sprachen bearbeiten:' },
  { key: 'admin.lbl_key',           bn: 'কী (Key)',                  en: 'Key',                    de: 'Schlüssel' },
  { key: 'admin.lbl_bn_value',      bn: 'বাংলা মান',                en: 'Bengali value',          de: 'Bengalischer Wert' },
  { key: 'admin.search_ph',         bn: 'কী বা মান খুঁজুন...',       en: 'Search key or value...', de: 'Schlüssel oder Wert suchen...' },
  { key: 'admin.set_value_ph',      bn: '(সেট করুন)',               en: '(set)',                  de: '(festlegen)' },
  { key: 'admin.opt_value_ph',      bn: '(ঐচ্ছিক)',                 en: '(optional)',             de: '(optional)' },

  // ── audit log ─────────────────────────────────────────────────────────────
  { key: 'admin.pg_audit_log',      bn: 'অডিট লগ',                  en: 'Audit Log',              de: 'Audit-Protokoll' },
  { key: 'admin.empty_audit_log',   bn: 'কোনো লগ নেই।',             en: 'No log entries.',        de: 'Keine Protokolleinträge.' },

  // ── import ────────────────────────────────────────────────────────────────
  { key: 'admin.pg_import',         bn: 'ঐতিহাসিক ডেটা আমদানি',     en: 'Import Historical Data', de: 'Historische Daten importieren' },
  { key: 'admin.import_hint',       bn: 'ঐতিহাসিক নিবন্ধন ও খরচ আমদানি করতে Excel (.xlsx) ফাইল আপলোড করুন। ফাইলে এক বা দুটি শিট থাকবে:', en: 'Upload an Excel (.xlsx) file to import historical registrations and expenses. The file should contain one or both of these sheets:', de: 'Laden Sie eine Excel-Datei (.xlsx) hoch, um historische Anmeldungen und Ausgaben zu importieren. Die Datei sollte eines oder beide dieser Blätter enthalten:' },
  { key: 'admin.import_sheet_regs', bn: 'শিট: নিবন্ধন',              en: 'Sheet: Registrations',   de: 'Blatt: Anmeldungen' },
  { key: 'admin.import_sheet_exp',  bn: 'শিট: খরচ',                 en: 'Sheet: Expenses',        de: 'Blatt: Ausgaben' },
  { key: 'admin.lbl_excel_file',    bn: 'Excel ফাইল (.xlsx) *',     en: 'Excel File (.xlsx) *',   de: 'Excel-Datei (.xlsx) *' },
  { key: 'admin.btn_import',        bn: 'ডেটা আমদানি করুন',         en: 'Import Data',            de: 'Daten importieren' },
  { key: 'admin.import_col_type',   bn: 'ধরন',                     en: 'Type',                   de: 'Typ' },
  { key: 'admin.import_col_req',    bn: 'প্রয়োজনীয়',               en: 'Required',               de: 'Erforderlich' },
  { key: 'admin.import_col_notes',  bn: 'বিবরণ',                   en: 'Notes',                  de: 'Beschreibung' },

  // ── login page ────────────────────────────────────────────────────────────
  { key: 'admin.login_title',       bn: 'উদযাপন অ্যাডমিন',          en: 'Udjapon Admin',          de: 'Udjapon Admin' },
  { key: 'admin.lbl_login_email',   bn: 'ইমেইল',                   en: 'Email',                  de: 'E-Mail' },
  { key: 'admin.lbl_login_password',bn: 'পাসওয়ার্ড',               en: 'Password',               de: 'Passwort' },

  // ── emails page ───────────────────────────────────────────────────────────
  { key: 'admin.pg_send_email',     bn: 'ইমেইল পাঠান',              en: 'Send Email',             de: 'E-Mail senden' },
  { key: 'admin.email_info',        bn: 'এই ইভেন্টের সকল নিবন্ধিত অংশগ্রহণকারীকে ইমেইল পাঠানো হবে।', en: 'This will send an email to all registered attendees of this event.', de: 'Dadurch wird eine E-Mail an alle registrierten Teilnehmer dieser Veranstaltung gesendet.' },
  { key: 'admin.smtp_warning',      bn: '⚠️ SMTP কনফিগার করা নেই — ইমেইল লগ হবে কিন্তু পাঠানো হবে না।', en: '⚠️ SMTP is not configured — emails will be logged but not actually sent.', de: '⚠️ SMTP ist nicht konfiguriert — E-Mails werden protokolliert, aber nicht tatsächlich gesendet.' },
  { key: 'admin.lbl_subject',       bn: 'বিষয় *',                  en: 'Subject *',              de: 'Betreff *' },
  { key: 'admin.lbl_body',          bn: 'বার্তা *',                 en: 'Message *',              de: 'Nachricht *' },
  { key: 'admin.btn_send_email',    bn: 'ইমেইল পাঠান',              en: 'Send Email',             de: 'E-Mail senden' },
  { key: 'admin.email_sent_log',   bn: 'পাঠানো ইমেইলের লগ',        en: 'Sent Email Log',         de: 'Gesendete E-Mail-Protokoll' },
  { key: 'admin.email_recipients', bn: 'প্রাপক',                   en: 'Recipients',             de: 'Empfänger' },
  { key: 'email.opens',            bn: 'খোলা হয়েছে',               en: 'Opens',                  de: 'Öffnungen' },

  // ── home live ─────────────────────────────────────────────────────────────
  { key: 'home.live_now',          bn: 'এখন লাইভ',                 en: 'Live Now',               de: 'Jetzt live' },
  { key: 'home.live_polls',        bn: 'লাইভ ভোট',                 en: 'Live Polls',             de: 'Live-Abstimmungen' },
  { key: 'home.live_volunteer',    bn: 'স্বেচ্ছাসেবী',              en: 'Volunteer',              de: 'Freiwillige' },

  // ── registration edit ──────────────────────────────────────────────────────
  { key: 'admin.pg_edit_reg',      bn: 'নিবন্ধন সম্পাদনা',         en: 'Edit Registration',      de: 'Anmeldung bearbeiten' },

  // ── soft cancel ───────────────────────────────────────────────────────────
  { key: 'btn.cancel_reg',         bn: 'বাতিল করুন',               en: 'Cancel',                 de: 'Stornieren' },
  { key: 'btn.reinstate',          bn: 'পুনর্বহাল',                 en: 'Reinstate',              de: 'Wiederherstellen' },
  { key: 'reg.cancelled',          bn: 'বাতিল',                    en: 'Cancelled',              de: 'Storniert' },

  // ── scan duplicate ────────────────────────────────────────────────────────
  { key: 'scan.duplicate',         bn: 'ডুপ্লিকেট',                en: 'Duplicates',             de: 'Duplikate' },

  // ── volunteer stall ───────────────────────────────────────────────────────
  { key: 'vol.assign_stall',       bn: 'স্টল নির্ধারণ',             en: 'Assign Stall',           de: 'Stand zuweisen' },
  { key: 'vol.no_stall',           bn: '— স্টল নেই —',              en: '— No Stall —',           de: '— Kein Stand —' },

  // ── person counts & special needs ────────────────────────────────────────
  { key: 'admin.lbl_link_url',     bn: 'লিংক URL',                  en: 'Link URL',               de: 'Link-URL' },
  { key: 'admin.lbl_link_text',    bn: 'লিংক টেক্সট',               en: 'Link text',              de: 'Linktext' },
  { key: 'admin.lbl_link_text_ph', bn: 'আরও পড়ুন...',              en: 'Read more...',           de: 'Mehr lesen...' },

  { key: 'reg.adults',             bn: 'প্রাপ্তবয়স্ক (১৫+)',         en: 'Adults (15+)',           de: 'Erwachsene (15+)' },
  { key: 'reg.children',          bn: 'শিশু (<১৫)',                  en: 'Children (<15)',         de: 'Kinder (<15)' },
  { key: 'reg.special_needs',     bn: 'বিশেষ চাহিদাপন্ন',            en: 'Special needs',          de: 'Sonderbedarf' },
  { key: 'reg.total_adults',      bn: 'মোট প্রাপ্তবয়স্ক',            en: 'Total adults',           de: 'Erwachsene gesamt' },
  { key: 'reg.total_children',    bn: 'মোট শিশু',                   en: 'Total children',         de: 'Kinder gesamt' },
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
