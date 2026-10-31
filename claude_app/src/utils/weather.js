import { colors } from '../theme';

export const FROST_THRESHOLD = 2.0;
export const SOIL_CRITICAL = 40;

export const weatherIcon = ({ temp, is_raining }) => {
  if (is_raining) return { name: 'rainy', color: colors.info };
  if (temp <= FROST_THRESHOLD) return { name: 'snow', color: '#a5d8ff' };
  if (temp > 25) return { name: 'sunny', color: colors.warning };
  return { name: 'partly-sunny', color: '#ffd43b' };
};

export const soilColor = (moisture) => {
  if (moisture < SOIL_CRITICAL) return colors.danger;
  if (moisture < 60) return colors.warning;
  return colors.info;
};

// Backend "action_type" -> uyarı kutusu tonu ve ikonu
export const decisionStyle = (actionType) => {
  switch (actionType) {
    case 'frost_alert':
      return { tone: 'danger', icon: 'snow', title: 'ZİRAİ DON KORUMASI' };
    case 'et_save':
      return { tone: 'warning', icon: 'sunny', title: 'BUHARLAŞMA TASARRUFU' };
    case 'energy_save':
      return { tone: 'warning', icon: 'flash', title: 'ENERJİ TASARRUFU' };
    case 'irrigation_optimal':
      return { tone: 'success', icon: 'water', title: 'OPTİMUM SULAMA' };
    case 'irrigation_day':
      return { tone: 'info', icon: 'water', title: 'MECBURİ SULAMA' };
    case 'manual_override':
      return { tone: 'danger', icon: 'hand-left', title: 'MANUEL MÜDAHALE' };
    default:
      return { tone: 'success', icon: 'shield-checkmark', title: 'SİSTEM BEKLEMEDE' };
  }
};

export const pumpIsOn = (pumpStatus) => String(pumpStatus || '').startsWith('AÇIK');
