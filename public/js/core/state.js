'use strict';

/**
 * Zentrales App-State-Objekt
 * Einfaches reaktives State-Management ohne Framework.
 * Listener werden bei Änderungen benachrichtigt.
 */
const state = (() => {
  const _state = {
    bewerbungen:   [],
    stats:         {},
    profil:        {},
    erfahrungen:   { skills: [], stationen: [], zertifikate: [] },
    einstellungen: {},
    vault:         [],
    suche:         { ergebnisse: [], loading: false, query: '' },
    ki:            { loading: false, status: null },
    activeTab:     'dashboard',
  };

  const _listeners = new Map();

  function get(key) {
    return _state[key];
  }

  function set(key, value) {
    _state[key] = value;
    (_listeners.get(key) || []).forEach(fn => fn(value));
    (_listeners.get('*')  || []).forEach(fn => fn({ key, value }));
  }

  function update(key, partial) {
    set(key, { ..._state[key], ...partial });
  }

  function on(key, fn) {
    if (!_listeners.has(key)) _listeners.set(key, []);
    _listeners.get(key).push(fn);
  }

  function off(key, fn) {
    const fns = _listeners.get(key) || [];
    _listeners.set(key, fns.filter(f => f !== fn));
  }

  return { get, set, update, on, off };
})();

window.state = state;
