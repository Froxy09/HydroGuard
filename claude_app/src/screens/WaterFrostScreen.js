import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, AlertBox, Button, ProgressBar, Badge } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { formatNumber } from '../utils/format';
import { decisionStyle, pumpIsOn, soilColor, FROST_THRESHOLD, SOIL_CRITICAL } from '../utils/weather';

const PUMP_MODES = [
  { key: 'auto', label: 'Otonom', icon: 'sparkles', color: colors.primary },
  { key: 'on', label: 'Açık', icon: 'power', color: colors.info },
  { key: 'off', label: 'Kapalı', icon: 'stop-circle', color: colors.danger },
];

export default function WaterFrostScreen() {
  const data = useAppStore((s) => s.data);
  return <Screen>{data ? <Content data={data} /> : null}</Screen>;
}

function Content({ data }) {
  const setPump = useAppStore((s) => s.setPump);
  const logElectricity = useAppStore((s) => s.logElectricity);
  const busy = useAppStore((s) => s.busy);
  const { weather, actuators, forecast, energy } = data;

  const pumpOn = pumpIsOn(actuators.pump);
  const decision = decisionStyle(actuators.action_type);
  const frost = weather.temp <= FROST_THRESHOLD;
  const nearFrost = !frost && weather.temp <= FROST_THRESHOLD + 3;
  const soilCritical = weather.soil_moisture < SOIL_CRITICAL;

  const onSelectMode = (mode) => {
    if (mode !== data.pump_mode) setPump(mode).catch(() => {});
  };

  return (
    <View>
      <Card style={[styles.pumpCard, pumpOn && { borderColor: colors.primary }]}>
        <View style={[styles.pumpIcon, { backgroundColor: pumpOn ? colors.primaryDim : colors.cardAlt }]}>
          <Ionicons name={pumpOn ? 'water' : 'water-outline'} size={40} color={pumpOn ? colors.primary : colors.textFaint} />
        </View>
        <Text style={styles.pumpLabel}>SONDAJ POMPASI</Text>
        <Text style={[styles.pumpStatus, { color: pumpOn ? colors.primary : colors.text }]}>{actuators.pump}</Text>
        <Text style={styles.pumpMode}>{data.pump_mode === 'auto' ? 'Algoritma kontrolünde' : 'Kullanıcı kontrolünde'}</Text>
      </Card>

      <SectionTitle icon="options-outline" title="Manuel Pompa Kontrolü" />
      <View style={styles.segment}>
        {PUMP_MODES.map((m) => {
          const active = data.pump_mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.segBtn, active && { backgroundColor: m.color }]}
              onPress={() => onSelectMode(m.key)}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Ionicons name={m.icon} size={20} color={active ? '#0b0b0b' : m.color} />
              <Text style={[styles.segText, { color: active ? '#0b0b0b' : colors.text }]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <AlertBox tone={decision.tone} icon={decision.icon} title={decision.title} message={actuators.reason} style={{ marginTop: spacing.md }} />

      <SectionTitle icon="snow-outline" title="Zirai Don Risk Durumu" />
      <Card style={frost ? { borderColor: colors.danger } : null}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.metricLabel}>Anlık Sıcaklık</Text>
            <Text style={[styles.metricBig, { color: frost ? colors.danger : colors.text }]}>{formatNumber(weather.temp)}°C</Text>
          </View>
          <Badge text={frost ? 'KRİTİK' : nearFrost ? 'İZLENİYOR' : 'GÜVENLİ'} tone={frost ? 'danger' : nearFrost ? 'warning' : 'success'} />
        </View>
        <Text style={styles.metricHint}>Eşik: +{FROST_THRESHOLD}°C altı zirai don</Text>
        <AlertBox
          style={{ marginTop: spacing.md }}
          tone={frost ? 'danger' : nearFrost ? 'warning' : 'success'}
          icon={frost ? 'warning' : 'thermometer-outline'}
          title={frost ? 'ZİRAİ DON TEHLİKESİ!' : nearFrost ? 'Don Sınırına Yakın' : 'Don Riski Yok'}
          message={
            frost
              ? 'Sıcaklık +2°C altına indi. Otonom sistem pompayı açarak "su ile dondurarak koruma" uyguluyor; buz tabakası tomurcukları 0°C civarında tutar.'
              : nearFrost
                ? 'Sıcaklık eşiğe 3°C mesafede. Gece saatlerinde sistem otomatik müdahaleye hazır.'
                : 'Sıcaklık güvenli aralıkta. Tomurcuk yanığı beklenmiyor.'
          }
        />
      </Card>

      <SectionTitle icon="sunny-outline" title="Evapotranspirasyon (Buharlaşma)" />
      <Card style={forecast.evapotranspiration_risk ? { borderColor: colors.warning } : null}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Buharlaşma Riski</Text>
          <Badge text={forecast.evapotranspiration_risk ? 'YÜKSEK' : 'DÜŞÜK'} tone={forecast.evapotranspiration_risk ? 'warning' : 'success'} />
        </View>
        <Text style={styles.body}>
          {forecast.evapotranspiration_risk
            ? 'Sıcaklık 25°C üzerinde ve gündüz saatlerindeyiz. Bu saatte verilen suyun yaklaşık %40\'ı köke ulaşmadan buharlaşır. Sulama gece tarifesine ertelendi.'
            : 'Hava koşulları şu an kayda değer buharlaşma kaybı yaratmıyor. Sulama verimli şekilde yapılabilir.'}
        </Text>
        <View style={styles.factRow}>
          <Fact icon="thermometer-outline" label="Sıcaklık" value={`${formatNumber(weather.temp)}°C`} />
          <Fact icon="water-outline" label="Nem" value={`%${formatNumber(weather.humidity, 0)}`} />
          <Fact icon="flash-outline" label="Tarife" value={energy.tariff_name} />
        </View>
      </Card>

      <SectionTitle icon="leaf-outline" title="Toprak Nemi" />
      <Card style={soilCritical ? { borderColor: colors.danger } : null}>
        <View style={styles.rowBetween}>
          <Text style={[styles.metricBig, { color: soilColor(weather.soil_moisture) }]}>%{formatNumber(weather.soil_moisture)}</Text>
          <Badge text={soilCritical ? 'SULAMA GEREKLİ' : 'YETERLİ'} tone={soilCritical ? 'danger' : 'success'} />
        </View>
        <ProgressBar value={weather.soil_moisture} color={soilColor(weather.soil_moisture)} />
        <View style={styles.scale}>
          <Text style={styles.scaleText}>0</Text>
          <Text style={[styles.scaleText, { color: colors.danger }]}>Kritik %{SOIL_CRITICAL}</Text>
          <Text style={styles.scaleText}>100</Text>
        </View>
        <Text style={styles.body}>
          {soilCritical
            ? weather.is_raining
              ? 'Toprak nemi düşük ancak yağış bekleniyor; sistem yağmuru bekleyerek su tasarrufu yapıyor.'
              : 'Toprak nemi kritik seviyenin altında. Otonom sistem tarife ve buharlaşmaya göre en uygun saatte sulama yapacak.'
            : 'Kök bölgesindeki nem yeterli. Ek sulamaya gerek yok.'}
        </Text>
      </Card>

      <SectionTitle icon="flash-outline" title="Enerji Muhasebesi" />
      <Card>
        <Text style={styles.body}>
          Otonom sulama motorunun (15 kW × 2 saat) aktif tarifeye göre ({formatNumber(energy.tariff_cost, 2)} ₺/kWh) elektrik maliyetini
          ön muhasebeye gider olarak işleyin.
        </Text>
        <Button title="Elektrik Tüketimini Muhasebeye İşle" icon="receipt-outline" onPress={() => logElectricity().catch(() => {})} disabled={busy} style={{ marginTop: spacing.md }} />
      </Card>
    </View>
  );
}

const Fact = ({ icon, label, value }) => (
  <View style={styles.fact}>
    <Ionicons name={icon} size={16} color={colors.textMuted} />
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  pumpCard: { alignItems: 'center', paddingVertical: spacing.xl },
  pumpIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  pumpLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  pumpStatus: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  pumpMode: { color: colors.textMuted, marginTop: 4 },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.sm },
  segText: { fontWeight: '800', marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricLabel: { color: colors.textMuted, fontSize: 12.5 },
  metricBig: { fontSize: 30, fontWeight: '900' },
  metricHint: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  body: { color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  factRow: { flexDirection: 'row', marginTop: spacing.md },
  fact: { flex: 1, alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: radius.sm, paddingVertical: 10, marginHorizontal: 3 },
  factLabel: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  factValue: { color: colors.text, fontWeight: '800', marginTop: 2 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleText: { color: colors.textFaint, fontSize: 11 },
});
