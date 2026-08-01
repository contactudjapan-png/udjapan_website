-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL DEFAULT 'general',
  question_bn TEXT NOT NULL DEFAULT '',
  answer_bn   TEXT NOT NULL DEFAULT '',
  question_en TEXT,
  answer_en   TEXT,
  question_de TEXT,
  answer_de   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: General
INSERT INTO faqs (category, sort_order, question_bn, answer_bn, question_en, answer_en, question_de, answer_de) VALUES
('general', 10,
 'উদযাপন কি?',
 'উদযাপন হলো জার্মানির বাংলাদেশি সম্প্রদায়ের জন্য একটি বার্ষিক সাংস্কৃতিক অনুষ্ঠান।',
 'What is Udjapan?',
 'Udjapan is an annual cultural event for the Bangladeshi community in Germany.',
 'Was ist Udjapan?',
 'Udjapan ist eine jährliche Kulturveranstaltung für die bangladeschische Gemeinschaft in Deutschland.'
),
('general', 20,
 'কোথায় যোগাযোগ করতে পারি?',
 'আমাদের ফেসবুক পেজ বা হোয়াটসঅ্যাপ গ্রুপে যোগাযোগ করুন।',
 'Who can I contact for help?',
 'Please reach out via our Facebook page or WhatsApp group.',
 'Wie kann ich Kontakt aufnehmen?',
 'Bitte kontaktieren Sie uns über unsere Facebook-Seite oder WhatsApp-Gruppe.'
);

-- Seed: Event
INSERT INTO faqs (category, sort_order, question_bn, answer_bn, question_en, answer_en, question_de, answer_de) VALUES
('event', 10,
 'ইভেন্ট কখন এবং কোথায় হবে?',
 'ইভেন্টের তারিখ ও স্থান হোম পেজে এবং ইভেন্ট পেজে উল্লেখ আছে।',
 'When and where is the event?',
 'The date and location are shown on the home page and event page.',
 'Wann und wo findet die Veranstaltung statt?',
 'Datum und Ort sind auf der Startseite und der Veranstaltungsseite angegeben.'
),
('event', 20,
 'শিশুদের জন্য কি আলাদা নিয়ম আছে?',
 '১৫ বছরের কম বয়সী শিশুরা কম মূল্যে বা বিশেষ নিয়মে প্রবেশ করতে পারতে পারে। নিবন্ধন ফর্মে শিশুর সংখ্যা উল্লেখ করুন।',
 'Are there special rules for children?',
 'Children under 15 may have a reduced price or special conditions. Please specify the number of children in the registration form.',
 'Gibt es besondere Regeln für Kinder?',
 'Kinder unter 15 Jahren können zu einem reduzierten Preis eintreten. Bitte geben Sie die Anzahl der Kinder im Formular an.'
);

-- Seed: Registration
INSERT INTO faqs (category, sort_order, question_bn, answer_bn, question_en, answer_en, question_de, answer_de) VALUES
('registration', 10,
 'নিবন্ধন করতে কী কী তথ্য লাগবে?',
 'আপনার নাম, ইমেইল বা ফোন নম্বর, অংশগ্রহণকারীর সংখ্যা এবং পেমেন্টের রেফারেন্স নম্বর।',
 'What information do I need to register?',
 'Your name, email or phone number, number of participants, and payment reference.',
 'Welche Informationen benötige ich zur Registrierung?',
 'Ihren Namen, E-Mail oder Telefonnummer, Anzahl der Teilnehmer und die Zahlungsreferenz.'
),
('registration', 20,
 'নিবন্ধন জমা দেওয়ার পরে কী হবে?',
 'আপনার তথ্য অ্যাডমিন যাচাই করবেন। পেমেন্ট নিশ্চিত হলে আপনার ইমেইলে একটি QR কোড পাঠানো হবে।',
 'What happens after I submit my registration?',
 'An admin will verify your details. Once your payment is confirmed, a QR code will be sent to your email.',
 'Was passiert nach der Registrierung?',
 'Ein Administrator prüft Ihre Angaben. Nach Zahlungsbestätigung erhalten Sie einen QR-Code per E-Mail.'
),
('registration', 30,
 'আমি কি একাধিক মানুষের জন্য নিবন্ধন করতে পারি?',
 'হ্যাঁ। নিবন্ধন ফর্মে প্রাপ্তবয়স্ক এবং শিশুর সংখ্যা আলাদাভাবে উল্লেখ করুন।',
 'Can I register for multiple people?',
 'Yes. Simply specify the number of adults and children separately in the registration form.',
 'Kann ich mich für mehrere Personen anmelden?',
 'Ja. Geben Sie im Formular die Anzahl der Erwachsenen und Kinder separat an.'
),
('registration', 40,
 'নিবন্ধন বাতিল করা কি সম্ভব?',
 'নিবন্ধন বাতিলের জন্য আমাদের সাথে যোগাযোগ করুন। রিফান্ড নীতি ইভেন্টের উপর নির্ভর করে।',
 'Can I cancel my registration?',
 'Please contact us to cancel your registration. Refund policies depend on the specific event.',
 'Kann ich meine Registrierung stornieren?',
 'Bitte kontaktieren Sie uns zur Stornierung. Die Rückerstattungsrichtlinien hängen vom jeweiligen Event ab.'
);

