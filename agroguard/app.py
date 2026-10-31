from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
import math
import calendar
import json
import os
import requests
import random
import time
import re
import threading
from datetime import date
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

DB_FILE = "db.json"
API_CACHE = {}

# Hal fiyatları: İzmir Büyükşehir Belediyesi açık veri API'si (günlük bülten)
HAL_API_URL = "https://openapi.izmir.bel.tr/api/ibb/halfiyatlari/sebzemeyve/{}"
HAL_CACHE_FILE = "hal_cache.json"
HAL_SOURCE = "İzmir Büyükşehir Belediyesi Açık Veri · Hal Müdürlüğü günlük bülteni"
HAL_LOCK = threading.Lock()

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            events = data.get("events", {})
            if events and not any("Tarla" in k for k in events.keys()):
                events = {"1. Tarla (Merkez)": events}
            accounting = data.get("accounting", {})
            return {"events": events, "accounting": accounting}
    return {"events": {}, "accounting": {}}

def save_db():
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "events": system_state["events"],
            "accounting": system_state["accounting"]
        }, f, ensure_ascii=False, indent=4)

db_data = load_db()

# Çoklu Tarla ve Sistem Durumu (Tarla Büyüklükleri Eklendi)
system_state = {
    "current_time": datetime.now(),
    "city": "Trabzon",
    "current_field": "1. Tarla (Merkez)",
    "fields": ["1. Tarla (Merkez)", "2. Tarla (Kuzey Yaka)", "3. Tarla (Sera)"],
    "field_sizes": {"1. Tarla (Merkez)": 50, "2. Tarla (Kuzey Yaka)": 120, "3. Tarla (Sera)": 15}, # Dönüm (Dekar)
    "pump_mode": "auto",
    "events": db_data.get("events", {}),
    "accounting": db_data.get("accounting", {})
}

def get_weather_data(city, dt):
    date_str = dt.strftime("%Y-%m-%d")
    cache_key = city.lower()
    
    if cache_key not in API_CACHE:
        try:
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=tr&format=json"
            geo_data = requests.get(geo_url, timeout=3).json()
            if "results" in geo_data and len(geo_data["results"]) > 0:
                lat = geo_data["results"][0]["latitude"]
                lon = geo_data["results"][0]["longitude"]
                
                weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max&timezone=auto&past_days=14&forecast_days=16"
                w_data = requests.get(weather_url, timeout=3).json()
                if "daily" in w_data:
                    API_CACHE[cache_key] = w_data["daily"]
        except Exception:
            pass 
    
    if cache_key in API_CACHE:
        daily = API_CACHE[cache_key]
        if date_str in daily.get("time", []):
            idx = daily["time"].index(date_str)
            t_max = daily["temperature_2m_max"][idx]
            t_min = daily["temperature_2m_min"][idx]
            precip = daily["precipitation_sum"][idx]
            hum = daily["relative_humidity_2m_max"][idx]
            
            if t_max is not None and t_min is not None:
                hour = dt.hour
                if 4 <= hour <= 14: temp = t_min + (t_max - t_min) * ((hour - 4) / 10)
                elif hour > 14: temp = t_max - (t_max - t_min) * ((hour - 14) / 10)
                else: temp = t_min
                is_raining = precip > 0.5
                return {
                    "temp": round(temp, 1),
                    "humidity": round(hum, 1) if hum else 65.0,
                    "soil_moisture": round(max(10.0, min(100.0, 100.0 - temp + (precip * 5))), 1),
                    "is_raining": is_raining,
                    "source": "Open-Meteo API"
                }

    random.seed(date_str + city) 
    base_temp = random.uniform(8.0, 28.0)
    if dt.month in [11, 12, 1, 2, 3]: base_temp -= 15.0
    temp = round(base_temp + (5 * math.sin(2 * math.pi * (dt.hour - 8) / 24)), 1)
    humidity = round(random.uniform(40.0, 95.0), 1)
    is_raining = random.choice([True, False, False])
    soil_moisture = round(random.uniform(30.0, 80.0), 1)
    if is_raining: soil_moisture = round(random.uniform(85.0, 100.0), 1)
    return {"temp": temp, "humidity": humidity, "soil_moisture": soil_moisture, "is_raining": is_raining, "source": "Kalıcı Simülasyon"}

