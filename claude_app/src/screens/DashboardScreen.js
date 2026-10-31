import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, AlertBox, EmptyState, Badge } from '../components/ui';
import SimControls from '../components/SimControls';
import { colors, radius, spacing, toneColor } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, shortDate } from '../utils/format';
import { decisionStyle, pumpIsOn, weatherIcon, FROST_THRESHOLD } from '../utils/weather';

const StatCard = ({ icon, iconColor, label, value, sub, accent }) => (
  <View style={styles.statWrap}>
    <Card style={[styles.stat, accent && { borderColor: accent }]}>
      <View style={styles.statHead}>
        <View style={[styles.statIcon, { backgroundColor: `${iconColor}22` }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statSub} numberOfLines={2}>
        {sub}
      </Text>
    </Card>
  </View>
);

const EventCard = ({ item }) => {
  const d = shortDate(item.date_str);
  return (
    <View style={styles.eventCard}>
      <View style={styles.eventDate}>
        <Text style={styles.eventDay}>{d.day}</Text>
        <Text style={styles.eventMonth}>{d.month}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventWeekday}>{d.weekday}</Text>
        <Text style={styles.eventName} numberOfLines={2}>
          {item.event_name}
        </Text>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const data = useAppStore((s) => s.data);

  return (
    <Screen>
      {data ? <DashboardContent data={data} /> : null}
    </Screen>
  );
}

function DashboardContent({ data }) {
  const { weather, energy, actuators, forecast } = data;
  const wIcon = weatherIcon(weather);
  const pumpOn = pumpIsOn(actuators.pump);
  const decision = decisionStyle(actuators.action_type);
  const frost = weather.temp <= FROST_THRESHOLD;

  const alerts = [];
  if (frost) alerts.push({ tone: 'danger', text: 'Don riski' });
  if (forecast.evapotranspiration_risk) alerts.push({ tone: 'warning', text: 'Buharlaşma riski' });
  if (forecast.fertigation_locked) alerts.push({ tone: 'info', text: 'Gübreleme kilitli' });
  if (forecast.mildew_risk) alerts.push({ tone: 'danger', text: 'Mantar riski' });
  if (alerts.length === 0) alerts.push({ tone: 'success', text: 'Tüm sistemler normal' });

  return (
    <View>
      <SimControls />

      <View style={styles.alertRow}>
        {alerts.map((a) => (
          <View key={a.text} style={{ marginRight: 6, marginBottom: 6 }}>
            <Badge text={a.text} tone={a.tone} />
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        <StatCard
          icon={wIcon.name}
          iconColor={wIcon.color}
          label="Sıcaklık"
          value={`${formatNumber(weather.temp)}°C`}
          sub={weather.source}
          accent={frost ? colors.danger : null}
        />
        <StatCard
          icon={weather.is_raining ? 'rainy' : 'water-outline'}
          iconColor={colors.info}
          label="Nem / Yağış"
          value={`%${formatNumber(weather.humidity, 0)}`}
          sub={weather.is_raining ? 'Yağış var' : 'Yağış yok'}
        />
        <StatCard
          icon="flash"
          iconColor={toneColor(energy.tariff_color)}
          label="Aktif Tarife"
          value={energy.tariff_name}
          sub={`${formatNumber(energy.tariff_cost, 2)} ₺/kWh`}
        />
        <StatCard
          icon={pumpOn ? 'water' : 'power'}
          iconColor={pumpOn ? colors.primary : colors.textMuted}
          label="Sondaj Pompası"
          value={actuators.pump}
          sub={data.pump_mode === 'auto' ? 'Otonom mod' : 'Manuel mod'}
          accent={pumpOn ? colors.primary : null}
        />
      </View>

      <SectionTitle icon="hardware-chip-outline" title="Sistem Kararı" />
      <AlertBox tone={decision.tone} icon={decision.icon} title={decision.title} message={actuators.reason} />
      <View style={styles.soilRow}>
        <Ionicons name="leaf" size={16} color={colors.primary} />
        <Text style={styles.soilText}>
          Toprak nemi <Text style={{ color: colors.text, fontWeight: '800' }}>%{formatNumber(weather.soil_moisture)}</Text>
          {'  ·  '}Tarla: {data.field_size} dönüm
        </Text>
      </View>

      <SectionTitle icon="calendar-outline" title="Yaklaşan Olaylar" right={<Text style={styles.count}>{data.upcoming_events.length}</Text>} />
      {data.upcoming_events.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-clear-outline" text="Yaklaşan olay yok. Ajanda sekmesinden ekleyebilirsiniz." />
        </Card>
      ) : (
        <FlatList
          horizontal
          data={data.upcoming_events}
          keyExtractor={(item, i) => `${item.date_str}-${item.event_name}-${i}`}
          renderItem={({ item }) => <EventCard item={item} />}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alertRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, marginTop: spacing.sm },
  statWrap: { width: '50%', padding: spacing.xs },
  stat: { padding: spacing.md, minHeight: 128 },
  statHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  statLabel: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600', flex: 1 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statSub: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  soilRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  soilText: { color: colors.textMuted, marginLeft: 6, fontSize: 13 },
  count: { color: colors.primary, fontWeight: '800' },
  eventCard: {
    width: 190,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  eventDate: {
    width: 48,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  eventDay: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  eventMonth: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  eventWeekday: { color: colors.textFaint, fontSize: 11 },
  eventName: { color: colors.text, fontWeight: '700', marginTop: 2 },
});
