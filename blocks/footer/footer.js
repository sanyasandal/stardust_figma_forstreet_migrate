/**
 * footer — oneAZ M27 Footer (template-slotted chrome over the authored /footer document).
 *
 * Authoring shape (content/footer.html, one section per band, classified by content):
 *   brand    — a heading (school name) + acknowledgement paragraph(s), no list
 *   columns  — an optional heading (column title) + a <ul> of links / contact lines
 *   social   — a heading ("Follow us") + a <ul> of social-network links; a linked
 *              <img> (the NSW Government logo) anywhere goes to the top of the brand column
 * White footer, top hairline, 1180 container: brand column (300) + link columns, then the
 * social row in caption type. Every authored element MOVES into a generated wrapper (EW1);
 * social links get a decorative inline SVG icon, their text stays in the anchor.
 */
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const ICONS = {
  facebook: '<path fill-rule="evenodd" d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-5v-7h2.5l.5-3h-3V9.5c0-.9.4-1.5 1.6-1.5H18V5.3A20 20 0 0 0 15.6 5C13.2 5 12 6.4 12 8.8V12H9.5v3H12v7H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>',
  instagram: '<path fill-rule="evenodd" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm5.3-4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/>',
};
const SOCIAL = /facebook|instagram|twitter|x\.com|youtube|linkedin|tiktok/i;

/** Wraps an AUTHORED element in a generated wrapper (the element moves, EW1). */
function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

const isHeading = (el) => /^H[1-6]$/.test(el.tagName);
const isMedia = (el) => el.matches('picture, img') || !!el.querySelector('picture, img');

/**
 * Adds a decorative icon to each recognised social link (the link text stays as the name).
 * @param {Element} list the social <ul>
 */
function decorateSocial(list) {
  list.querySelectorAll('a[href]').forEach((a) => {
    const key = Object.keys(ICONS).find((k) => a.href.toLowerCase().includes(k));
    if (!key) return;
    a.classList.add('social-icon');
    a.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">${ICONS[key]}</svg>`);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  if (!fragment) return;
  fragment.querySelectorAll('.metadata-wrapper').forEach((m) => m.remove());

  const root = document.createElement('div');
  root.className = 'footer-root';
  const main = document.createElement('div');
  main.className = 'footer-main';
  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  const social = document.createElement('div');
  social.className = 'footer-social';
  const logos = [];

  fragment.querySelectorAll(':scope > .section').forEach((section) => {
    const host = section.querySelector('.default-content-wrapper') || section;
    const els = [...host.children];
    const media = els.filter(isMedia);
    logos.push(...media);
    const rest = els.filter((el) => !media.includes(el));
    if (!rest.length) return;
    const list = rest.find((el) => el.matches('ul, ol'));

    if (list && SOCIAL.test([...list.querySelectorAll('a[href]')].map((a) => a.href).join(' '))) {
      rest.forEach((el) => {
        if (isHeading(el)) social.append(wrapNode(el, 'footer-social-label'));
        else if (el === list) {
          decorateSocial(list);
          social.append(wrapNode(list, 'footer-social-links'));
        } else social.append(el);
      });
    } else if (!list && rest.some(isHeading)) {
      rest.forEach((el) => brand.append(wrapNode(el, isHeading(el) ? 'footer-name' : 'footer-prose')));
    } else {
      const col = document.createElement('div');
      col.className = 'footer-col';
      rest.forEach((el) => col.append(isHeading(el) ? wrapNode(el, 'footer-col-title') : el));
      main.append(col);
    }
  });

  if (logos.length) {
    const logo = document.createElement('div');
    logo.className = 'footer-logo';
    logo.append(...logos);
    brand.prepend(logo);
  }
  if (brand.children.length) main.prepend(brand);
  root.append(main);
  if (social.children.length) root.append(social);
  block.append(root);
}