def get_daily_forecast(city, d):
    """Bir günün ham günlük tahmini (Tmax, Tmin, yağış, nem). get_weather_data ile aynı kaynak ve yedeği kullanır."""
    date_str = d.strftime("%Y-%m-%d")
    get_weather_data(city, datetime(d.year, d.month, d.day, 12, 0))  # önbelleği doldur
    daily = API_CACHE.get(city.lower())
    if daily and date_str in daily.get("time", []):
        idx = daily["time"].index(date_str)
        t_max, t_min = daily["temperature_2m_max"][idx], daily["temperature_2m_min"][idx]
        precip = daily["precipitation_sum"][idx] or 0.0
        hum = daily["relative_humidity_2m_max"][idx]
        if t_max is not None and t_min is not None:
            return {"date": date_str, "temp_max": round(t_max, 1), "temp_min": round(t_min, 1), "precipitation": round(precip, 1),
                    "humidity": round(hum, 1) if hum else 65.0, "is_raining": precip > 0.5, "source": "Open-Meteo API"}

    # Simülasyon: get_weather_data ile aynı tohum ve aynı çekiliş sırası (sıcaklık eğrisi taban ± 5°C)
    random.seed(date_str + city)
    base_temp = random.uniform(8.0, 28.0)
    if d.month in [11, 12, 1, 2, 3]: base_temp -= 15.0
    humidity = round(random.uniform(40.0, 95.0), 1)
    is_raining = random.choice([True, False, False])
    return {"date": date_str, "temp_max": round(base_temp + 5, 1), "temp_min": round(base_temp - 5, 1), "precipitation": None,
            "humidity": humidity, "is_raining": is_raining, "source": "Kalıcı Simülasyon"}

def build_tomorrow_report(city, current_time):
    # Günlük minimum sıcaklık şafakta oluşur: bu geceki don = yarının Tmin'i, yarın geceki don = ertesi günün Tmin'i
    tomorrow = get_daily_forecast(city, (current_time + timedelta(days=1)).date())
    day_after = get_daily_forecast(city, (current_time + timedelta(days=2)).date())
    tomorrow["frost_tonight"] = tomorrow["temp_min"] <= 2.0
    tomorrow["frost_tomorrow_night"] = day_after["temp_min"] <= 2.0
    tomorrow["tomorrow_night_min"] = day_after["temp_min"]
    return tomorrow

