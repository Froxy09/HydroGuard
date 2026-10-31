import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Button, EmptyState, Badge } from '../components/ui';
import BottomSheet from '../components/BottomSheet';
import PieChart from '../components/PieChart';
import { colors, radius, spacing } from '../theme';
import { useAppStore } from '../store/useAppStore';
import {
  formatMoney,
  formatNumber,
  humanDate,
  isValidDateOnly,
  parseDateOnly,
  formatDateOnly,
  addDays,
  showToast,
} from '../utils/format';

const EXPENSE_CATEGORIES = ['Mazot/Yakıt', 'Gübre', 'Zirai İlaç', 'Tohum/Fide', 'İşçilik', 'Elektrik/Sondaj', 'Kira', 'Diğer Giderler'];
const INCOME_CATEGORIES = ['Ürün Satışı', 'Devlet Desteği/Hibe', 'Kira Geliri', 'Diğer Gelirler'];

const CATEGORY_ICONS = {
  'Mazot/Yakıt': 'car',
  Gübre: 'flask',
  'Zirai İlaç': 'medkit',
  'Tohum/Fide': 'leaf',
  İşçilik: 'people',
  'Elektrik/Sondaj': 'flash',
  Kira: 'home',
  'Ürün Satışı': 'cart',
  'Devlet Desteği/Hibe': 'ribbon',
  'Kira Geliri': 'key',
};

export default function FinanceScreen() {
  const data = useAppStore((s) => s.data);
  return <Screen>{data ? <Content data={data} /> : null}</Screen>;
}

