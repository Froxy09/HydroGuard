import { Platform, ToastAndroid, Alert } from 'react-native';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const DAYS_SHORT_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const pad = (n) => String(n).padStart(2, '0');

// "YYYY-MM-DDTHH:MM" -> yerel Date (saat dilimi kaymasını önlemek için elle ayrıştırılır)
export const parseSimTime = (str) => {
  if (!str) return new Date();
  const [datePart, timePart = '00:00'] = str.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
};

export const formatSimTime = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const formatDateOnly = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateOnly = (str) => {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const isValidDateOnly = (str) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = parseDateOnly(str);
  return formatDateOnly(d) === str;
};

export const humanDateTime = (str) => {
  const d = parseSimTime(str);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const humanDate = (str) => {
  const d = parseDateOnly(str);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}, ${DAYS_SHORT_TR[d.getDay()]}`;
};

export const shortDate = (str) => {
  const d = parseDateOnly(str);
  return { day: d.getDate(), month: MONTHS_TR[d.getMonth()].slice(0, 3), weekday: DAYS_SHORT_TR[d.getDay()] };
};

export const monthTitle = (timeStr) => {
  const d = parseSimTime(timeStr);
  return `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
};

export const addDays = (date, days) => {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
};

export const addHours = (date, hours) => new Date(date.getTime() + hours * 3600 * 1000);

export const addMonths = (date, months) => {
  const d = new Date(date.getFullYear(), date.getMonth() + months, 1, date.getHours(), date.getMinutes());
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), lastDay));
  return d;
};

// Hermes Intl desteğine bağımlı olmadan TR biçiminde para gösterimi: 12.345,67 ₺
export const formatMoney = (value, withSymbol = true) => {
  const num = Number(value) || 0;
  const negative = num < 0;
  const fixed = Math.abs(num).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const out = `${negative ? '-' : ''}${grouped},${decPart}`;
  return withSymbol ? `${out} ₺` : out;
};

export const formatNumber = (value, digits = 1) => {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toFixed(digits).replace('.', ',');
};

// Türkçe büyük/küçük harf (i/İ, ı/I) — Intl yerel ayarına bağımlı olmadan
export const trUpper = (text) => String(text ?? '').replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
export const trLower = (text) => String(text ?? '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();

// Türk alfabesi sırasıyla karşılaştırma (Ç, Ğ, İ, Ö, Ş, Ü kendi yerlerinde)
const TR_ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz';
const trKey = (text) =>
  Array.from(trLower(text), (ch) => {
    const i = TR_ALPHABET.indexOf(ch);
    return String.fromCharCode(i >= 0 ? 0x100 + i : ch.charCodeAt(0));
  }).join('');
export const trCompare = (a, b) => {
  const ka = trKey(a);
  const kb = trKey(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
};

export const showToast = (message) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('AgroGuard AI', message);
  }
};

export { MONTHS_TR };