def evaluate_system_logic(current_time):
    city = system_state["city"]
    current_field = system_state["current_field"]
    field_size = system_state["field_sizes"].get(current_field, 50)
    weather = get_weather_data(city, current_time)
    
    # Fertigasyon & Evapotranspirasyon
    next_day_weather = get_weather_data(city, current_time + timedelta(days=1))
    fertigation_locked = weather["is_raining"] or next_day_weather["is_raining"]
    hour = current_time.hour
    if 6 <= hour < 17: tariff_name, tariff_cost, tariff_color = "Gündüz", 2.5, "warning"
    elif 17 <= hour < 22: tariff_name, tariff_cost, tariff_color = "Puant", 4.0, "danger"
    else: tariff_name, tariff_cost, tariff_color = "Gece", 1.5, "success"
    is_daytime = 10 <= hour <= 17
    evapotranspiration_risk = weather["temp"] > 25.0 and not weather["is_raining"] and is_daytime

    # Pompa Otonom
    frost_risk = weather["temp"] <= 2.0
    irrigation_needed = weather["soil_moisture"] < 40 and not weather["is_raining"]
    pump_status, decision_reason, action_type = "KAPALI", "Sistem beklemede.", "standby"

    if frost_risk:
        pump_status, decision_reason, action_type = "AÇIK", "ZİRAİ DON TEHLİKESİ! Sistem devrede.", "frost_alert"
    elif irrigation_needed:
        if evapotranspiration_risk:
            pump_status, decision_reason, action_type = "KAPALI", "Evapotranspirasyon Riski! Sulama geceye ertelendi.", "et_save"
        elif tariff_name == "Puant":
            pump_status, decision_reason, action_type = "KAPALI", "Puant tarifesi nedeniyle sulama ertelendi.", "energy_save"
        elif tariff_name == "Gece":
            pump_status, decision_reason, action_type = "AÇIK", "Gece tarifesi devrede. Optimum sulama yapılıyor.", "irrigation_optimal"
        else:
            pump_status, decision_reason, action_type = "AÇIK", "Toprak nemi kritik. Mecburi sulama yapılıyor.", "irrigation_day"

    if system_state["pump_mode"] == "on":
        pump_status, decision_reason, action_type = "AÇIK (MANUEL)", "KULLANICI MÜDAHALESİ: Sondaj manuel açıldı.", "manual_override"
    elif system_state["pump_mode"] == "off":
        pump_status, decision_reason, action_type = "KAPALI (MANUEL)", "KULLANICI MÜDAHALESİ: Sondaj manuel kapatıldı.", "manual_override"

    mildew_risk = any(get_weather_data(city, current_time + timedelta(days=i))["humidity"] > 75 and 15 <= get_weather_data(city, current_time + timedelta(days=i))["temp"] <= 25 for i in range(1, 4))

    # Ajanda Olayları
    cal = calendar.Calendar(firstweekday=0)
    month_days = []
    if current_field not in system_state["events"]: system_state["events"][current_field] = {}
    field_events = system_state["events"][current_field]
    for d in cal.itermonthdates(current_time.year, current_time.month):
        w_noon = get_weather_data(city, datetime(d.year, d.month, d.day, 12, 0))
        date_str = d.strftime("%Y-%m-%d")
        month_days.append({
            "date": date_str, "day_num": d.day, "is_current_month": d.month == current_time.month, "is_today": d == current_time.date(),
            "temp": w_noon["temp"], "is_raining": w_noon["is_raining"], "soil_moisture": w_noon["soil_moisture"], "events": field_events.get(date_str, [])
        })

    upcoming_events = sorted([{"date_str": date_str, "date_obj": datetime.strptime(date_str, "%Y-%m-%d").date(), "event_name": e} 
         for date_str, ev_list in field_events.items() for e in ev_list if datetime.strptime(date_str, "%Y-%m-%d").date() >= current_time.date()], key=lambda x: x["date_obj"])
    for ue in upcoming_events: del ue["date_obj"]

    # MUHASEBE VE GRAFİK HESAPLAMALARI
    if current_field not in system_state["accounting"]: system_state["accounting"][current_field] = []
    acc_records = system_state["accounting"][current_field]
    
    total_income = sum(r["amount"] for r in acc_records if r["type"] == "gelir")
    total_expense = sum(r["amount"] for r in acc_records if r["type"] == "gider")
    net_balance = total_income - total_expense

    # YENİ VE GÜVENLİ GİDER DAĞILIMI HESAPLAMASI
    expense_breakdown = {
        "Mazot/Yakıt": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "Mazot/Yakıt"),
        "Gübre": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "Gübre"),
        "Zirai İlaç": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "Zirai İlaç"),
        "Tohum/Fide": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "Tohum/Fide"),
        "İşçilik": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "İşçilik"),
        "Elektrik/Sondaj": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "Elektrik/Sondaj"),
        "Kira": sum(r.get("amount", 0) for r in acc_records if r.get("type") == "gider" and r.get("category") == "Kira"),
    }
    
    # Eski (kategorisi olmayan) verileri veya tanımlı olmayanları "Diğer Giderler"e at
    expense_breakdown["Diğer Giderler"] = sum(
        r.get("amount", 0) for r in acc_records 
        if r.get("type") == "gider" and r.get("category") not in expense_breakdown.keys()
    )
    
    per_decare_expense = total_expense / field_size if field_size > 0 else 0
    per_decare_income = total_income / field_size if field_size > 0 else 0
    per_decare_profit = net_balance / field_size if field_size > 0 else 0

    return {
        "time_str": current_time.strftime("%Y-%m-%dT%H:%M"), "date_only": current_time.strftime("%Y-%m-%d"),
        "city": city, "current_field": current_field, "fields": system_state["fields"], "field_size": field_size,
        "pump_mode": system_state["pump_mode"], "weather": weather,
        "energy": {"tariff_name": tariff_name, "tariff_cost": tariff_cost, "tariff_color": tariff_color},
        "actuators": {"pump": pump_status, "reason": decision_reason, "action_type": action_type},
        "forecast": {"mildew_risk": mildew_risk, "fertigation_locked": fertigation_locked, "evapotranspiration_risk": evapotranspiration_risk},
        "tomorrow": build_tomorrow_report(city, current_time),
        "calendar_days": month_days, "upcoming_events": upcoming_events,
        "month_name": current_time.strftime("%B %Y"),
        "accounting": {
            "records": sorted(acc_records, key=lambda x: x["date"], reverse=True),
            "total_income": total_income, "total_expense": total_expense, "net_balance": net_balance, "is_profitable": net_balance >= 0,
            "expense_breakdown": expense_breakdown,
            "per_decare_expense": per_decare_expense, "per_decare_income": per_decare_income, "per_decare_profit": per_decare_profit
        }
    }

