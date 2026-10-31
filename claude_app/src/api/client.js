import axios from 'axios';

// Bilgisayarın Wi-Fi IP adresi. Uygulama içinden (⚙ Sunucu Ayarları) değiştirilebilir.
export const DEFAULT_BASE_URL = 'http://172.18.62.48:5000';

export const normalizeBaseUrl = (url) => {
  let out = String(url || '').trim();
  if (!out) return DEFAULT_BASE_URL;
  if (!/^https?:\/\//i.test(out)) out = `http://${out}`;
  return out.replace(/\/+$/, '');
};

const createClient = (baseURL) =>
  axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

export const describeError = (error) => {
  if (error?.response) {
    return error.response.data?.message || `Sunucu hatası (${error.response.status})`;
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Sunucu zaman aşımına uğradı';
  }
  return 'Sunucuya ulaşılamadı. IP adresini ve aynı ağda olduğunuzu kontrol edin.';
};

export const api = {
  getLiveData: (baseURL) => createClient(baseURL).get('/api/live-data').then((r) => r.data),
  setState: (baseURL, payload) => createClient(baseURL).post('/api/set-state', payload).then((r) => r.data),
  setPump: (baseURL, mode) => createClient(baseURL).post('/api/set-pump', { mode }).then((r) => r.data),
  addEvent: (baseURL, date, event) =>
    createClient(baseURL).post('/api/add-event', { date, event }).then((r) => r.data),
  removeEvent: (baseURL, date, event) =>
    createClient(baseURL).post('/api/remove-event', { date, event }).then((r) => r.data),
  addAccounting: (baseURL, record) => createClient(baseURL).post('/api/add-acc', record).then((r) => r.data),
  removeAccounting: (baseURL, id) => createClient(baseURL).post('/api/remove-acc', { id }).then((r) => r.data),
  logElectricity: (baseURL) => createClient(baseURL).post('/api/log-electricity', {}).then((r) => r.data),
  // Aylık/yıllık özet ilk istekte sunucunun onlarca bülten indirmesini gerektirir; süre uzun tutulur
  getMarketPrices: (baseURL, period) =>
    createClient(baseURL).get('/api/market-prices', { params: { period }, timeout: 90000 }).then((r) => r.data),
};
