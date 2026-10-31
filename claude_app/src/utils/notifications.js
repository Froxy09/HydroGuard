import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatNumber, humanDate } from './format';
import { FROST_THRESHOLD } from './weather';

// eslint-plugin-import derlenmiş enum'u göremiyor; AndroidImportance çalışma zamanında mevcut
// eslint-disable-next-line import/namespace
const { AndroidImportance } = Notifications;

// Web'de yerel bildirim yok; yalnızca telefonda çalışır
export const notificationsSupported = Platform.OS !== 'web';

const WEATHER_CHANNEL = 'tomorrow-weather';
const FROST_CHANNEL = 'frost-alert';
// Aynı kimlikle gönderildiği için her açılışta yeni bildirim eklenmez, öncekinin yerine geçer
const TOMORROW_NOTIFICATION_ID = 'tomorrow-weather';

// Uygulama ön plandayken de bildirim banner olarak ve bildirim çekmecesinde gösterilir
export function configureNotificationHandler() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Uygulamanın bir bildirime dokunularak açılıp açılmadığı, yanıt temizlenmeden önce bir kez okunur
let launchResponse = null;
export function getLaunchResponse() {
  if (!launchResponse) launchResponse = Notifications.getLastNotificationResponseAsync().catch(() => null);
  return launchResponse;
}

// Bildirime dokununca ilgili ekrana gidilir (don varsa Su & Don, yoksa Ana Ekran)
export function subscribeToNotificationTaps(onOpen) {
  if (!notificationsSupported) return () => {};
  const handle = (response) => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') onOpen(url);
    Notifications.clearLastNotificationResponse();
  };
  let active = true;
  getLaunchResponse().then((response) => {
    if (active) handle(response);
  });
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => {
    active = false;
    sub.remove();
  };
}

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  // Android 13+ izin penceresi en az bir kanal oluşturulmadan açılmaz
  await Notifications.setNotificationChannelAsync(WEATHER_CHANNEL, {
    name: 'Yarının hava durumu',
    description: 'Uygulama açıldığında yarının hava durumu ve gece don bilgisi',
    importance: AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(FROST_CHANNEL, {
    name: 'Zirai don uyarısı',
    description: 'Gece sıcaklığı +2°C altına inecekse yüksek öncelikli uyarı',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#20c997',
  });
}

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const frostText = (min, frost) => `${formatNumber(min)}°C (${frost ? 'DON RİSKİ' : 'don yok'})`;

export function buildTomorrowContent(tomorrow, city, pumpMode) {
  const frost = tomorrow.frost_tonight || tomorrow.frost_tomorrow_night;
  const rain =
    tomorrow.precipitation == null
      ? tomorrow.is_raining ? 'yağış bekleniyor' : 'yağış beklenmiyor'
      : tomorrow.is_raining ? `${formatNumber(tomorrow.precipitation)} mm yağış` : 'yağış yok';

  let title;
  if (tomorrow.frost_tonight) title = `Zirai don uyarısı: bu gece ${formatNumber(tomorrow.temp_min)}°C · ${city}`;
  else if (tomorrow.frost_tomorrow_night) title = `Zirai don uyarısı: yarın gece ${formatNumber(tomorrow.tomorrow_night_min)}°C · ${city}`;
  else title = `Yarın ${city}: ${formatNumber(tomorrow.temp_max)}° / ${formatNumber(tomorrow.temp_min)}°C`;

  const lines = [
    `${humanDate(tomorrow.date)}: ${formatNumber(tomorrow.temp_max)}° / ${formatNumber(tomorrow.temp_min)}°C, ${rain}, nem %${Math.round(tomorrow.humidity)}.`,
    `Bu gece en düşük ${frostText(tomorrow.temp_min, tomorrow.frost_tonight)}, yarın gece ${frostText(tomorrow.tomorrow_night_min, tomorrow.frost_tomorrow_night)}.`,
  ];
  if (frost) {
    lines.push(
      pumpMode === 'off'
        ? `Pompa manuel KAPALI: sıcaklık +${FROST_THRESHOLD}°C altına inince don koruması çalışmaz.`
        : `Pompa otonomda: +${FROST_THRESHOLD}°C altında su ile don koruması otomatik başlar.`
    );
  }

  return { title, body: lines.join(' '), data: { url: frost ? '/su-don' : '/' }, color: frost ? '#ff6b6b' : '#20c997' };
}

// Döner: 'shown' | 'denied' | 'skipped' (web ya da bildirime dokunarak açılış)
export async function notifyTomorrow(tomorrow, city, pumpMode) {
  if (!notificationsSupported || !tomorrow) return 'skipped';
  // Uygulama zaten bu bildirime dokunularak açıldıysa aynı bildirimi tekrar göndermeyiz
  const launchedFrom = await getLaunchResponse();
  if (launchedFrom?.notification?.request?.identifier === TOMORROW_NOTIFICATION_ID) return 'skipped';

  await ensureChannels();
  if (!(await ensurePermission())) return 'denied';

  const frost = tomorrow.frost_tonight || tomorrow.frost_tomorrow_night;
  await Notifications.scheduleNotificationAsync({
    identifier: TOMORROW_NOTIFICATION_ID,
    content: buildTomorrowContent(tomorrow, city, pumpMode),
    trigger: Platform.OS === 'android' ? { channelId: frost ? FROST_CHANNEL : WEATHER_CHANNEL } : null,
  });
  return 'shown';
}
