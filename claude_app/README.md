# AgroGuard AI

Çiftçi için akıllı tarla yönetimi: sulama pompası, zirai don koruması, elektrik tarifesi, ajanda, muhasebe ve hal fiyatları tek bir sistemde.

Proje iki parçadan oluşur:

| Parça | Konum | Teknoloji |
|---|---|---|
| Backend + web paneli | `../agroguard` | Python 3, Flask, Open-Meteo API, İzmir BB Açık Veri API |
| Android uygulaması | bu klasör (`claude_app`) | Expo SDK 58, React Native 0.88, Expo Router, Zustand, axios |

Mobil uygulama ve web paneli aynı Flask sunucusunu kullanır. Uygulamada yapılan bir değişiklik (pompa modu, ajanda kaydı, gider) web panelinde de hemen görünür.

---

## Özellikler

- **Otonom pompa kararı:** Hava durumu, toprak nemi ve elektrik tarifesine bakarak pompayı açar, kapatır ya da sulamayı erteler. Kullanıcı istediği an manuel Açık / Kapalı moda geçebilir.
- **Zirai don koruması:** Sıcaklık +2°C ve altına inince pompa su ile don korumasını başlatır.
- **Yarının hava durumu bildirimi:** Uygulama her açıldığında yarının sıcaklığı, yağış, nem ve iki gecelik don riski Android bildirimi olarak gelir. Bildirime dokununca uygulama açılır: don riski varsa **Su & Don**, yoksa **Ana Ekran** sekmesine gider.
- **Hal fiyatları:** Günlük, aylık ve yıllık fiyatlar. Meyve / sebze / ithal filtresi, arama, sıralama (A-Z, fiyat, değişim), en çok artan ve düşen ürünler, ürün bazında eğilim grafiği.
- **Ajanda:** Tarla bazında takvim. Yağış beklenen günlerde fertigasyon (gübreli sulama) kilitlenir.
- **Finans:** Gelir / gider kaydı, kategori bazında gider dağılımı (pasta grafik), dönüm başı gelir, gider ve kâr. Pompanın elektrik gideri tek dokunuşla muhasebeye işlenir.
- **Öneriler:** Mildiyö (küf) riski, buharlaşma uyarısı ve hastalık rehberi.
- **Simülasyon kontrolleri:** Tarla, şehir ve zaman seçilerek sistem farklı senaryolarda denenebilir.

## Karar Motoru

`evaluate_system_logic()` (`../agroguard/app.py`) kararları şu öncelik sırasıyla verir:

| Öncelik | Koşul | Pompa | Karar kodu |
|---|---|---|---|
| 1 | Kullanıcı manuel Açık / Kapalı seçtiyse | Kullanıcının seçimi | `manual_override` |
| 2 | Sıcaklık ≤ +2°C | AÇIK | `frost_alert` |
| 3 | Toprak nemi < %40, yağış yok ve 10:00–17:00 arası sıcaklık > 25°C | KAPALI (sulama geceye ertelenir) | `et_save` |
| 4 | Sulama gerekli, puant tarifesi (17:00–22:00) | KAPALI (ertelenir) | `energy_save` |
| 5 | Sulama gerekli, gece tarifesi (22:00–06:00) | AÇIK | `irrigation_optimal` |
| 6 | Sulama gerekli, gündüz tarifesi | AÇIK | `irrigation_day` |
| – | Hiçbiri | KAPALI | `standby` |

Ek tahminler:

- **Fertigasyon kilidi:** Bugün veya yarın yağış varsa gübre yıkanıp gideceği için kilitlenir.
- **Mildiyö riski:** Önümüzdeki 3 günden birinde nem > %75 ve sıcaklık 15–25°C ise uyarı verilir.
- **Gece don raporu:** Bu gecenin minimumu yarının Tmin değeri, yarın gecenin minimumu ertesi günün Tmin değeridir (günün en düşük sıcaklığı şafakta oluşur). Eşik +2°C.

Elektrik tarifesi (simülasyon değerleri): Gündüz 2,5 ₺/kWh, Puant 4,0 ₺/kWh, Gece 1,5 ₺/kWh. Elektrik gideri hesabında pompa 15 kW, çalışma süresi 2 saat varsayılır.

**Hava verisi:** Open-Meteo'dan şehir için 14 gün geçmiş ve 16 gün ileri günlük tahmin çekilir. Bu aralığın dışındaki bir tarih seçilirse veya bağlantı yoksa, `tarih + şehir` tohumlu **kalıcı simülasyon** kullanılır. Aynı tarih ve şehir her zaman aynı sonucu verir.

## Sürdürülebilirlik