# --- HAL FİYATLARI ---
# Bülten adları büyük harfle ve çoğu zaman i/ı, ç/c, ş/s ayrımı olmadan yazılıyor; sık görülen kelimeler düzeltilir
HAL_NAME_FIX = {
    "Devecı": "Deveci", "S.marıa": "S.Maria", "Brokolı": "Brokoli", "Cılek": "Çilek", "Denız": "Deniz", "Hındıstan": "Hindistan",
    "Cevızı": "Cevizi", "Incır": "İncir", "Ithal": "İthal", "Starkıng": "Starking", "Anjelıka": "Anjelika", "Calı": "Çalı",
    "Kerevız": "Kereviz", "Kıraz": "Kiraz", "Salıhlı": "Salihli", "Kıvı": "Kivi", "Yerlı": "Yerli", "Nektarın": "Nektarin",
    "Semız": "Semiz", "Vısne": "Vişne", "Şeftalı": "Şeftali", "Bıber": "Biber", "Mandalına": "Mandalina", "Lımon": "Limon",
}

def tr_title(text):
    text = re.sub(r"\s+", " ", (text or "").strip()).replace("I", "ı").replace("İ", "i").lower()
    def cap(word):
        m = re.search(r"[a-zçğıöşü]", word)
        if not m:
            return word
        i = m.start()
        return word[:i] + word[i].replace("i", "İ").replace("ı", "I").upper() + word[i + 1:]
    return " ".join(HAL_NAME_FIX.get(cap(w), cap(w)) for w in text.split(" "))

