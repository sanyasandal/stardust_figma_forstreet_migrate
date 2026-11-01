/**
 * Site features from the oneAZ vocabulary (not authored blocks):
 *   M2  Back to top — a band between main and the footer with the kit's accent link; it sits
 *       outside <main>, so a page's authored content is unchanged.
 *   M11 Modal       — a link to a /modals/… document opens that document (loaded as a fragment)
 *       in a dialog: the kit's white panel, hairline border, radius 12, a close button.
 */
import { loadFragment } from '../blocks/fragment/fragment.js';

function backToTop(doc) {
  const main = doc.querySelector('main');
  if (!main || doc.querySelector('.back-to-top')) return;
  const band = doc.createElement('div');
  band.className = 'back-to-top';
  const link = doc.createElement('a');
  link.href = '#';
  link.textContent = 'Back to top';
  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    (doc.querySelector('header a, main h1') || doc.body).focus?.();
  });
  band.append(link);
  main.after(band);
}

async function openModal(path) {
  const fragment = await loadFragment(path);
  if (!fragment) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'modal';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'modal-close';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => dialog.close());
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.append(...fragment.childNodes);
  dialog.append(close, body);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  document.body.append(dialog);
  dialog.showModal();
}

function modals(doc) {
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    let url;
    try { url = new URL(a.href, window.location.href); } catch { return; }
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/modals/')) return;
    e.preventDefault();
    openModal(url.pathname);
  });
}

export default function features(doc) {
  backToTop(doc);
  modals(doc);
}
