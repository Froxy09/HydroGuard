import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import { Button } from './ui';
import { colors, radius, spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { describeError, DEFAULT_BASE_URL } from '../api/client';

// Her açılışta yeniden bağlanır; böylece form kayıtlı adresle ve temiz test sonucuyla başlar
export default function SettingsModal() {
  const settingsVisible = useAppStore((s) => s.settingsVisible);
  return <SettingsSheet key={settingsVisible ? 'open' : 'closed'} />;
}

function SettingsSheet() {
  const { settingsVisible, closeSettings, baseUrl, setBaseUrl, testConnection, lastUpdated, connected } = useAppStore();
  const [url, setUrl] = useState(baseUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const data = await testConnection(url);
      setResult({ ok: true, text: `Bağlantı başarılı · ${data.current_field} · ${data.city}` });
    } catch (e) {
      setResult({ ok: false, text: describeError(e) });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    closeSettings();
    await setBaseUrl(url);
  };

  return (
    <BottomSheet
      visible={settingsVisible}
      onClose={closeSettings}
      title="Sunucu Ayarları"
      subtitle="Flask backend adresi (bilgisayarınızın yerel IP'si ve 5000 portu)"
      footer={
        <View style={{ flexDirection: 'row' }}>
          <Button title="Test Et" icon="pulse" outline onPress={runTest} style={{ flex: 1 }} disabled={testing} />
          <View style={{ width: spacing.sm }} />
          <Button title="Kaydet ve Bağlan" icon="save-outline" onPress={save} style={{ flex: 1.5 }} />
        </View>
      }
    >
      <Text style={styles.label}>Sunucu Adresi</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder={DEFAULT_BASE_URL}
        placeholderTextColor={colors.textFaint}
      />
      <Text style={styles.hint}>
        Örnek: http://192.168.1.25:5000 — Telefon ile bilgisayar aynı Wi-Fi ağında olmalı. Emülatör için http://10.0.2.2:5000 kullanın.
      </Text>

      {testing ? (
        <View style={styles.result}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.resultText, { color: colors.textMuted }]}>Bağlantı test ediliyor...</Text>
        </View>
      ) : null}
      {result ? (
        <View style={styles.result}>
          <Ionicons name={result.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={result.ok ? colors.success : colors.danger} />
          <Text style={[styles.resultText, { color: result.ok ? colors.success : colors.danger }]}>{result.text}</Text>
        </View>
      ) : null}

      <View style={styles.status}>
        <View style={[styles.dot, { backgroundColor: connected ? colors.success : colors.danger }]} />
        <Text style={styles.statusText}>
          {connected ? 'Çevrimiçi' : 'Çevrimdışı'}
          {lastUpdated ? ` · Son güncelleme ${lastUpdated.toTimeString().slice(0, 8)}` : ''}
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { color: colors.textFaint, fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  result: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  resultText: { marginLeft: 8, flex: 1, fontWeight: '600' },
  status: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: colors.textMuted, fontSize: 12.5 },
});