- **Su:** Sıcak öğle saatlerinde sulamak, suyun önemli kısmının buharlaşmasına yol açar. Sistem sulamayı geceye kaydırır. Toprak nemi yeterliyse veya yağış varsa pompa hiç çalışmaz.
- **Enerji:** Sulama puant saatlerinden gece tarifesine kaydırılır. Örnek: 15 kW × 2 saat sulama puantta 120 ₺, gece 45 ₺ tutar, yani maliyet %62,5 düşer. Bu, şebekenin en yoğun saatlerindeki yükü de azaltır.
- **Toprak ve su kaynakları:** Yağıştan önce gübrelemenin engellenmesi, gübrenin yeraltı sularına karışmasını önler.
- **Ürün:** Don ve mildiyö uyarıları ürün kaybını azaltır, gereksiz ilaçlamanın önüne geçer.
- **Çiftçi:** Dönüm başı kâr ve gider dağılımı, hal fiyatlarıyla birlikte doğru zamanda satış kararı vermeye yardım eder.

---

## Kurulum

### 1. Backend

```bash
cd ../agroguard
pip install -r requirements.txt
python app.py
```

Sunucu `0.0.0.0:5000` adresinde, debug modunda açılır. Web paneli: `http://localhost:5000`.

- Ajanda ve muhasebe kayıtları `db.json` dosyasında tutulur.
- Hal bültenleri `hal_cache.json` dosyasında önbelleğe alınır.
- Windows Güvenlik Duvarı'nda 5000 portuna gelen bağlantılara izin verin, yoksa telefon sunucuya ulaşamaz.

### 2. Mobil uygulama (geliştirme)

```bash
npm install
npx expo start
```

- Telefon ve bilgisayar **aynı Wi-Fi ağında** olmalı.
- Sunucu adresi varsayılan olarak `http://172.18.62.48:5000` (`src/api/client.js`). Uygulamada sağ üstteki ⚙ simgesinden değiştirilir ve cihazda saklanır. Bilgisayarın IP adresini `ipconfig` ile öğrenebilirsiniz.
- Bildirimleri denemek için Expo Go yerine development build (`npx expo run:android`) veya APK kullanın.
- `npx expo start --web` ile tarayıcıda da açılır, ancak Flask sunucusunda CORS açık olmadığı için web sürümü canlı veriyi çekemez.

### 3. APK derleme

`android/` klasörü Continuous Native Generation ile üretilir; elle düzenlenmez. Yerel ayar `app.json` ve config plugin'lerden yapılır.

```bash
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleRelease
```

Çıktı: `android/app/build/outputs/apk/release/app-release.apk`. Hazır derlenmiş sürüm: `AgroGuardAI.apk`.

Derleme için JDK 17+ ve Android SDK gerekir (`ANDROID_HOME` tanımlı olmalı). APK yalnızca `arm64-v8a` ve `armeabi-v7a` mimarileri için üretilir. Sunucu HTTP olduğu için `usesCleartextTraffic` açıktır.

### Kontroller

```bash
npx expo lint
```

```bash
npx expo-doctor
```

---

## Klasör Yapısı

```
src/
  app/                      Expo Router rotaları (her dosya bir ekran)
    _layout.js              Kök düzen: tema, 15 sn'de bir canlı veri yenileme, ayarlar, "yarın" bildirimi
    (tabs)/_layout.js       Alt sekme çubuğu (6 sekme) ve başlıklar
    (tabs)/*.js             Ekranlara yönlendiren rota dosyaları: index, su-don, ajanda, hal, finans, oneriler
  theme.js                  Renkler (#121212 / #1e1e1e / #20c997)
  api/client.js             axios istemcisi, tüm uç noktalar, varsayılan sunucu adresi
  store/useAppStore.js      Zustand store: canlı veri, sunucu adresi, hal fiyatları, aksiyonlar
  utils/format.js           Tarih / para biçimlendirme, Türkçe sıralama, Toast
  utils/weather.js          Hava ikonları, don / toprak nemi eşikleri, karar renkleri
  utils/notifications.js    Yarının hava / don bildirimi (expo-notifications), dokununca ilgili sekme
  components/
    ui.js                   Card, AlertBox, Button, Badge, ProgressBar, Screen
    BottomSheet.js          Alttan açılan modal
    SimControls.js          Tarla / şehir / simülasyon zamanı seçicileri
    SettingsModal.js        Sunucu adresi ayarı ve bağlantı testi
    PieChart.js             react-native-svg ile halka grafik
    AppHeader.js            Başlık, bağlantı durumu ve ayarlar düğmesi
  screens/
    DashboardScreen.js      Ana Ekran: hava, toprak, pompa, tarife kartları ve sistem kararı
    WaterFrostScreen.js     Su & Don: pompa kontrolü, don riski, buharlaşma, toprak nemi
    AgendaScreen.js         Ajanda: fertigasyon uyarısı, takvim, gün detayı
    MarketScreen.js         Hal: günlük / aylık / yıllık fiyatlar, filtre, arama, ürün eğilimi
    FinanceScreen.js        Finans: gelir / gider, dönüm başı analiz, pasta grafik, işlem formu
    AdviceScreen.js         Öneriler: AI önerileri, hastalık rehberi
assets/                     Uygulama, splash ve bildirim ikonları
sunum/                      Teknik sunum (PPTX)
```