-- Seed: Payment
INSERT INTO faqs (category, sort_order, question_bn, answer_bn, question_en, answer_en, question_de, answer_de) VALUES
('payment', 10,
 'পেমেন্ট কীভাবে করব?',
 'PayPal বা ব্যাংক ট্রান্সফারের মাধ্যমে পেমেন্ট করুন। ইভেন্ট পেজে QR কোড স্ক্যান করে PayPal-এ পেমেন্ট করা যাবে।',
 'How do I make the payment?',
 'You can pay via PayPal or bank transfer. Scan the QR code on the event page to pay via PayPal.',
 'Wie zahle ich?',
 'Sie können per PayPal oder Banküberweisung zahlen. Scannen Sie den QR-Code auf der Veranstaltungsseite für PayPal.'
),
('payment', 20,
 'পেমেন্ট রেফারেন্স নম্বর কী?',
 'PayPal ট্রানজেকশন আইডি বা আপনার PayPal অ্যাকাউন্টের নাম বা ব্যাংক ট্রান্সফারকারীর নাম।',
 'What is the payment reference?',
 'The PayPal transaction ID, your PayPal account name, or the name used for the bank transfer.',
 'Was ist die Zahlungsreferenz?',
 'Die PayPal-Transaktions-ID, Ihr PayPal-Kontoname oder der Name der Banküberweisung.'
),
('payment', 30,
 'পেমেন্টের কত দিন পরে নিবন্ধন নিশ্চিত হবে?',
 'সাধারণত ১–৩ কার্যদিবসের মধ্যে আপনার ইমেইলে QR কোড পাঠানো হবে।',
 'How long until my registration is confirmed after payment?',
 'Usually within 1–3 business days you will receive your QR code by email.',
 'Wie lange dauert die Bestätigung nach der Zahlung?',
 'In der Regel erhalten Sie Ihren QR-Code innerhalb von 1–3 Werktagen per E-Mail.'
);

-- Seed: Entry / QR
INSERT INTO faqs (category, sort_order, question_bn, answer_bn, question_en, answer_en, question_de, answer_de) VALUES
('entry', 10,
 'QR কোড কোথায় দেখাতে হবে?',
 'ইভেন্টের প্রবেশদ্বারে স্বেচ্ছাসেবীদের কাছে আপনার ফোনে বা প্রিন্ট করা QR কোড দেখান।',
 'Where do I show the QR code?',
 'Show your QR code (on your phone or printed) to the volunteers at the event entrance.',
 'Wo zeige ich den QR-Code?',
 'Zeigen Sie Ihren QR-Code (auf dem Handy oder ausgedruckt) den Freiwilligen am Eingang.'
),
('entry', 20,
 'QR কোড কাজ না করলে কী করব?',
 'QR কোডের নিচে থাকা ৮ অক্ষরের কোডটি প্রবেশদ্বারে দেখান। স্বেচ্ছাসেবীরা ম্যানুয়ালি যাচাই করবেন।',
 'What if my QR code does not scan?',
 'Show the 8-character code displayed below your QR code. Volunteers can verify it manually.',
 'Was tue ich, wenn der QR-Code nicht scannt?',
 'Zeigen Sie den 8-stelligen Code unter Ihrem QR-Code. Die Freiwilligen können ihn manuell prüfen.'
),
('entry', 30,
 'QR কোড ইমেইল না পেলে কী করব?',
 'প্রথমে স্প্যাম/জাঙ্ক ফোল্ডার চেক করুন। সমস্যা থাকলে আমাদের সাথে যোগাযোগ করুন।',
 'What if I did not receive the QR code email?',
 'First check your spam or junk folder. If it is still missing, please contact us.',
 'Was ist, wenn ich keine QR-Code-E-Mail erhalten habe?',
 'Prüfen Sie zunächst Ihren Spam-Ordner. Wenn die E-Mail fehlt, kontaktieren Sie uns bitte.'
);
