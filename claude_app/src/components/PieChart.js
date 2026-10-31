import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { colors, spacing } from '../theme';
import { formatMoney } from '../utils/format';

export const PIE_COLORS = ['#20c997', '#ff6b6b', '#fcc419', '#4dabf7', '#cc5de8', '#ff922b', '#94d82d', '#868e96'];

const polar = (cx, cy, r, angle) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// Halka (donut) dilimi: dış yay + iç yay
const arcPath = (cx, cy, rOuter, rInner, start, end) => {
  const large = end - start > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOuter, start);
  const p2 = polar(cx, cy, rOuter, end);
  const p3 = polar(cx, cy, rInner, end);
  const p4 = polar(cx, cy, rInner, start);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
};

export default function PieChart({ data, size = 180 }) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = rOuter * 0.6;

  const slices = items.reduce((acc, item, i) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    const sweep = (item.value / total) * 360;
    return [...acc, { ...item, start, end: start + sweep, color: item.color || PIE_COLORS[i % PIE_COLORS.length] }];
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {slices.length === 1 ? (
            <G>
              <Circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} stroke={slices[0].color} strokeWidth={rOuter - rInner} fill="none" />
            </G>
          ) : (
            slices.map((s) => (
              <Path key={s.label} d={arcPath(cx, cy, rOuter, rInner, s.start, s.end)} fill={s.color} stroke={colors.card} strokeWidth={2} />
            ))
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.centerLabel]} pointerEvents="none">
          <Text style={styles.centerSmall}>Toplam Gider</Text>
          <Text style={styles.centerBig} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(total)}
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.label} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendPct}>%{((s.value / total) * 100).toFixed(1).replace('.', ',')}</Text>
            <Text style={styles.legendValue}>{formatMoney(s.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  centerLabel: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  centerSmall: { color: colors.textMuted, fontSize: 11 },
  centerBig: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 2 },
  legend: { alignSelf: 'stretch', marginTop: spacing.lg },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  swatch: { width: 12, height: 12, borderRadius: 3, marginRight: 8 },
  legendLabel: { color: colors.text, flex: 1, fontSize: 13.5 },
  legendPct: { color: colors.textMuted, width: 56, textAlign: 'right', fontSize: 12.5 },
  legendValue: { color: colors.text, width: 110, textAlign: 'right', fontWeight: '700', fontSize: 13 },
});
