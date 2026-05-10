'use strict';

/**
 * Zentraler API-Client
 * Alle fetch()-Calls laufen hier durch.
 * Kein Modul ruft fetch() direkt auf.
 */
const api = (() => {
  const BASE = '';

  async function _request(method, path, body, isFormData = false) {
    const opts = { method, headers: {} };
    if (body && !isFormData) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    } else if (body && isFormData) {
      opts.body = body; // FormData – kein Content-Type setzen
    }
    const res = await fetch(`${BASE}${path}`, opts);
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'Unbekannter Fehler', res.status, data.details);
    return data;
  }

  const get    = (path)         => _request('GET',    path);
  const post   = (path, body)   => _request('POST',   path, body);
  const patch  = (path, body)   => _request('PATCH',  path, body);
  const put    = (path, body)   => _request('PUT',    path, body);
  const del    = (path)         => _request('DELETE', path);
  const upload = (path, form)   => _request('POST',   path, form, true);

  // Bewerbungen
  const bewerbungen = {
    list:   (params = {}) => get(`/api/bewerbungen?${new URLSearchParams(params)}`),
    get:    (id)          => get(`/api/bewerbungen/${id}`),
    create: (data)        => post('/api/bewerbungen', data),
    update: (id, data)    => patch(`/api/bewerbungen/${id}`, data),
    remove: (id)          => del(`/api/bewerbungen/${id}`),
    stats:  ()            => get('/api/bewerbungen/stats'),
    exportCsv: ()         => fetch('/api/bewerbungen/export/csv'),
    addKommentar:    (id, text) => post(`/api/bewerbungen/${id}/kommentare`, { text }),
    deleteKommentar: (id, kid) => del(`/api/bewerbungen/${id}/kommentare/${kid}`),
  };

  // KI
  const ki = {
    status:    ()       => get('/api/ki/status'),
    modelle:   ()       => get('/api/ki/modelle'),
    generieren: (data)  => post('/api/ki/anschreiben', data),
    verlauf:   (limit)  => get(`/api/ki/verlauf?limit=${limit || 20}`),
  };

  // Einstellungen
  const einstellungen = {
    get:    ()     => get('/api/einstellungen'),
    update: (data) => patch('/api/einstellungen', data),
  };

  // Suche
  const suche = {
    suchen: (params) => get(`/api/suche?${new URLSearchParams(params)}`),
  };

  // Profil
  const profil = {
    get:    ()     => get('/api/profil'),
    update: (data) => patch('/api/profil', data),
  };

  // Erfahrungen
  const erfahrungen = {
    get:    ()     => get('/api/erfahrungen'),
    update: (data) => put('/api/erfahrungen', data),
  };

  // Vault
  const vault = {
    list:     ()        => get('/api/vault'),
    upload:   (form)    => upload('/api/vault', form),
    download: (id)      => `/api/vault/${id}/download`,
    remove:   (id)      => del(`/api/vault/${id}`),
  };

  // Import
  const importApi = {
    vorschau:   (form) => upload('/api/import/vorschau', form),
    importieren:(form) => upload('/api/import/excel', form),
  };

  // Push
  const push = {
    vapidKey:    ()    => get('/api/push/vapid-public-key'),
    subscribe:   (sub) => post('/api/push/subscribe', sub),
    unsubscribe: (ep)  => del('/api/push/subscribe'),
  };

  return { get, post, patch, put, del, upload, bewerbungen, ki, einstellungen, suche, profil, erfahrungen, vault, import: importApi, push };
})();

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status  = status;
    this.details = details;
  }
}

window.api = api;
window.ApiError = ApiError;
