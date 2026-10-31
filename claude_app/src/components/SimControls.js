import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import { Button } from './ui';
import { colors, radius, spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import {
  parseSimTime,
  formatSimTime,
  humanDateTime,
  addDays,
  addHours,
} from '../utils/format';

const CITIES = [
  'Trabzon', 'Rize', 'Samsun', 'Ordu', 'Antalya', 'Konya', 'İzmir', 'Ankara',
  'Adana', 'Bursa', 'Şanlıurfa', 'Erzurum', 'Manisa', 'Kayseri', 'İstanbul',
];

const HOUR_PRESETS = [
  { label: 'Gece 02:00', hour: 2, hint: 'Ucuz tarife' },
  { label: 'Sabah 08:00', hour: 8, hint: 'Gündüz' },
  { label: 'Öğle 13:00', hour: 13, hint: 'Buharlaşma' },
  { label: 'Akşam 19:00', hour: 19, hint: 'Puant' },
  { label: 'Gece 23:00', hour: 23, hint: 'Gece' },
];

const Chip = ({ icon, label, value, onPress, flex = 1 }) => (
  <TouchableOpacity style={[styles.chip, { flex }]} onPress={onPress} activeOpacity={0.75}>
    <Ionicons name={icon} size={16} color={colors.primary} />
    <View style={{ marginLeft: 8, flex: 1 }}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
    <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
  </TouchableOpacity>
);

const OptionRow = ({ label, selected, onPress, right }) => (
  <TouchableOpacity style={[styles.option, selected && styles.optionSelected]} onPress={onPress} activeOpacity={0.75}>
    <Text style={[styles.optionText, selected && { color: colors.primary, fontWeight: '800' }]}>{label}</Text>
    {right}
    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 8 }} /> : null}
  </TouchableOpacity>
);

const Stepper = ({ label, onMinus, onPlus, minusLabel, plusLabel }) => (
  <View style={styles.stepRow}>
    <TouchableOpacity style={styles.stepBtn} onPress={onMinus}>
      <Text style={styles.stepBtnText}>{minusLabel}</Text>
    </TouchableOpacity>
    <Text style={styles.stepLabel}>{label}</Text>
    <TouchableOpacity style={styles.stepBtn} onPress={onPlus}>
      <Text style={styles.stepBtnText}>{plusLabel}</Text>
    </TouchableOpacity>
  </View>
);

