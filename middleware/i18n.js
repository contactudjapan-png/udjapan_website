const { loadAll, makeT, SUPPORTED_LOCALES } = require('../services/translationService');

function getCookieLang(req) {
  try {
    const raw = req.headers.cookie || '';
    const match = raw.match(/(?:^|;\s*)lang=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    return null;
  }
}

function setLangCookie(res, locale) {
  const maxAge = 365 * 24 * 60 * 60;
  res.setHeader('Set-Cookie', `lang=${locale}; Max-Age=${maxAge}; Path=/; SameSite=Lax`);
}

module.exports = async function i18n(req, res, next) {
  // Ensure t is always defined even if middleware fails
  res.locals.locale = 'bn';
  res.locals.t = (key) => key;
  try {
    const queryLang = req.query.lang;
    let locale = queryLang || getCookieLang(req) || 'bn';
    if (!SUPPORTED_LOCALES.includes(locale)) locale = 'bn';

    // If lang was in query param, persist to cookie and redirect without it
    if (queryLang && SUPPORTED_LOCALES.includes(queryLang)) {
      setLangCookie(res, locale);
      const url = new URL(req.url, 'http://x');
      url.searchParams.delete('lang');
      return res.redirect(url.pathname + (url.search || ''));
    }

    const all = await loadAll();
    res.locals.locale = locale;
    res.locals.t = makeT(all, locale);
  } catch (e) {
    res.locals.locale = 'bn';
    res.locals.t = (key) => key;
  }
  next();
};
