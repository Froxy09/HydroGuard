import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppStore } from '../store/useAppStore';
import { AlertBox, Badge, Button, Card, EmptyState, Screen } from '../components/ui';
import BottomSheet from '../components/BottomSheet';
import { colors, radius, spacing } from '../theme';
import { MONTHS_TR, formatMoney, formatNumber, humanDate, parseDateOnly, trCompare, trLower } from '../utils/format';

const PERIODS = [
  { key: 'daily', label: 'Günlük' },
  { key: 'monthly', label: 'Aylık' },
  { key: 'yearly', label: 'Yıllık' },
];

const TYPES = [
  { key: 'all', label: 'Tümü', icon: 'apps-outline' },
  { key: 'Meyve', label: 'Meyve', icon: 'nutrition-outline' },
  { key: 'Sebze', label: 'Sebze', icon: 'leaf-outline' },
  { key: 'İthal', label: 'İthal', icon: 'airplane-outline' },
];

const SORTS = [
  { key: 'name', label: 'A-Z' },
  { key: 'price', label: 'Fiyat' },
  { key: 'change', label: 'Değişim' },
];

const CHANGE_HINT = {
  daily: 'önceki bültene göre',
  monthly: '30 gün içindeki eğilim',
  yearly: '12 ay içindeki eğilim',
};

