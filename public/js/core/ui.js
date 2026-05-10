'use strict';

/**
 * UI-Helfer
 * Toast-Notifications, Modals, Loader, Confirm-Dialog
 */
const ui = (() => {

  // ────────────────────────── TOAST ──────────────────────────
  let _toastContainer;

  function _getToastContainer() {
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
    return _toastContainer;
  }

  /**
   * Zeigt eine Toast-Notification.
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {number} duration ms
   */
  function toast(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    _getToastContainer().appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--visible'));
    setTimeout(() => {
      el.classList.remove('toast--visible');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
  }

  const success = (msg, dur)  => toast(msg, 'success', dur);
  const error   = (msg, dur)  => toast(msg, 'error',   dur || 5000);
  const info    = (msg, dur)  => toast(msg, 'info',    dur);
  const warning = (msg, dur)  => toast(msg, 'warning', dur);

  // ────────────────────────── LOADER ─────────────────────────
  const _loaders = new Map();

  /**
   * Zeigt einen Lade-Spinner in einem Element.
   * @param {HTMLElement|string} target - Element oder Selektor
   * @param {string} id - Eindeutige ID zum späteren Entfernen
   */
  function showLoader(target, id = 'default') {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const spinner = document.createElement('div');
    spinner.className = 'loader-spinner';
    spinner.innerHTML = '<span class="spinner"></span>';
    el.appendChild(spinner);
    _loaders.set(id, { el, spinner });
  }

  function hideLoader(id = 'default') {
    const entry = _loaders.get(id);
    if (entry) { entry.spinner.remove(); _loaders.delete(id); }
  }

  // ────────────────────────── MODAL ─────────────────────────
  let _activeModal = null;

  /**
   * Öffnet ein Modal per ID.
   * @param {string} modalId - ID des <dialog>-Elements
   * @param {object} [opts]
   * @param {string} [opts.title]
   * @param {string} [opts.content] - HTML-String
   */
  function openModal(modalId, opts = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (opts.title)   { const t = modal.querySelector('.modal__title');   if (t) t.textContent = opts.title; }
    if (opts.content) { const b = modal.querySelector('.modal__body');    if (b) b.innerHTML   = opts.content; }
    modal.showModal?.() || modal.classList.add('modal--open');
    _activeModal = modal;
  }

  function closeModal(modalId) {
    const modal = modalId ? document.getElementById(modalId) : _activeModal;
    if (!modal) return;
    modal.close?.() || modal.classList.remove('modal--open');
    if (_activeModal === modal) _activeModal = null;
  }

  // Escape-Key schließt aktives Modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _activeModal) closeModal();
  });

  // ────────────────────────── CONFIRM ────────────────────────
  /**
   * Zeigt einen Confirm-Dialog und gibt ein Promise zurück.
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  function confirm(message) {
    return new Promise(resolve => {
      const dlg = document.createElement('dialog');
      dlg.className = 'confirm-dialog';
      dlg.innerHTML = `
        <p class="confirm-dialog__message">${message}</p>
        <div class="confirm-dialog__actions">
          <button class="btn btn--secondary" data-action="cancel">Abbrechen</button>
          <button class="btn btn--danger"    data-action="ok">Löschen</button>
        </div>`;
      document.body.appendChild(dlg);
      dlg.showModal();
      dlg.addEventListener('click', e => {
        const action = e.target.dataset.action;
        if (!action) return;
        dlg.close();
        dlg.remove();
        resolve(action === 'ok');
      });
    });
  }

  // ────────────────────────── HELPERS ───────────────────────
  /** Formatiert ein Datum-String schön */
  function formatDate(str) {
    if (!str) return '–';
    return new Date(str).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** Escaped HTML für sicheres Einfügen */
  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Debounce-Helfer */
  function debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  return { toast, success, error, info, warning, showLoader, hideLoader, openModal, closeModal, confirm, formatDate, escHtml, debounce };
})();

window.ui = ui;
