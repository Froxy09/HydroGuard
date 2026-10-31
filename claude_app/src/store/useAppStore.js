import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, describeError, normalizeBaseUrl, DEFAULT_BASE_URL } from '../api/client';
import { showToast } from '../utils/format';

const BASE_URL_KEY = 'agroguard.baseUrl';

export const useAppStore = create((set, get) => {
  // Tüm yazma işlemleri aynı akışı izler: isteği at, ardından canlı veriyi tazele.
  const mutate = async (request, successMessage) => {
    set({ busy: true });
    try {
      const result = await request(get().baseUrl);
      await get().fetchData({ silent: true });
      if (successMessage) {
        showToast(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      }
      return result;
    } catch (error) {
      showToast(describeError(error));
      throw error;
    } finally {
      set({ busy: false });
    }
  };

  return {
    baseUrl: DEFAULT_BASE_URL,
    hydrated: false,
    data: null,
    loading: false,
    refreshing: false,
    busy: false,
    error: null,
    connected: false,
    lastUpdated: null,
    settingsVisible: false,
    // Hal fiyatları dönem bazında saklanır; şehir veya simülasyon günü değişince anahtar değişir ve yeniden çekilir
    market: {},

    fetchMarket: async (period, { force = false } = {}) => {
      const { data, market, baseUrl } = get();
      const key = `${data?.city}|${data?.date_only}`;
      const current = market[period];
      if (!force && current && current.key === key && (current.payload || current.loading)) return;
      set({ market: { ...get().market, [period]: { ...current, key, loading: true, error: null } } });
      try {
        const payload = await api.getMarketPrices(baseUrl, period);
        set({ market: { ...get().market, [period]: { key, loading: false, error: null, payload } } });
      } catch (error) {
        set({ market: { ...get().market, [period]: { ...get().market[period], key, loading: false, error: describeError(error) } } });
      }
    },

    init: async () => {
      try {
        const stored = await AsyncStorage.getItem(BASE_URL_KEY);
        if (stored) set({ baseUrl: normalizeBaseUrl(stored) });
      } catch {
        // Depolama okunamazsa varsayılan adresle devam edilir
      }
      set({ hydrated: true });
      await get().fetchData();
    },

    setBaseUrl: async (url) => {
      const baseUrl = normalizeBaseUrl(url);
      set({ baseUrl, data: null, error: null, market: {} });
      try {
        await AsyncStorage.setItem(BASE_URL_KEY, baseUrl);
      } catch {
        // Kalıcı kayıt başarısız olsa da oturum boyunca yeni adres kullanılır
      }
      await get().fetchData();
    },

    testConnection: async (url) => {
      const data = await api.getLiveData(normalizeBaseUrl(url));
      return data;
    },

    openSettings: () => set({ settingsVisible: true }),
    closeSettings: () => set({ settingsVisible: false }),

    fetchData: async ({ silent = false, pull = false } = {}) => {
      if (pull) set({ refreshing: true });
      else if (!silent) set({ loading: true });
      try {
        const data = await api.getLiveData(get().baseUrl);
        set({ data, error: null, connected: true, lastUpdated: new Date() });
      } catch (error) {
        set({ error: describeError(error), connected: false });
      } finally {
        set({ loading: false, refreshing: false });
      }
    },

    setSimState: (payload) => mutate((b) => api.setState(b, payload), 'Simülasyon güncellendi'),

    setPump: (mode) => {
      const labels = { auto: 'Otonom moda alındı', on: 'Pompa manuel AÇILDI', off: 'Pompa manuel KAPATILDI' };
      return mutate((b) => api.setPump(b, mode), `Sondaj pompası: ${labels[mode]}`);
    },

    addEvent: (date, event) => mutate((b) => api.addEvent(b, date, event), `"${event}" ajandaya eklendi`),

    removeEvent: (date, event) => mutate((b) => api.removeEvent(b, date, event), `"${event}" silindi`),

    addAccounting: (record) =>
      mutate((b) => api.addAccounting(b, record), record.type === 'gelir' ? 'Gelir kaydedildi' : 'Gider kaydedildi'),

    removeAccounting: (id) => mutate((b) => api.removeAccounting(b, id), 'Kayıt silindi'),

    logElectricity: () =>
      mutate(
        (b) => api.logElectricity(b),
        (res) => `Elektrik gideri muhasebeye işlendi: ${String(res?.cost ?? '').replace('.', ',')} ₺`
      ),
  };
});