export default function SimControls() {
  const data = useAppStore((s) => s.data);
  const setSimState = useAppStore((s) => s.setSimState);
  const [sheet, setSheet] = useState(null); // 'field' | 'city' | 'time'
  const [customCity, setCustomCity] = useState('');
  const [draftTime, setDraftTime] = useState(new Date());

  if (!data) return null;

  const openTime = () => {
    setDraftTime(parseSimTime(data.time_str));
    setSheet('time');
  };

  const chooseField = async (field) => {
    setSheet(null);
    if (field !== data.current_field) await setSimState({ field }).catch(() => {});
  };

  const chooseCity = async (city) => {
    const value = city.trim();
    if (!value) return;
    setSheet(null);
    setCustomCity('');
    if (value !== data.city) await setSimState({ city: value }).catch(() => {});
  };

  const applyTime = async (date) => {
    setSheet(null);
    await setSimState({ time: formatSimTime(date) }).catch(() => {});
  };

  const setHour = (hour) => {
    const d = new Date(draftTime.getTime());
    d.setHours(hour, 0, 0, 0);
    setDraftTime(d);
  };

  return (
    <View>
      <Chip
        icon="map-outline"
        label={`AKTİF TARLA · ${data.field_size} dönüm`}
        value={data.current_field}
        onPress={() => setSheet('field')}
      />
      <View style={styles.row}>
        <Chip icon="location-outline" label="ŞEHİR" value={data.city} onPress={() => setSheet('city')} flex={0.8} />
        <View style={{ width: spacing.sm }} />
        <Chip icon="time-outline" label="SİMÜLASYON ZAMANI" value={humanDateTime(data.time_str)} onPress={openTime} flex={1.2} />
      </View>

      <BottomSheet visible={sheet === 'field'} onClose={() => setSheet(null)} title="Tarla Seçimi" subtitle="Veriler ve muhasebe seçili tarlaya göre gösterilir">
        {(data.fields || []).map((f) => (
          <OptionRow key={f} label={f} selected={f === data.current_field} onPress={() => chooseField(f)} />
        ))}
      </BottomSheet>

      <BottomSheet visible={sheet === 'city'} onClose={() => setSheet(null)} title="Şehir Seçimi" subtitle="Hava durumu Open-Meteo üzerinden bu şehre göre çekilir">
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Başka bir şehir yazın..."
            placeholderTextColor={colors.textFaint}
            value={customCity}
            onChangeText={setCustomCity}
            onSubmitEditing={() => chooseCity(customCity)}
            returnKeyType="done"
          />
          <Button title="Seç" small onPress={() => chooseCity(customCity)} disabled={!customCity.trim()} style={{ marginLeft: spacing.sm }} />
        </View>
        {CITIES.map((c) => (
          <OptionRow key={c} label={c} selected={c === data.city} onPress={() => chooseCity(c)} />
        ))}
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'time'}
        onClose={() => setSheet(null)}
        title="Simülasyon Zamanı"
        subtitle="Tarife, buharlaşma ve don senaryolarını test edin"
        footer={
          <View style={styles.row}>
            <Button title="Şimdi" icon="refresh" outline onPress={() => applyTime(new Date())} style={{ flex: 1 }} />
            <View style={{ width: spacing.sm }} />
            <Button title="Uygula" icon="checkmark" onPress={() => applyTime(draftTime)} style={{ flex: 1.4 }} />
          </View>
        }
      >
        <View style={styles.timePreview}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.timePreviewText}>{humanDateTime(formatSimTime(draftTime))}</Text>
        </View>
        <Stepper
          label="Gün"
          minusLabel="−1"
          plusLabel="+1"
          onMinus={() => setDraftTime(addDays(draftTime, -1))}
          onPlus={() => setDraftTime(addDays(draftTime, 1))}
        />
        <Stepper
          label="Hafta"
          minusLabel="−7"
          plusLabel="+7"
          onMinus={() => setDraftTime(addDays(draftTime, -7))}
          onPlus={() => setDraftTime(addDays(draftTime, 7))}
        />
        <Stepper
          label="Saat"
          minusLabel="−1s"
          plusLabel="+1s"
          onMinus={() => setDraftTime(addHours(draftTime, -1))}
          onPlus={() => setDraftTime(addHours(draftTime, 1))}
        />
        <Text style={styles.presetTitle}>Hızlı Senaryolar</Text>
        <View style={styles.presetWrap}>
          {HOUR_PRESETS.map((p) => (
            <TouchableOpacity key={p.label} style={[styles.preset, draftTime.getHours() === p.hour && styles.presetActive]} onPress={() => setHour(p.hour)}>
              <Text style={styles.presetText}>{p.label}</Text>
              <Text style={styles.presetHint}>{p.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chipLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  chipValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: 6,
    backgroundColor: colors.cardAlt,
  },
  optionSelected: { backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary },
  optionText: { color: colors.text, fontSize: 15, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
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
  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDim,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  timePreviewText: { color: colors.text, fontSize: 17, fontWeight: '800', marginLeft: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  stepBtn: {
    width: 64,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
  },
  stepBtnText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  stepLabel: { flex: 1, textAlign: 'center', color: colors.text, fontWeight: '600' },
  presetTitle: { color: colors.textMuted, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  preset: {
    width: '31%',
    margin: '1%',
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetActive: { borderColor: colors.primary },
  presetText: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  presetHint: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
});
