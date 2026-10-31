import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, AlertBox, Button, EmptyState } from '../components/ui';
import BottomSheet from '../components/BottomSheet';
import { colors, radius, spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, humanDate, monthTitle, parseSimTime, addMonths, formatSimTime, shortDate } from '../utils/format';
import { weatherIcon, soilColor } from '../utils/weather';

const WEEK_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const TEMPLATES = [
  { label: 'Su verildi', icon: 'water' },
  { label: 'Gübre verildi', icon: 'flask' },
  { label: 'İlaçlama yapıldı', icon: 'medkit' },
  { label: 'Ekim yapıldı', icon: 'leaf' },
  { label: 'Budama yapıldı', icon: 'cut' },
  { label: 'Hasat yapıldı', icon: 'basket' },
];

export default function AgendaScreen() {
  const data = useAppStore((s) => s.data);
  return <Screen>{data ? <Content data={data} /> : null}</Screen>;
}

function Content({ data }) {
  const addEvent = useAppStore((s) => s.addEvent);
  const removeEvent = useAppStore((s) => s.removeEvent);
  const setSimState = useAppStore((s) => s.setSimState);
  const busy = useAppStore((s) => s.busy);
  const [selectedDate, setSelectedDate] = useState(null);
  const [customText, setCustomText] = useState('');

  const days = data.calendar_days || [];
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const selectedDay = days.find((d) => d.date === selectedDate);
  const monthEvents = days.filter((d) => d.is_current_month && d.events.length > 0);

  const shiftMonth = (delta) => {
    const next = addMonths(parseSimTime(data.time_str), delta);
    setSimState({ time: formatSimTime(next) }).catch(() => {});
  };

  const onAdd = async (text) => {
    const value = text.trim();
    if (!value || !selectedDate) return;
    if (selectedDay?.events.includes(value)) {
      Alert.alert('Zaten kayıtlı', `"${value}" bu güne zaten eklenmiş.`);
      return;
    }
    const doAdd = async () => {
      try {
        await addEvent(selectedDate, value);
        setCustomText('');
      } catch {
        // Hata mesajı store tarafından toast ile gösterilir
      }
    };
    if (value.toLowerCase().includes('gübre') && (selectedDay?.is_raining || data.forecast.fertigation_locked)) {
      Alert.alert(
        'Fertigasyon Koruması',
        'Yağış bekleniyor. Yağmurdan önce verilen gübre yıkanarak yeraltı suyuna karışır. Yine de kaydetmek istiyor musunuz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Yine de Ekle', style: 'destructive', onPress: doAdd },
        ]
      );
      return;
    }
    await doAdd();
  };

  const onRemove = (event) => {
    Alert.alert('Olayı Sil', `"${event}" kaydı silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => removeEvent(selectedDate, event).catch(() => {}) },
    ]);
  };

  return (
    <View>
      {data.forecast.fertigation_locked ? (
        <AlertBox
          tone="danger"
          icon="rainy"
          title="FERTİGASYON KORUMASI AKTİF"
          message="Bugün veya yarın yağış bekleniyor. Gübre atımını erteleyin; yağmur gübreyi yıkayarak yeraltı sularına taşır."
        />
      ) : (
        <AlertBox
          tone="success"
          icon="flask"
          title="Gübreleme İçin Uygun"
          message="Önümüzdeki 24 saatte yağış beklenmiyor. Fertigasyon (gübreli sulama) yapılabilir."
        />
      )}

      <Card style={{ marginTop: spacing.lg, padding: spacing.md }}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={10} style={styles.monthBtn} disabled={busy}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.monthTitle}>{monthTitle(data.time_str)}</Text>
            <Text style={styles.monthSub}>{data.current_field}</Text>
          </View>
          <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={10} style={styles.monthBtn} disabled={busy}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEK_DAYS.map((w) => (
            <Text key={w} style={styles.weekDay}>
              {w}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((day) => {
              const icon = weatherIcon(day);
              return (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.dayCell,
                    day.is_today && styles.today,
                    !day.is_current_month && { opacity: 0.35 },
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNum, day.is_today && { color: colors.primary }]}>{day.day_num}</Text>
                  <Ionicons name={icon.name} size={13} color={icon.color} />
                  <Text style={[styles.daySoil, { color: soilColor(day.soil_moisture) }]}>%{Math.round(day.soil_moisture)}</Text>
                  {day.events.length > 0 ? (
                    <View style={styles.dotRow}>
                      {day.events.slice(0, 3).map((e) => (
                        <View key={e} style={styles.dot} />
                      ))}
                    </View>
                  ) : (
                    <View style={{ height: 5 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.legend}>
          <Legend icon="rainy" color={colors.info} text="Yağış" />
          <Legend icon="sunny" color={colors.warning} text=">25°C" />
          <Legend icon="snow" color="#a5d8ff" text="Don" />
          <View style={styles.legendItem}>
            <View style={styles.dot} />
            <Text style={styles.legendText}>Olay</Text>
          </View>
        </View>
      </Card>

      <SectionTitle icon="list-outline" title="Bu Ayın Kayıtları" />
      {monthEvents.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-clear-outline" text="Bu ay için kayıt yok. Takvimde bir güne dokunarak olay ekleyin." />
        </Card>
      ) : (
        monthEvents.map((d) => {
          const sd = shortDate(d.date);
          return (
            <TouchableOpacity key={d.date} onPress={() => setSelectedDate(d.date)} activeOpacity={0.8}>
              <Card style={styles.monthEvent}>
                <View style={styles.monthEventDate}>
                  <Text style={styles.monthEventDay}>{sd.day}</Text>
                  <Text style={styles.monthEventWd}>{sd.weekday}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {d.events.map((e) => (
                    <Text key={e} style={styles.monthEventText}>
                      • {e}
                    </Text>
                  ))}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Card>
            </TouchableOpacity>
          );
        })
      )}

      <BottomSheet
        visible={!!selectedDay}
        onClose={() => {
          setSelectedDate(null);
          setCustomText('');
        }}
        title={selectedDay ? humanDate(selectedDay.date) : ''}
        subtitle={
          selectedDay
            ? `${formatNumber(selectedDay.temp)}°C · Toprak nemi %${formatNumber(selectedDay.soil_moisture)} · ${selectedDay.is_raining ? 'Yağışlı' : 'Kuru'}`
            : ''
        }
      >
        {selectedDay ? (
          <View>
            {selectedDay.is_raining ? (
              <AlertBox tone="info" icon="rainy" message="Bu gün yağış bekleniyor. Sulama ve gübreleme için uygun değil." style={{ marginBottom: spacing.md }} />
            ) : null}

            <Text style={styles.sheetLabel}>Kayıtlı Olaylar</Text>
            {selectedDay.events.length === 0 ? (
              <Text style={styles.noEvent}>Bu güne ait kayıt yok.</Text>
            ) : (
              selectedDay.events.map((e) => (
                <View key={e} style={styles.eventRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={styles.eventText}>{e}</Text>
                  <TouchableOpacity onPress={() => onRemove(e)} hitSlop={10} disabled={busy}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={[styles.sheetLabel, { marginTop: spacing.lg }]}>Hızlı Şablonlar</Text>
            <View style={styles.templateWrap}>
              {TEMPLATES.map((t) => {
                const exists = selectedDay.events.includes(t.label);
                return (
                  <TouchableOpacity
                    key={t.label}
                    style={[styles.template, exists && { borderColor: colors.primary, backgroundColor: colors.primaryDim }]}
                    onPress={() => onAdd(t.label)}
                    disabled={busy || exists}
                  >
                    <Ionicons name={exists ? 'checkmark' : t.icon} size={16} color={colors.primary} />
                    <Text style={styles.templateText}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sheetLabel, { marginTop: spacing.lg }]}>Özel Olay</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={styles.input}
                placeholder="Örn: Damla sulama hortumu değişti"
                placeholderTextColor={colors.textFaint}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={() => onAdd(customText)}
                returnKeyType="done"
              />
              <Button title="Ekle" icon="add" small onPress={() => onAdd(customText)} disabled={busy || !customText.trim()} style={{ marginLeft: spacing.sm }} />
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const Legend = ({ icon, color, text }) => (
  <View style={styles.legendItem}>
    <Ionicons name={icon} size={13} color={color} />
    <Text style={styles.legendText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthBtn: { padding: 6, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  monthTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  monthSub: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    margin: 1.5,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
  },
  today: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryDim },
  dayNum: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 1 },
  daySoil: { fontSize: 9.5, fontWeight: '700', marginTop: 1 },
  dotRow: { flexDirection: 'row', marginTop: 2, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginHorizontal: 1 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { color: colors.textMuted, fontSize: 11.5, marginLeft: 4 },
  monthEvent: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, padding: spacing.md },
  monthEventDate: { width: 44, alignItems: 'center', marginRight: spacing.md },
  monthEventDay: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  monthEventWd: { color: colors.textFaint, fontSize: 11 },
  monthEventText: { color: colors.text, marginVertical: 1 },
  sheetLabel: { color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
  noEvent: { color: colors.textFaint, fontStyle: 'italic' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: 6,
  },
  eventText: { color: colors.text, flex: 1, marginLeft: 8, fontWeight: '600' },
  templateWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  template: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 3,
  },
  templateText: { color: colors.text, marginLeft: 6, fontWeight: '600', fontSize: 13 },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },
});
