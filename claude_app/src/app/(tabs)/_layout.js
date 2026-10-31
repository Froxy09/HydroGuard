import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';

import { HeaderRight, HeaderTitle } from '../../components/AppHeader';
import { colors } from '../../theme';

const tabIcon = (active, inactive) =>
  function TabIcon({ focused, color, size }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerRight: () => <HeaderRight />,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Ana Ekran', headerTitle: () => <HeaderTitle title="AgroGuard AI" />, tabBarIcon: tabIcon('grid', 'grid-outline') }}
      />
      <Tabs.Screen
        name="su-don"
        options={{ title: 'Su & Don', headerTitle: () => <HeaderTitle title="Su ve Don Kontrolü" />, tabBarIcon: tabIcon('water', 'water-outline') }}
      />
      <Tabs.Screen
        name="ajanda"
        options={{ title: 'Ajanda', headerTitle: () => <HeaderTitle title="Tarla Ajandası" />, tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="hal"
        options={{ title: 'Hal', headerTitle: () => <HeaderTitle title="Hal Fiyatları" />, tabBarIcon: tabIcon('basket', 'basket-outline') }}
      />
      <Tabs.Screen
        name="finans"
        options={{ title: 'Finans', headerTitle: () => <HeaderTitle title="Ön Muhasebe" />, tabBarIcon: tabIcon('wallet', 'wallet-outline') }}
      />
      <Tabs.Screen
        name="oneriler"
        options={{ title: 'Öneriler', headerTitle: () => <HeaderTitle title="Zirai Öneriler" />, tabBarIcon: tabIcon('bulb', 'bulb-outline') }}
      />
    </Tabs>
  );
}
