import React, { useEffect, useRef } from 'react';
import { AppState, UIManager, Platform } from 'react-native';
import { Stack, ThemeProvider, DarkTheme, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import SettingsModal from '../components/SettingsModal';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import { showToast } from '../utils/format';
import { configureNotificationHandler, notifyTomorrow, subscribeToNotificationTaps } from '../utils/notifications';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

configureNotificationHandler();

const POLL_INTERVAL_MS = 15000;

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  const init = useAppStore((s) => s.init);
  const fetchData = useAppStore((s) => s.fetchData);
  const tomorrow = useAppStore((s) => s.data?.tomorrow);
  const city = useAppStore((s) => s.data?.city);
  const pumpMode = useAppStore((s) => s.data?.pump_mode);
  const notified = useRef(false);

  useEffect(() => {
    init();
  }, [init]);

  // Bildirime dokunulduğunda uygulama açılır ve ilgili sekmeye geçilir
  useEffect(() => subscribeToNotificationTaps((url) => router.navigate(url)), []);

  // Uygulama her açıldığında ilk canlı veriyle birlikte yarının hava/don bildirimi bir kez gönderilir
  useEffect(() => {
    if (!tomorrow || notified.current) return;
    notified.current = true;
    notifyTomorrow(tomorrow, city, pumpMode)
      .then((result) => {
        if (result === 'denied') showToast('Bildirim izni kapalı: yarının hava durumu bildirimi gösterilemiyor. Ayarlar > Uygulamalar > AgroGuard AI > Bildirimler.');
      })
      .catch(() => showToast('Yarının hava durumu bildirimi gönderilemedi.'));
  }, [tomorrow, city, pumpMode]);

  // Canlı veri: ön plandayken periyodik sessiz yenileme, uygulamaya dönüşte anında yenileme
  useEffect(() => {
    let timer = setInterval(() => fetchData({ silent: true }), POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      clearInterval(timer);
      if (state === 'active') {
        fetchData({ silent: true });
        timer = setInterval(() => fetchData({ silent: true }), POLL_INTERVAL_MS);
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [fetchData]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <SettingsModal />
    </ThemeProvider>
  );
}
