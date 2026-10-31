import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, SectionTitle, Badge } from '../components/ui';
import { colors, radius, spacing, toneBg, toneColor } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { formatNumber } from '../utils/format';
import { FROST_THRESHOLD, SOIL_CRITICAL } from '../utils/weather';

const DISEASES = [
  {
    key: 'mildew',
    title: 'Mantar Hastalıkları (Mildiyö & Külleme)',
    icon: 'bug',
    condition: '%75 üzeri nem ve 15-25°C arası sıcaklık.',
    symptoms: 'Yaprak üstünde sarı lekeler, alt yüzde gri-beyaz küf tabakası; ilerleyen dönemde yaprak dökümü.',
    solution: 'Sistem uyarı verdiğinde koruyucu bakırlı preparatlar veya sistemik fungisitler uygulanmalı. Sıra arası havalandırma artırılmalı, yapraktan sulamadan kaçınılmalı.',
  },
  {
    key: 'spider',
    title: 'Kırmızı Örümcek (Zararlı)',
    icon: 'bug-outline',
    condition: 'Sıcak, kurak ve tozlu dönemler (28°C üzeri, düşük nem).',
    symptoms: 'Yapraklarda iğne başı sarı noktacıklar, alt yüzde ince ağ örgüsü, bronzlaşma.',
    solution: 'Nem oranının aşırı düşmesi engellenmeli, tarla kenarındaki toz azaltılmalı. Erken teşhiste spesifik akarisit uygulanmalı; faydalı avcı akarlar korunmalı.',
  },
  {
    key: 'frost',
    title: 'Zirai Don (Tomurcuk Yanığı)',
    icon: 'snow',
    condition: 'Sıcaklığın +2°C altına düşmesi, özellikle açık ve rüzgârsız gecelerde.',
    symptoms: 'Tomurcuk ve çiçeklerde kahverengileşme, sürgün uçlarında kuruma, meyve tutumunda düşüş.',
    solution: 'AgroGuard otonom pompayı açarak "su ile dondurarak koruma" uygular: donan suyun açığa çıkardığı gizli ısı bitki dokusunu 0°C civarında tutar.',
  },
  {
    key: 'aphid',
    title: 'Yaprak Biti (Afit)',
    icon: 'leaf',
    condition: 'Ilık bahar dönemi, aşırı azotlu gübreleme sonrası yumuşak sürgünler.',
    symptoms: 'Sürgün uçlarında kıvrılma, yapışkan bal özü ve üzerinde fumajin (siyah küf).',
    solution: 'Dengeli azot gübrelemesi yapılmalı. Uğur böceği gibi doğal düşmanlar korunmalı; yoğun bulaşıkta sistemik insektisit veya arap sabunu çözeltisi kullanılmalı.',
  },
  {
    key: 'root',
    title: 'Kök Çürüklüğü',
    icon: 'water',
    condition: 'Uzun süre %90 üzeri toprak nemi, ağır ve drenajı zayıf topraklar.',
    symptoms: 'Gündüz solgunluk, kök boğazında kararma, kolay kopan çürük kökler.',
    solution: 'Aşırı sulamadan kaçının (AgroGuard toprak nemi %40 altına inmeden sulama yapmaz). Drenaj iyileştirilmeli, hastalıklı bitkiler sökülmeli, toprak fungisiti uygulanmalı.',
  },
];

export default function AdviceScreen() {
  const data = useAppStore((s) => s.data);
  return <Screen>{data ? <Content data={data} /> : null}</Screen>;
}

