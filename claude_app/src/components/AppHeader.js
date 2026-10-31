import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

export function HeaderRight() {
  const connected = useAppStore((s) => s.connected);
  const openSettings = useAppStore((s) => s.openSettings);
  return (
    <TouchableOpacity onPress={openSettings} style={styles.headerRight} hitSlop={10}>
      <View style={[styles.dot, { backgroundColor: connected ? colors.success : colors.danger }]} />
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </TouchableOpacity>
  );
}

export function HeaderTitle({ title }) {
  return (
    <View style={styles.headerTitle}>
      <Ionicons name="leaf" size={20} color={colors.primary} />
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  headerText: { color: colors.text, fontSize: 18, fontWeight: '800', marginLeft: 8 },
});