const shortDay = (str) => {
  const d = parseDateOnly(str);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()].slice(0, 3)}`;
};

const shortMonth = (str) => {
  const d = parseDateOnly(str);
  return `${MONTHS_TR[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`;
};

const rangeText = (payload) => {
  if (!payload) return '';
  if (payload.period === 'daily') {
    const cmp = payload.compare_to ? ` · karşılaştırma: ${shortDay(payload.compare_to)}` : '';
    return `Bülten: ${humanDate(payload.bulletin_date)}${cmp}`;
  }
  const label = payload.period === 'monthly' ? '30 günlük ortalama' : '52 haftalık örnekle yıllık ortalama';
  return `${shortDay(payload.range_from)} ${parseDateOnly(payload.range_from).getFullYear()} – ${humanDate(payload.bulletin_date)} · ${label}`;
};

const unitLabel = (unit) => trLower(unit || 'kg');

const ChangePill = ({ value }) => {
  if (value === null || value === undefined) return <Text style={styles.changeNone}>—</Text>;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const color = flat ? colors.textMuted : up ? colors.success : colors.danger;
  return (
    <View style={[styles.changePill, { backgroundColor: flat ? colors.cardAlt : up ? colors.primaryDim : colors.dangerDim }]}>
      {!flat ? <Ionicons name={up ? 'caret-up' : 'caret-down'} size={11} color={color} /> : null}
      <Text style={[styles.changeText, { color }]}>
        {flat ? '%0' : `%${formatNumber(Math.abs(value))}`}
      </Text>
    </View>
  );
};

const Segmented = ({ options, value, onChange }) => (
  <View style={styles.segment}>
    {options.map((o) => {
      const active = o.key === value;
      return (
        <TouchableOpacity key={o.key} style={[styles.segmentItem, active && styles.segmentActive]} onPress={() => onChange(o.key)} activeOpacity={0.8}>
          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// Seri: aylıkta günlük, yıllıkta aylık ortalamalar
const TrendBars = ({ series, period }) => {
  if (!series || series.length < 2) return null;
  const values = series.map((p) => p.avg);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const labelEvery = period === 'monthly' ? Math.ceil(series.length / 5) : series.length > 8 ? 2 : 1;
  return (
    <View>
      <View style={styles.bars}>
        {series.map((p, i) => {
          const h = max === min ? 0.6 : 0.15 + 0.85 * ((p.avg - min) / (max - min));
          const isLast = i === series.length - 1;
          return (
            <View key={p.date} style={styles.barCol}>
              <View style={[styles.bar, { height: `${h * 100}%`, backgroundColor: isLast ? colors.primary : '#2f7f66' }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.barLabels}>
        {series.map((p, i) => (
          <Text key={p.date} style={styles.barLabel} numberOfLines={1}>
            {i % labelEvery === 0 || i === series.length - 1 ? (period === 'monthly' ? shortDay(p.date).split(' ')[0] : shortMonth(p.date).split(' ')[0]) : ''}
          </Text>
        ))}
      </View>
      <View style={styles.barLegend}>
        <Text style={styles.legendText}>{period === 'monthly' ? 'Günlük' : 'Aylık'} ort. en düşük {formatMoney(min)}</Text>
        <Text style={styles.legendText}>en yüksek {formatMoney(max)}</Text>
      </View>
    </View>
  );
};

const ProductSheet = ({ item, period, onClose }) => (
  <BottomSheet visible={!!item} onClose={onClose} title={item?.name || ''} subtitle={item ? `${item.type} · ${unitLabel(item.unit)} başına` : ''}>
    {item ? (
      <View>
        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{period === 'daily' ? 'Ortalama' : 'Dönem ortalaması'}</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{formatMoney(item.avg)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Değişim</Text>
            <View style={{ marginTop: 6, alignItems: 'flex-start' }}>
              <ChangePill value={item.change_pct} />
            </View>
            <Text style={styles.statHint}>{CHANGE_HINT[period]}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>En düşük</Text>
            <Text style={styles.statValue}>{formatMoney(item.min)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>En yüksek</Text>
            <Text style={styles.statValue}>{formatMoney(item.max)}</Text>
          </View>
        </View>
        {period === 'daily' ? (
          <AlertBox
            tone="info"
            icon="stats-chart"
            message="Günlük görünümde tek bülten vardır. Fiyat eğilimini görmek için Aylık veya Yıllık sekmesine geçin."
            style={{ marginTop: spacing.md }}
          />
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.sheetSection}>
              {period === 'monthly' ? `Son 30 gün · ${item.days} bülten` : `Son 12 ay · aylık ortalama (${item.days} haftalık örnek)`}
            </Text>
            <TrendBars series={item.series} period={period} />
          </View>
        )}
      </View>
    ) : null}
  </BottomSheet>
);

export default function MarketScreen() {
  const data = useAppStore((s) => s.data);
  const market = useAppStore((s) => s.market);
  const fetchMarket = useAppStore((s) => s.fetchMarket);
  const fetchData = useAppStore((s) => s.fetchData);
  const refreshing = useAppStore((s) => s.refreshing);

  const [period, setPeriod] = useState('daily');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('name');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const city = data?.city;
  const day = data?.date_only;
  useEffect(() => {
    if (city && day) fetchMarket(period);
  }, [period, city, day, fetchMarket]);

  const entry = market[period];
  const payload = entry?.payload;
  const allItems = useMemo(() => payload?.items || [], [payload]);

  const counts = useMemo(() => {
    const out = { all: allItems.length };
    allItems.forEach((it) => {
      out[it.type] = (out[it.type] || 0) + 1;
    });
    return out;
  }, [allItems]);

  const items = useMemo(() => {
    const q = trLower(query.trim());
    const list = allItems.filter((it) => (type === 'all' || it.type === type) && (!q || trLower(it.name).includes(q)));
    if (sort === 'price') return [...list].sort((a, b) => b.avg - a.avg);
    if (sort === 'change') return [...list].sort((a, b) => (b.change_pct ?? -Infinity) - (a.change_pct ?? -Infinity));
    return [...list].sort((a, b) => trCompare(a.name, b.name));
  }, [allItems, type, query, sort]);

  const movers = useMemo(() => {
    const withChange = items.filter((it) => it.change_pct !== null && it.change_pct !== undefined);
    if (withChange.length < 2) return null;
    const sorted = [...withChange].sort((a, b) => b.change_pct - a.change_pct);
    return { up: sorted[0], down: sorted[sorted.length - 1] };
  }, [items]);

  if (!data) return <Screen />;

  const onRefresh = () => {
    fetchData({ pull: true });
    fetchMarket(period, { force: true });
  };

  const header = (
    <View>
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="basket" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{city} · Hal Fiyatları</Text>
            <Text style={styles.infoSub}>{payload ? rangeText(payload) : 'Bülten bekleniyor...'}</Text>
          </View>
        </View>
        {payload && !payload.is_local ? (
          <Text style={styles.infoNote}>
            {city} için makine tarafından okunabilir hal fiyatı yayımlanmıyor. Fiyatlar referans olarak İzmir Hali’nin resmi günlük bülteninden gösteriliyor.
          </Text>
        ) : null}
      </Card>

      <Segmented options={PERIODS} value={period} onChange={setPeriod} />

      <View style={styles.chips}>
        {TYPES.map((t) => {
          const active = t.key === type;
          return (
            <TouchableOpacity key={t.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setType(t.key)} activeOpacity={0.8}>
              <Ionicons name={t.icon} size={14} color={active ? '#0b0b0b' : colors.textMuted} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t.label}
                {payload ? ` ${counts[t.key] || 0}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ürün ara (ör. domates)"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sırala</Text>
        {SORTS.map((s) => (
          <TouchableOpacity key={s.key} onPress={() => setSort(s.key)} style={[styles.sortChip, sort === s.key && styles.sortChipActive]}>
            <Text style={[styles.sortText, sort === s.key && { color: colors.primary }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countText}>{payload ? `${items.length} ürün` : ''}</Text>
      </View>

      {movers ? (
        <View style={styles.moversRow}>
          {[
            ['En çok artan', movers.up],
            ['En çok düşen', movers.down],
          ].map(([label, it]) => (
            <TouchableOpacity key={label} style={styles.moverCard} onPress={() => setSelected(it)} activeOpacity={0.8}>
              <Text style={styles.moverLabel}>{label}</Text>
              <Text style={styles.moverName} numberOfLines={1}>{it.name}</Text>
              <ChangePill value={it.change_pct} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {entry?.error ? (
        <AlertBox
          tone="danger"
          icon="warning"
          title="Hal bülteni alınamadı"
          message={payload ? `${entry.error} Son alınan liste gösteriliyor.` : entry.error}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      <View style={styles.tableHead}>
        <Text style={[styles.headText, { flex: 1 }]}>Ürün</Text>
        <Text style={[styles.headText, { width: 124, textAlign: 'right' }]}>{period === 'daily' ? 'Ortalama' : 'Dönem ort.'}</Text>
      </View>
    </View>
  );

  let empty;
  if (entry?.loading && !payload) {
    empty = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>
          {period === 'daily' ? 'Günlük bülten alınıyor...' : 'Bültenler indiriliyor; ilk açılışta 10-20 sn sürebilir...'}
        </Text>
      </View>
    );
  } else if (entry?.error && !payload) {
    empty = <Button title="Tekrar Dene" icon="refresh" onPress={() => fetchMarket(period, { force: true })} style={{ marginTop: spacing.md }} />;
  } else {
    empty = <EmptyState icon="basket-outline" text="Filtreye uyan ürün yok." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={14}
        windowSize={9}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.card}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setSelected(item)} activeOpacity={0.75}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.rowMeta}>
                <Badge text={item.type} tone={item.type === 'Meyve' ? 'warning' : item.type === 'Sebze' ? 'success' : 'info'} />
                <Text style={styles.rowRange}>
                  {formatMoney(item.min, false)} – {formatMoney(item.max, false)}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowPrice}>
                {formatMoney(item.avg)}
                <Text style={styles.rowUnit}>/{unitLabel(item.unit)}</Text>
              </Text>
              <ChangePill value={item.change_pct} />
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          payload ? (
            <Text style={styles.footer}>
              Kaynak: {payload.source}. Değişim: {CHANGE_HINT[period]}.
            </Text>
          ) : null
        }
      />
      {entry?.loading && payload ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <View style={styles.busyPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.busyText}>Güncelleniyor...</Text>
          </View>
        </View>
      ) : null}
      <ProductSheet item={selected} period={period} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 40 },
  infoCard: { marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  infoSub: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  infoNote: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, marginTop: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontWeight: '700' },
  segmentTextActive: { color: '#0b0b0b' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13, marginLeft: 5 },
  chipTextActive: { color: '#0b0b0b' },
  searchRow: { marginBottom: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, marginLeft: spacing.sm, fontSize: 14 },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sortLabel: { color: colors.textFaint, fontSize: 12, marginRight: spacing.sm },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, marginRight: 4 },
  sortChipActive: { backgroundColor: colors.primaryDim },
  sortText: { color: colors.textMuted, fontSize: 12.5, fontWeight: '700' },
  countText: { color: colors.textFaint, fontSize: 12, marginLeft: 'auto' },
  moversRow: { flexDirection: 'row', marginBottom: spacing.md },
  moverCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.sm,
    alignItems: 'flex-start',
  },
  moverLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '700' },
  moverName: { color: colors.text, fontWeight: '800', marginVertical: 4, alignSelf: 'stretch' },
  tableHead: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headText: { color: colors.textFaint, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  rowRange: { color: colors.textFaint, fontSize: 12, marginLeft: spacing.sm },
  rowRight: { alignItems: 'flex-end', width: 124 },
  rowPrice: { color: colors.text, fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  rowUnit: { color: colors.textFaint, fontSize: 11.5, fontWeight: '600' },
  changePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  changeText: { fontSize: 11.5, fontWeight: '800', marginLeft: 2 },
  changeNone: { color: colors.textFaint, fontSize: 12 },
  loading: { alignItems: 'center', paddingVertical: spacing.xl },
  loadingText: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  footer: { color: colors.textFaint, fontSize: 11.5, lineHeight: 16, marginTop: spacing.lg },
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
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: {
    width: '48.5%',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  statLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700' },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  statHint: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  sheetSection: { color: colors.text, fontWeight: '700', marginBottom: spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 1.5 },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabels: { flexDirection: 'row', marginTop: 4 },
  barLabel: { flex: 1, color: colors.textFaint, fontSize: 9.5, textAlign: 'center' },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  legendText: { color: colors.textMuted, fontSize: 12 },
});