## Backend Uç Noktaları

| Metot | Yol | Gövde / parametre | Açıklama |
|---|---|---|---|
| GET | `/api/live-data` | – | Tüm canlı durum: hava, karar, tarife, tahminler, `tomorrow`, takvim, muhasebe |
| POST | `/api/set-state` | `{time: "YYYY-MM-DDTHH:MM", city, field}` | Simülasyon zamanı, şehir ve tarla seçimi |
| POST | `/api/set-pump` | `{mode: "auto" \| "on" \| "off"}` | Pompa modu |
| POST | `/api/add-event` | `{date, event}` | Ajandaya kayıt ekler |
| POST | `/api/remove-event` | `{date, event}` | Ajanda kaydını siler |
| POST | `/api/add-acc` | `{type: "gelir" \| "gider", category, amount, desc, date}` | Muhasebe kaydı ekler |
| POST | `/api/remove-acc` | `{id}` | Muhasebe kaydını siler |
| POST | `/api/log-electricity` | – | Anlık tarifeye göre pompa elektrik giderini muhasebeye işler |
| GET | `/api/market-prices` | `?period=daily \| monthly \| yearly` | Hal fiyatları |

Web paneli sayfaları: `/`, `/su-kontrol`, `/guc-kontrol`, `/ajanda`, `/muhasebe`, `/oneriler`.

### `tomorrow` alanı

```json
{
  "date": "2027-01-02", "temp_max": 3.2, "temp_min": -6.8,
  "precipitation": null, "humidity": 79.1, "is_raining": true,
  "frost_tonight": true, "frost_tomorrow_night": true, "tomorrow_night_min": -4.8,
  "source": "Kalıcı Simülasyon"
}
```

`precipitation` simülasyon modunda `null` olur.

### Hal fiyatları

Veri kaynağı İzmir Büyükşehir Belediyesi açık veri API'sidir (`openapi.izmir.bel.tr`, Hal Müdürlüğü günlük bülteni). Türkiye'de makine tarafından okunabilir hal verisini yalnızca İzmir yayımladığı için diğer illerde İzmir Hali **referans** olarak gösterilir ve ekranda bu belirtilir.

- **Günlük:** Son bülten; bir önceki bültene göre değişim yüzdesi.
- **Aylık:** Son 30 günün ortalama, en düşük ve en yüksek fiyatı. Değişim, dönemin son çeyreği ile ilk çeyreği karşılaştırılarak hesaplanır.
- **Yıllık:** 52 haftalık örnek, aylık ortalama serisi.

Bülten adları kaynakta büyük harfle ve Türkçe karakterler eksik yazıldığı için `HAL_NAME_FIX` ve `tr_title()` ile düzeltilir. Geçmiş tarihli bültenler diske yazılır. Yıllık özetin ilk yüklemesi 10–20 sn sürebilir, sonraki açılışlar önbellekten gelir.

---

## Demo Senaryoları

Seçilen tarihler Open-Meteo'nun tahmin aralığı dışında kaldığı için kalıcı simülasyon kullanılır ve sonuç her seferinde aynıdır. Zaman ve şehir, uygulamadaki simülasyon kontrollerinden veya web panelinden ayarlanır. Pompa **Otonom** modda olmalıdır.

| Şehir | Tarih ve saat | Beklenen karar |
|---|---|---|
| Konya | 24.07.2027 13:00 | `et_save`: 27,4°C, toprak nemi %35,4. Sulama geceye ertelenir. Mildiyö riski var. |
| Konya | 24.07.2027 19:00 | `energy_save`: puant tarifesi, sulama ertelenir |
| Konya | 24.07.2027 23:00 | `irrigation_optimal`: gece tarifesinde sulama yapılır |
| Kars | 01.01.2027 21:00 | `frost_alert`: -6,0°C, pompa açık. Bu gece -6,8°C, yarın gece -4,8°C. Açılışta don bildirimi gelir. |

## Bilinen Sınırlar

- Sensör verisi yoktur; toprak nemi hava tahmininden türetilir veya simüle edilir.
- Simülasyon durumu (şehir, zaman, pompa modu) sunucu belleğinde tutulur. Sunucu yeniden başlarsa varsayılana döner. Kalıcı olan yalnızca ajanda ve muhasebedir.
- Hal fiyatları yalnızca İzmir için gerçektir.
- Sunucuda kimlik doğrulama yoktur. Yalnızca güvenilir yerel ağda çalıştırın.
- Bildirim, uygulama açıldığında gönderilir; uygulama kapalıyken arka planda zamanlanmış kontrol yapılmaz.