function Content({ data }) {
  const removeAccounting = useAppStore((s) => s.removeAccounting);
  const logElectricity = useAppStore((s) => s.logElectricity);
  const busy = useAppStore((s) => s.busy);
  const [formVisible, setFormVisible] = useState(false);
  const acc = data.accounting;

  const roi = acc.total_expense > 0 ? (acc.net_balance / acc.total_expense) * 100 : null;
  const pieData = Object.entries(acc.expense_breakdown || {}).map(([label, value]) => ({ label, value: Number(value) || 0 }));
  const hasExpense = pieData.some((p) => p.value > 0);

  const onDelete = (rec) => {
    Alert.alert('Kaydı Sil', `${rec.category || rec.desc || 'Kayıt'} · ${formatMoney(rec.amount)} kaydı silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => removeAccounting(rec.id).catch(() => {}) },
    ]);
  };

  const onReport = () => {
    showToast(
      `Ziraat Bankası raporu oluşturuldu: ${data.current_field} · Net ${formatMoney(acc.net_balance)} · ${acc.records.length} işlem. Tarımsal kredi başvurusuna eklendi.`
    );
  };

  return (
    <View>
      <View style={styles.row}>
        <Card style={[styles.summary, { borderColor: colors.success }]}>
          <Ionicons name="trending-up" size={20} color={colors.success} />
          <Text style={styles.summaryLabel}>Toplam Gelir</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(acc.total_income)}
          </Text>
        </Card>
        <View style={{ width: spacing.sm }} />
        <Card style={[styles.summary, { borderColor: colors.danger }]}>
          <Ionicons name="trending-down" size={20} color={colors.danger} />
          <Text style={styles.summaryLabel}>Toplam Gider</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(acc.total_expense)}
          </Text>
        </Card>
      </View>

      <Card style={[styles.netCard, { borderColor: acc.is_profitable ? colors.primary : colors.danger }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Net Bakiye</Text>
            <Text style={[styles.netValue, { color: acc.is_profitable ? colors.primary : colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(acc.net_balance)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>ROI</Text>
            <Text style={[styles.roi, { color: roi === null ? colors.textMuted : roi >= 0 ? colors.primary : colors.danger }]}>
              {roi === null ? '—' : `%${formatNumber(roi)}`}
            </Text>
            <Badge text={acc.is_profitable ? 'KÂRDA' : 'ZARARDA'} tone={acc.is_profitable ? 'success' : 'danger'} />
          </View>
        </View>
      </Card>

      <SectionTitle icon="grid-outline" title={`Dönüm Başı Analiz · ${data.field_size} dönüm`} />
      <Card style={{ padding: spacing.md }}>
        <PerDecareRow label="Dönüm başı gelir" value={acc.per_decare_income} color={colors.success} />
        <PerDecareRow label="Dönüm başı maliyet" value={acc.per_decare_expense} color={colors.danger} />
        <View style={styles.divider} />
        <PerDecareRow
          label={acc.per_decare_profit >= 0 ? 'Dönüm başı kâr' : 'Dönüm başı zarar'}
          value={acc.per_decare_profit}
          color={acc.per_decare_profit >= 0 ? colors.primary : colors.danger}
          bold
        />
      </Card>

      <SectionTitle icon="pie-chart-outline" title="Gider Dağılımı" />
      <Card>
        {hasExpense ? <PieChart data={pieData} /> : <EmptyState icon="pie-chart-outline" text="Henüz gider kaydı yok." />}
      </Card>

      <View style={[styles.row, { marginTop: spacing.lg }]}>
        <Button title="Gelir / Gider Ekle" icon="add-circle-outline" onPress={() => setFormVisible(true)} style={{ flex: 1 }} />
      </View>
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <Button title="Elektriği İşle" icon="flash-outline" outline tone="warning" onPress={() => logElectricity().catch(() => {})} disabled={busy} style={{ flex: 1 }} small />
        <View style={{ width: spacing.sm }} />
        <Button title="Ziraat Bankası Raporu" icon="document-text-outline" outline onPress={onReport} style={{ flex: 1.3 }} small />
      </View>

      <SectionTitle icon="time-outline" title="Geçmiş İşlemler" right={<Text style={styles.count}>{acc.records.length}</Text>} />
      {acc.records.length === 0 ? (
        <Card>
          <EmptyState icon="receipt-outline" text="Bu tarlaya ait muhasebe kaydı bulunmuyor." />
        </Card>
      ) : (
        acc.records.map((rec) => {
          const income = rec.type === 'gelir';
          return (
            <Card key={rec.id} style={styles.record}>
              <View style={[styles.recIcon, { backgroundColor: income ? colors.primaryDim : colors.dangerDim }]}>
                <Ionicons name={CATEGORY_ICONS[rec.category] || (income ? 'cash' : 'pricetag')} size={18} color={income ? colors.success : colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recCategory}>{rec.category || (income ? 'Diğer Gelirler' : 'Diğer Giderler')}</Text>
                {rec.desc ? (
                  <Text style={styles.recDesc} numberOfLines={2}>
                    {rec.desc}
                  </Text>
                ) : null}
                <Text style={styles.recDate}>{rec.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.recAmount, { color: income ? colors.success : colors.danger }]}>
                  {income ? '+' : '−'}
                  {formatMoney(rec.amount)}
                </Text>
                <TouchableOpacity onPress={() => onDelete(rec)} hitSlop={10} disabled={busy} style={{ marginTop: 8 }}>
                  <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Card>
          );
        })
      )}

      {/* Her açılışta yeniden bağlanır; tarih alanı güncel simülasyon günüyle başlar */}
      <TransactionForm key={formVisible ? 'open' : 'closed'} visible={formVisible} onClose={() => setFormVisible(false)} defaultDate={data.date_only} />
    </View>
  );
}

const PerDecareRow = ({ label, value, color, bold }) => (
  <View style={styles.pdRow}>
    <Text style={[styles.pdLabel, bold && { color: colors.text, fontWeight: '800' }]}>{label}</Text>
    <Text style={[styles.pdValue, { color }, bold && { fontSize: 17 }]}>{formatMoney(value)} / dönüm</Text>
  </View>
);

function TransactionForm({ visible, onClose, defaultDate }) {
  const addAccounting = useAppStore((s) => s.addAccounting);
  const busy = useAppStore((s) => s.busy);
  const [type, setType] = useState('gider');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(defaultDate);

  const reset = () => {
    setType('gider');
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount('');
    setDesc('');
    setDate(defaultDate);
  };

  const close = () => {
    reset();
    onClose();
  };

  const switchType = (t) => {
    setType(t);
    setCategory(t === 'gelir' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const shiftDate = (delta) => {
    const base = isValidDateOnly(date) ? parseDateOnly(date) : parseDateOnly(defaultDate);
    setDate(formatDateOnly(addDays(base, delta)));
  };

  const parsedAmount = parseFloat(String(amount).replace(/\./g, '').replace(',', '.'));
  const valid = parsedAmount > 0 && isValidDateOnly(date);

  const submit = async () => {
    if (!valid) {
      Alert.alert('Eksik bilgi', 'Lütfen geçerli bir tutar ve YYYY-AA-GG biçiminde tarih girin.');
      return;
    }
    try {
      await addAccounting({ type, category, amount: parsedAmount, desc: desc.trim(), date });
      close();
    } catch {
      // Hata mesajı store tarafından toast ile gösterilir; form açık kalır
    }
  };

  const categories = type === 'gelir' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const accent = type === 'gelir' ? colors.success : colors.danger;

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="Yeni Muhasebe Kaydı"
      subtitle="Kayıt seçili tarlanın ön muhasebesine eklenir"
      footer={<Button title="Kaydet" icon="checkmark" onPress={submit} disabled={busy || !valid} tone={type === 'gelir' ? 'primary' : 'danger'} />}
    >
      <View style={styles.typeSwitch}>
        {[
          { key: 'gelir', label: 'Gelir', icon: 'arrow-down-circle', color: colors.success },
          { key: 'gider', label: 'Gider', icon: 'arrow-up-circle', color: colors.danger },
        ].map((t) => {
          const active = type === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.typeBtn, active && { backgroundColor: t.color }]} onPress={() => switchType(t.key)}>
              <Ionicons name={t.icon} size={18} color={active ? '#0b0b0b' : t.color} />
              <Text style={[styles.typeText, { color: active ? '#0b0b0b' : colors.text }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.formLabel}>Kategori</Text>
      <View style={styles.catWrap}>
        {categories.map((c) => {
          const active = c === category;
          return (
            <TouchableOpacity key={c} style={[styles.cat, active && { borderColor: accent, backgroundColor: `${accent}26` }]} onPress={() => setCategory(c)}>
              <Text style={[styles.catText, active && { color: accent, fontWeight: '800' }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.formLabel}>Tutar (₺)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Örn: 1500" placeholderTextColor={colors.textFaint} />

      <Text style={styles.formLabel}>Açıklama</Text>
      <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="Örn: Traktör mazotu 40 lt" placeholderTextColor={colors.textFaint} />

      <Text style={styles.formLabel}>Tarih</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => shiftDate(-1)}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { flex: 1, textAlign: 'center', marginHorizontal: spacing.sm }, !isValidDateOnly(date) && { borderColor: colors.danger }]}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-AA-GG"
          placeholderTextColor={colors.textFaint}
          maxLength={10}
        />
        <TouchableOpacity style={styles.dateBtn} onPress={() => shiftDate(1)}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {isValidDateOnly(date) ? <Text style={styles.dateHuman}>{humanDate(date)}</Text> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { flex: 1, padding: spacing.md },
  summaryLabel: { color: colors.textMuted, fontSize: 12.5, marginTop: 6 },
  summaryValue: { fontSize: 19, fontWeight: '900', marginTop: 2 },
  netCard: { marginTop: spacing.sm },
  netValue: { fontSize: 28, fontWeight: '900', marginTop: 2 },
  roi: { fontSize: 20, fontWeight: '900', marginVertical: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  pdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  pdLabel: { color: colors.textMuted, fontSize: 13.5 },
  pdValue: { fontWeight: '800', fontSize: 14 },
  count: { color: colors.primary, fontWeight: '800' },
  record: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, marginBottom: spacing.sm },
  recIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  recCategory: { color: colors.text, fontWeight: '800' },
  recDesc: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  recDate: { color: colors.textFaint, fontSize: 11.5, marginTop: 2 },
  recAmount: { fontWeight: '900', fontSize: 14.5 },
  typeSwitch: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.sm },
  typeText: { fontWeight: '800', marginLeft: 6 },
  formLabel: { color: colors.textMuted, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cat: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    margin: 3,
  },
  catText: { color: colors.text, fontSize: 13 },
  input: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 15,
  },
  dateBtn: { padding: 11, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  dateHuman: { color: colors.textFaint, textAlign: 'center', marginTop: 6, fontSize: 12.5 },
});
