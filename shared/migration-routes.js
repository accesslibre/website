import {ROUTE_SLUGS} from './routes.js';
import {PUBLIC_LOCALES, NLLB_LOCALES} from './migration-locales.js';

export const CANONICAL_ORIGIN = 'https://libreaccessibility.org';
const pages = {
  projects: '/projects.html', propose: '/request.html', join: '/jobs.html',
  governance: '/about.html#how-we-work', accessibility: '/accessibility.html',
  transparency: '/transparency.html', sitemap: '/sitemap.html', languages: '/about.html#language',
  about: '/about.html', volunteer: '/jobs.html', jobs: '/jobs.html',
  request: '/request.html', donate: '/donate.html', news: '/news.html',
  blog: '/news.html', press: '/news.html', accessibilitat: '/accessibility.html'
};
const slugs = new Map(Object.keys(pages).map(key => [key,key]));
for (const locale of Object.values(ROUTE_SLUGS)) {
  for (const [key,slug] of Object.entries(locale)) slugs.set(slug,key);
}
const projects = {
  'iatf-website': 'iatf-website',
  'archived-iatf-selfie': 'archived-iatf-selfie', 'iatf-selfie': 'archived-iatf-selfie',
  'archived-iatf-bot': 'archived-iatf-bot', 'iatf-bot': 'archived-iatf-bot',
  'robodk-voiceaccess': 'voiceaccess', 'voiceaccess': 'voiceaccess',
  'tranandorra-web': 'tranandorra-web', 'tranandorra-video': 'tranandorra-video'
};

// Only recognized historical routes redirect. Unknown pages remain genuine 404s.
export function migrationTarget(pathname) {
  let parts;
  try {parts = decodeURIComponent(pathname).split('/').filter(Boolean);}
  catch {return null;}
  let localized = false;
  if (parts[0] === 'nllb' && NLLB_LOCALES.has(parts[1])) {
    parts.splice(0,2); localized = true;
  } else if (PUBLIC_LOCALES.has(parts[0])) {
    parts.shift(); localized = true;
  }
  if (parts.at(-1) === 'index.html') parts.pop();
  if (!parts.length) return pathname === '/' ? null : '/';
  if (parts.length === 1 && parts[0] === '404.html') return localized ? '/404.html' : null;
  const segment = parts[0].replace(/\.html$/, '');
  const key = slugs.get(segment);
  if (!key) return null;
  if (parts.length === 2 && key === 'projects' && projects[parts[1]]) {
    return '/projects.html#' + projects[parts[1]];
  }
  if (parts.length !== 1) return null;
  const target = pages[key];
  return target === pathname ? null : target;
}

export function canonicalRedirect(url, target) {
  const to = new URL(target || url.pathname, CANONICAL_ORIGIN);
  to.search = url.search;
  return Response.redirect(to.toString(),308);
}
