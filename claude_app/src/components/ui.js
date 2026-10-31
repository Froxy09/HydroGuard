import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, toneBg, toneColor } from '../theme';
import { useAppStore } from '../store/useAppStore';

export const Card = ({ style, children }) => <View style={[styles.card, style]}>{children}</View>;

export const SectionTitle = ({ icon, title, right }) => (
  <View style={styles.sectionRow}>
    <View style={styles.sectionLeft}>
      {icon ? <Ionicons name={icon} size={18} color={colors.primary} style={{ marginRight: 6 }} /> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {right}
  </View>
);

export const AlertBox = ({ tone = 'success', icon = 'information-circle', title, message, style }) => (
  <View style={[styles.alert, { backgroundColor: toneBg(tone), borderColor: toneColor(tone) }, style]}>
    <Ionicons name={icon} size={22} color={toneColor(tone)} style={{ marginRight: 10, marginTop: 1 }} />
    <View style={{ flex: 1 }}>
      {title ? <Text style={[styles.alertTitle, { color: toneColor(tone) }]}>{title}</Text> : null}
      {message ? <Text style={styles.alertText}>{message}</Text> : null}
    </View>
  </View>
);

export const Button = ({ title, icon, onPress, tone = 'primary', outline = false, disabled, style, small }) => {
  const color = tone === 'primary' ? colors.primary : toneColor(tone);
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        small && styles.buttonSmall,
        outline ? { borderColor: color, borderWidth: 1, backgroundColor: 'transparent' } : { backgroundColor: color },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={small ? 16 : 18} color={outline ? color : '#0b0b0b'} style={{ marginRight: 6 }} />
      ) : null}
      <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: outline ? color : '#0b0b0b' }]}>{title}</Text>
    </TouchableOpacity>
  );
};

export const Badge = ({ text, tone = 'success' }) => (
  <View style={[styles.badge, { backgroundColor: toneBg(tone) }]}>
    <Text style={[styles.badgeText, { color: toneColor(tone) }]}>{text}</Text>
  </View>
);

export const ProgressBar = ({ value, max = 100, color = colors.primary }) => {
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
};

export const EmptyState = ({ icon = 'leaf-outline', text }) => (
  <View style={styles.empty}>
    <Ionicons name={icon} size={28} color={colors.textFaint} />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

// Her ekranın ortak iskeleti: ilk yüklemede spinner, bağlantı hatasında yeniden dene, aşağı çekerek yenile.
export const Screen = ({ children, contentStyle }) => {
  const { data, loading, error, refreshing, fetchData, openSettings, busy } = useAppStore();

  if (!data && (loading || !error)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centerText}>Tarla verileri yükleniyor...</Text>
      </View>
    );
  }

  if (!data && error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={56} color={colors.danger} />
        <Text style={[styles.centerText, { color: colors.text, fontWeight: '700', fontSize: 17 }]}>Bağlantı Kurulamadı</Text>
        <Text style={[styles.centerText, { marginBottom: spacing.lg }]}>{error}</Text>
        <Button title="Tekrar Dene" icon="refresh" onPress={() => fetchData()} style={{ marginBottom: spacing.sm, minWidth: 220 }} />
        <Button title="Sunucu Adresini Değiştir" icon="settings-outline" outline onPress={openSettings} style={{ minWidth: 220 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData({ pull: true })}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {error ? (
          <AlertBox tone="danger" icon="warning" title="Bağlantı koptu" message={`${error} Son alınan veriler gösteriliyor.`} style={{ marginBottom: spacing.md }} />
        ) : null}
        {children}
      </ScrollView>
      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <View style={styles.busyPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.busyText}>İşleniyor...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  alert: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  alertTitle: { fontWeight: '800', fontSize: 14, marginBottom: 2 },
  alertText: { color: colors.text, fontSize: 13.5, lineHeight: 19 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.md },
  buttonText: { fontWeight: '700', fontSize: 15 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  progressTrack: {
    height: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: spacing.lg },
  emptyText: { color: colors.textFaint, marginTop: 6, textAlign: 'center' },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centerText: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  busyOverlay: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' },
  busyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  busyText: { color: colors.text, marginLeft: 8, fontSize: 13 },
});