function buildRecommendations(data) {
  const { weather, forecast, energy } = data;
  const list = [
    {
      tone: 'info',
      icon: 'repeat',
      title: 'Ekim Nöbeti (Münavebe) Analizi',
      text: 'Geçmiş sezon verilerine göre toprağın azotu tükendi. Mısır yerine Baklagil (Fasulye) ekerseniz gübreden yaklaşık 20.000 ₺ tasarruf eder, toprağın doğal verimini geri kazandırırsınız.',
    },
  ];

  if (forecast.evapotranspiration_risk) {
    list.push({
      tone: 'warning',
      icon: 'sunny',
      title: 'Sulamayı Geceye Bırakın',
      text: `Sıcaklık ${formatNumber(weather.temp)}°C. Evapotranspirasyon modelimize göre gündüz yapılan sulamanın %40'ı köke ulaşmadan buharlaşacak. Sistemi otonomda tutun; sulama geceye ertelendi.`,
    });
  } else {
    list.push({
      tone: 'success',
      icon: 'checkmark-circle',
      title: 'Buharlaşma Kaybı Yok',
      text: 'Hava şartları şu an evapotranspirasyon kaynaklı su kaybı yaratmıyor.',
    });
  }

  if (forecast.fertigation_locked) {
    list.push({
      tone: 'danger',
      icon: 'funnel',
      title: 'Gübrelemeyi Durdurun',
      text: 'Yağmurdan hemen önce atılan gübre yıkanır, yeraltı sularına karışır ve bitkiye ulaşmaz. Gübre atımını erteleyin.',
    });
  } else {
    list.push({
      tone: 'success',
      icon: 'funnel',
      title: 'Gübreleme (Fertigasyon) İçin Uygun',
      text: 'Önümüzdeki 24 saatte şiddetli yağış beklenmiyor. Gübre şırıngalaması yapılabilir.',
    });
  }

  if (forecast.mildew_risk) {
    list.push({
      tone: 'danger',
      icon: 'bug',
      title: 'Kritik Mantar Riski',
      text: 'Önümüzdeki 3 günde yüksek nem (>%75) ve 15-25°C sıcaklık bekleniyor. Mildiyöye karşı koruyucu ilaçlama tavsiye edilir.',
    });
  }

  if (weather.temp <= FROST_THRESHOLD) {
    list.push({
      tone: 'danger',
      icon: 'snow',
      title: 'Zirai Don Alarmı',
      text: 'Sıcaklık don eşiğinin altında. Pompayı manuel kapatmayın; otonom sistem su ile koruma uyguluyor.',
    });
  }

  if (weather.soil_moisture < SOIL_CRITICAL && !weather.is_raining) {
    list.push({
      tone: 'warning',
      icon: 'leaf',
      title: 'Toprak Nemi Kritik',
      text: `Toprak nemi %${formatNumber(weather.soil_moisture)}. Bitki stresi başlamadan, ucuz gece tarifesinde sulama planlanmalı.`,
    });
  }

  if (energy.tariff_name === 'Puant') {
    list.push({
      tone: 'warning',
      icon: 'flash',
      title: 'Puant Tarifesi: Pompa Çalıştırmayın',
      text: `Şu an en pahalı tarife (${formatNumber(energy.tariff_cost, 2)} ₺/kWh). Aynı sulamayı 22:00 sonrası gece tarifesinde yaparak elektrik maliyetini %62 azaltabilirsiniz.`,
    });
  }

  return list;
}

function diseaseRisk(key, data) {
  const { weather, forecast } = data;
  if (key === 'mildew') return forecast.mildew_risk;
  if (key === 'spider') return weather.temp > 28 && weather.humidity < 50;
  if (key === 'frost') return weather.temp <= FROST_THRESHOLD;
  if (key === 'aphid') return weather.temp >= 15 && weather.temp <= 26 && weather.humidity < 70;
  if (key === 'root') return weather.soil_moisture >= 90;
  return false;
}

function Content({ data }) {
  const [openKey, setOpenKey] = useState(null);
  const recs = buildRecommendations(data);

  const toggle = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenKey(openKey === key ? null : key);
  };

  return (
    <View>
      <View style={styles.hero}>
        <Ionicons name="sparkles" size={22} color={colors.primary} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={styles.heroTitle}>AgroGuard AI Önerileri</Text>
          <Text style={styles.heroSub}>
            {data.current_field} · {data.city} · {recs.length} öneri
          </Text>
        </View>
      </View>

      {recs.map((r) => (
        <View key={r.title} style={[styles.rec, { borderLeftColor: toneColor(r.tone) }]}>
          <View style={[styles.recIcon, { backgroundColor: toneBg(r.tone) }]}>
            <Ionicons name={r.icon} size={18} color={toneColor(r.tone)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recTitle, { color: toneColor(r.tone) }]}>{r.title}</Text>
            <Text style={styles.recText}>{r.text}</Text>
          </View>
        </View>
      ))}

      <SectionTitle icon="medkit-outline" title="Hastalıklar ve Çözüm Rehberi" />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {DISEASES.map((d, i) => {
          const open = openKey === d.key;
          const risk = diseaseRisk(d.key, data);
          return (
            <View key={d.key} style={i > 0 && styles.accBorder}>
              <TouchableOpacity style={styles.accHeader} onPress={() => toggle(d.key)} activeOpacity={0.75}>
                <Ionicons name={d.icon} size={18} color={risk ? colors.danger : colors.primary} />
                <Text style={styles.accTitle}>{d.title}</Text>
                {risk ? <Badge text="RİSK" tone="danger" /> : null}
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              {open ? (
                <View style={styles.accBody}>
                  <InfoLine label="Oluşum Şartı" text={d.condition} />
                  <InfoLine label="Belirtiler" text={d.symptoms} />
                  <InfoLine label="Çözüm" text={d.solution} highlight />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const InfoLine = ({ label, text, highlight }) => (
  <View style={{ marginBottom: spacing.sm }}>
    <Text style={[styles.infoLabel, highlight && { color: colors.primary }]}>{label}</Text>
    <Text style={styles.infoText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDim,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  heroTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  heroSub: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  rec: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  recTitle: { fontWeight: '800', fontSize: 14.5, marginBottom: 3 },
  recText: { color: colors.textMuted, lineHeight: 19, fontSize: 13.5 },
  accBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  accHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  accTitle: { color: colors.text, fontWeight: '700', flex: 1, marginLeft: 10, marginRight: 8 },
  accBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  infoLabel: { color: colors.textMuted, fontWeight: '800', fontSize: 12.5, marginBottom: 2 },
  infoText: { color: colors.text, lineHeight: 19, fontSize: 13.5 },
});