def load_hal_cache():
    if os.path.exists(HAL_CACHE_FILE):
        try:
            with open(HAL_CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

HAL_CACHE = load_hal_cache()

def fetch_hal_bulletin(day):
    """Bir günün bülteni (normalize edilmiş liste). Bülten yoksa [] döner, ağ hatasında None."""
    date_str = day.strftime("%Y-%m-%d")
    final = day < date.today()  # geçmiş günlerin bülteni değişmez, diske yazılır
    with HAL_LOCK:
        if date_str in HAL_CACHE:
            return HAL_CACHE[date_str]
    try:
        resp = requests.get(HAL_API_URL.format(date_str), timeout=8)
        raw = (resp.json().get("HalFiyatListesi") or []) if resp.status_code == 200 else []
    except Exception:
        return None
    items = [{
        "id": r.get("MalId"), "name": tr_title(r.get("MalAdi")), "type": tr_title(r.get("MalTipAdi")),
        "unit": (r.get("Birim") or "").upper(), "min": r.get("AsgariUcret"), "max": r.get("AzamiUcret"), "avg": r.get("OrtalamaUcret"),
    } for r in raw if r.get("OrtalamaUcret") is not None]
    if final:
        with HAL_LOCK:
            HAL_CACHE[date_str] = items
    return items

def fetch_hal_range(days):
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(fetch_hal_bulletin, days))
    with HAL_LOCK:
        with open(HAL_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(HAL_CACHE, f, ensure_ascii=False)
    return {d.strftime("%Y-%m-%d"): r for d, r in zip(days, results)}

def latest_bulletin_before(ref_day, max_back=10):
    for back in range(max_back + 1):
        day = ref_day - timedelta(days=back)
        items = fetch_hal_bulletin(day)
        if items:
            return day, items
    return None, []

def aggregate_hal(bulletins):
    """{tarih: [ürün]} → ürün bazında ortalama/min/max ve tarih serisi."""
    products = {}
    for date_str in sorted(bulletins):
        for it in bulletins[date_str] or []:
            p = products.setdefault(it["id"], {"id": it["id"], "name": it["name"], "type": it["type"], "unit": it["unit"], "points": []})
            p["points"].append({"date": date_str, "avg": it["avg"], "min": it["min"], "max": it["max"]})
    items = []
    for p in products.values():
        pts = p.pop("points")
        avgs = [x["avg"] for x in pts]
        p.update({"avg": round(sum(avgs) / len(avgs), 2), "min": min(x["min"] for x in pts), "max": max(x["max"] for x in pts),
                  "days": len(pts), "series": [{"date": x["date"], "avg": x["avg"]} for x in pts]})
        head, tail = avgs[:max(1, len(avgs) // 4)], avgs[-max(1, len(avgs) // 4):]
        first, last = sum(head) / len(head), sum(tail) / len(tail)
        p["change_pct"] = round((last - first) / first * 100, 1) if first and len(avgs) > 1 else None
        items.append(p)
    return items

def monthly_series(series):
    months = {}
    for pt in series:
        months.setdefault(pt["date"][:7], []).append(pt["avg"])
    return [{"date": m + "-01", "avg": round(sum(v) / len(v), 2)} for m, v in sorted(months.items())]

# --- ROTALAR ---
@app.route('/')
def index(): return render_template('index.html', data=evaluate_system_logic(system_state["current_time"]))

@app.route('/su-kontrol')
def su_kontrol(): return render_template('su_kontrol.html', data=evaluate_system_logic(system_state["current_time"]))

@app.route('/guc-kontrol')
def guc_kontrol(): return render_template('guc_kontrol.html', data=evaluate_system_logic(system_state["current_time"]))

@app.route('/ajanda')
def ajanda(): return render_template('ajanda.html', data=evaluate_system_logic(system_state["current_time"]))

@app.route('/oneriler')
def oneriler(): return render_template('oneriler.html', data=evaluate_system_logic(system_state["current_time"]))

@app.route('/muhasebe')
def muhasebe(): return render_template('muhasebe.html', data=evaluate_system_logic(system_state["current_time"]))

# --- API UÇ NOKTALARI ---
@app.route('/api/set-state', methods=['POST'])
def api_set_state():
    req = request.get_json()
    if 'time' in req: system_state["current_time"] = datetime.strptime(req['time'], '%Y-%m-%dT%H:%M')
    if 'city' in req: system_state["city"] = req['city']
    if 'field' in req: system_state["current_field"] = req['field']
    return jsonify({"status": "success"})


@app.route('/api/log-electricity', methods=['POST'])
def api_log_electricity():
    # Sistemin anlık aktif tarifesini ve saatini alıyoruz
    current_time = system_state["current_time"]
    hour = current_time.hour
    if 6 <= hour < 17: cost_per_kwh = 2.5
    elif 17 <= hour < 22: cost_per_kwh = 4.0
    else: cost_per_kwh = 1.5

    # Simüle edilmiş sondaj motoru gücü (Örn: 10 kW) ve tahmini çalışma süresi
    pump_power_kw = 15.0  
    hours_run = 2.0       
    total_cost = round(cost_per_kwh * pump_power_kw * hours_run, 2)

    cf = system_state["current_field"]
    if cf not in system_state["accounting"]: system_state["accounting"][cf] = []
    
    # Muhasebeye Otomatik Gider Kaydı
    system_state["accounting"][cf].append({
        "id": str(int(time.time() * 1000)),
        "type": "gider",
        "category": "Elektrik/Sondaj",
        "amount": total_cost,
        "desc": f"Otonom Sulama Motoru (Tarife: {cost_per_kwh} ₺/kWh x {pump_power_kw} kW)",
        "date": current_time.strftime("%Y-%m-%d")
    })
    save_db()
    return jsonify({"status": "success", "cost": total_cost})

@app.route('/api/set-pump', methods=['POST'])
def api_set_pump():
    mode = request.get_json().get('mode')
    if mode in ['auto', 'on', 'off']: system_state["pump_mode"] = mode
    return jsonify({"status": "success"})

@app.route('/api/add-event', methods=['POST'])
def api_add_event():
    req, cf = request.get_json(), system_state["current_field"]
    date_str, event_type = req.get('date'), req.get('event')
    if cf not in system_state["events"]: system_state["events"][cf] = {}
    if date_str not in system_state["events"][cf]: system_state["events"][cf][date_str] = []
    if event_type not in system_state["events"][cf][date_str]:
        system_state["events"][cf][date_str].append(event_type)
        save_db()
    return jsonify({"status": "success"})

@app.route('/api/remove-event', methods=['POST'])
def api_remove_event():
    req, cf = request.get_json(), system_state["current_field"]
    date_str, event_type = req.get('date'), req.get('event')
    if cf in system_state["events"] and date_str in system_state["events"][cf]:
        if event_type in system_state["events"][cf][date_str]:
            system_state["events"][cf][date_str].remove(event_type)
            if not system_state["events"][cf][date_str]: del system_state["events"][cf][date_str]
            save_db()
    return jsonify({"status": "success"})

@app.route('/api/add-acc', methods=['POST'])
def api_add_acc():
    req, cf = request.get_json(), system_state["current_field"]
    if cf not in system_state["accounting"]: system_state["accounting"][cf] = []
    system_state["accounting"][cf].append({
        "id": str(int(time.time() * 1000)),
        "type": req.get("type"), # 'gelir' veya 'gider'
        "category": req.get("category", "Diğer Gelirler/Giderler"),
        "amount": float(req.get("amount", 0)),
        "desc": req.get("desc", ""),
        "date": req.get("date")
    })
    save_db()
    return jsonify({"status": "success"})

@app.route('/api/remove-acc', methods=['POST'])
def api_remove_acc():
    req, cf = request.get_json(), system_state["current_field"]
    rec_id = req.get("id")
    if cf in system_state["accounting"]:
        system_state["accounting"][cf] = [r for r in system_state["accounting"][cf] if r["id"] != rec_id]
        save_db()
    return jsonify({"status": "success"})

@app.route('/api/market-prices', methods=['GET'])
def api_market_prices():
    period = request.args.get('period', 'daily')
    if period not in ('daily', 'monthly', 'yearly'): period = 'daily'
    city = system_state["city"]
    # Simülasyon zamanı ileri alınmış olabilir; bülten ancak bugüne kadar vardır
    ref_day = min(system_state["current_time"].date(), date.today())
    last_day, last_items = latest_bulletin_before(ref_day)
    if not last_day:
        return jsonify({"status": "error", "message": "Hal bülteni alınamadı (son 10 günde bülten yok ya da bağlantı hatası)."}), 503

    if period == 'daily':
        prev_day, prev_items = latest_bulletin_before(last_day - timedelta(days=1))
        prev = {it["id"]: it["avg"] for it in prev_items}
        items = [dict(it, days=1, series=[], change_pct=round((it["avg"] - prev[it["id"]]) / prev[it["id"]] * 100, 1) if prev.get(it["id"]) else None)
                 for it in last_items]
        range_from, compare_to = last_day, prev_day
    elif period == 'monthly':
        days = [last_day - timedelta(days=i) for i in range(29, -1, -1)]
        items = aggregate_hal(fetch_hal_range(days))
        range_from, compare_to = days[0], None
    else:
        # 52 haftalık örnek: son bültenle aynı hafta günü, seri aylık ortalamaya indirgenir
        days = [last_day - timedelta(weeks=i) for i in range(51, -1, -1)]
        items = aggregate_hal(fetch_hal_range(days))
        for it in items:
            it["series"] = monthly_series(it["series"])
        range_from, compare_to = days[0], None

    is_local = tr_title(city) in ("İzmir", "Izmir")
    return jsonify({
        "status": "success", "period": period, "city": city, "source_city": "İzmir", "is_local": is_local, "source": HAL_SOURCE,
        "bulletin_date": last_day.strftime("%Y-%m-%d"), "range_from": range_from.strftime("%Y-%m-%d"),
        "compare_to": compare_to.strftime("%Y-%m-%d") if compare_to else None,
        "items": sorted(items, key=lambda x: x["name"]),
    })

@app.route('/api/live-data', methods=['GET'])
def api_live_data(): return jsonify(evaluate_system_logic(system_state["current_time"]))

if __name__ == '__main__': app.run(debug=True, host='0.0.0.0', port=5000)