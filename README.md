# HydroGuard — AgroGuard AI

Yazılım Kulübü Yeşil Gelecek Hackathonu Projesi.

AgroGuard AI, çiftçinin suyu ve enerjiyi verimli kullanmasına yardım eden akıllı tarla yönetim sistemidir. Hava tahmini, toprak nemi ve elektrik tarifesine göre sulama pompasını yönetir, zirai dona karşı uyarır, ajanda, muhasebe ve hal fiyatlarını tek yerde toplar.

| Klasör | İçerik |
|---|---|
| [`agroguard/`](agroguard) | Flask backend ve web paneli (Python) |
| [`claude_app/`](claude_app) | Android uygulaması (Expo / React Native) |

Ayrıntılı açıklama, kurulum, karar motoru, API ve demo senaryoları: **[claude_app/README.md](claude_app/README.md)**

**Android APK:** [AgroGuardAI.apk indir (v1.0.0)](https://github.com/Froxy09/HydroGuard/releases/download/v1.0.0/AgroGuardAI.apk) · [Sürüm notları](https://github.com/Froxy09/HydroGuard/releases/tag/v1.0.0)

## Hızlı Başlangıç

Backend:

```bash
cd agroguard
pip install -r requirements.txt
python app.py
```

Mobil uygulama (ayrı terminalde):

```bash
cd claude_app
npm install
npx expo start
```

Telefon ve bilgisayar aynı Wi-Fi ağında olmalı. Sunucu adresi uygulamada sağ üstteki ⚙ simgesinden girilir (`http://<bilgisayarın-IP-adresi>:5000`).
