/**
 * header — oneAZ M28 Header (template-slotted chrome over the authored /nav document).
 *
 * Authoring shape (content/nav.html, stock 3-section nav contract):
 *   section 1 — brand: <p><a href="/"><img logo></a></p>, <p>school name</p>, <p>motto</p>
 *   section 2 — sections: <ul><li><a>…</a></li>…</ul> (a nested <ul> makes a dropdown)
 *   section 3 — tools (may be empty)
 * One 60px row inside the 1180 container: brand left (logo + name + motto), menu links right,
 * hairline below. Below 900px a hamburger opens the menu as a panel under the row.
 * The stock toggleMenu / aria-expanded / Escape / focus-out machinery is kept.
 * Nav decode (#98): the pipeline wraps each item's trigger link in a <p> on live, so the
 * trigger lookup matches `:scope > a, :scope > p > a` and the <p> is unwrapped.
 */
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

/** Wraps an AUTHORED element in a generated wrapper (the element moves, EW1). */
function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean|string} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-drop > button').forEach((button) => {
    button.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  // the desktop nav is always expanded, so aria-expanded only applies to the mobile menu
  if (isDesktop.matches) nav.removeAttribute('aria-expanded');
  else nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  // eslint-disable-next-line no-use-before-define
  const listeners = [closeOnEscape, closeOnFocusLost];
  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', listeners[0]);
    nav.addEventListener('focusout', listeners[1]);
  } else {
    window.removeEventListener('keydown', listeners[0]);
    nav.removeEventListener('focusout', listeners[1]);
  }
}

/**
 * Closes the open nav dropdown (desktop) or the nav menu (mobile) on Escape
 * @param {KeyboardEvent} e keydown event
 */
function closeOnEscape(e) {
  if (e.code !== 'Escape') return;
  const nav = document.getElementById('nav');
  if (!nav) return;
  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections && navSections.querySelector('[aria-expanded="true"]');
  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections);
    navSectionExpanded.focus();
  } else if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
    toggleMenu(nav, navSections);
    nav.querySelector('.nav-hamburger button').focus();
  }
}

/**
 * Closes the open nav dropdown (desktop) or the nav menu (mobile) when focus leaves the nav
 * @param {FocusEvent} e focusout event
 */
function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;
  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections && navSections.querySelector('[aria-expanded="true"]');
  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections, false);
  } else if (!isDesktop.matches) {
    toggleMenu(nav, navSections, false);
  }
}

/**
 * Brand slot: logo + school name + motto, classified by content (not position).
 * @param {Element} navBrand the brand section
 */
function decorateBrand(navBrand) {
  const host = navBrand.querySelector('.default-content-wrapper') || navBrand;
  const els = [...host.children];
  const logo = els.find((el) => el.matches('picture, img') || el.querySelector('picture, img'));
  const texts = els.filter((el) => el !== logo && el.textContent.trim());
  const row = document.createElement('div');
  row.className = 'brand-row';
  if (logo) {
    const link = logo.querySelector('a');
    if (link) link.classList.remove('button');
    row.append(wrapNode(logo, 'brand-logo'));
  }
  if (texts.length) {
    const brandText = document.createElement('div');
    brandText.className = 'brand-text';
    brandText.append(wrapNode(texts[0], 'brand-name'));
    texts.slice(1).forEach((el) => brandText.append(wrapNode(el, 'brand-motto')));
    row.append(brandText);
  }
  host.prepend(row);
}

/**
 * Sections slot: normalise the delivered <li><p><a> shape (#98) and wire dropdowns.
 * @param {Element} navSections the sections section
 */
function decorateSections(navSections) {
  navSections.querySelectorAll('li').forEach((li) => {
    const p = li.querySelector(':scope > p');
    if (p && p.querySelector(':scope > a')) p.replaceWith(...p.childNodes);
  });
  navSections.querySelectorAll('a.button').forEach((a) => a.classList.remove('button'));
  navSections.querySelectorAll('.button-wrapper').forEach((p) => p.classList.remove('button-wrapper'));

  navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
    const subList = navSection.querySelector(':scope > ul');
    if (!subList) return;
    navSection.classList.add('nav-drop');
    // wrap the dropdown label in a button so it is announced as expandable
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-expanded', false);
    [...navSection.childNodes].forEach((node) => {
      if (node !== subList) button.append(node);
    });
    navSection.prepend(button);
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      if (isDesktop.matches) {
        button.focus();
        toggleAllNavSections(navSections);
      }
      button.setAttribute('aria-expanded', !expanded);
    });
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');
  if (fragment) {
    fragment.querySelectorAll('.metadata-wrapper').forEach((m) => m.remove());
    while (fragment.firstElementChild) nav.append(fragment.firstElementChild);
  }

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) decorateBrand(navBrand);

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) decorateSections(navSections);

  const navTools = nav.querySelector('.nav-tools');
  if (navTools && !navTools.textContent.trim() && !navTools.querySelector('img, picture, a')) {
    navTools.hidden = true;
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
