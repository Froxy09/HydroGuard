export const colors = {
  bg: '#121212',
  card: '#1e1e1e',
  cardAlt: '#262626',
  border: '#2e2e2e',
  primary: '#20c997',
  primaryDim: 'rgba(32, 201, 151, 0.15)',
  text: '#f1f3f5',
  textMuted: '#9aa0a6',
  textFaint: '#6c7177',
  success: '#20c997',
  danger: '#ff6b6b',
  dangerDim: 'rgba(255, 107, 107, 0.15)',
  warning: '#fcc419',
  warningDim: 'rgba(252, 196, 25, 0.15)',
  info: '#4dabf7',
  infoDim: 'rgba(77, 171, 247, 0.15)',
};

// Backend "tariff_color" değerlerini (Bootstrap isimleri) uygulama renklerine çevirir
export const toneColor = (tone) => {
  switch (tone) {
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    default:
      return colors.success;
  }
};

export const toneBg = (tone) => {
  switch (tone) {
    case 'danger':
      return colors.dangerDim;
    case 'warning':
      return colors.warningDim;
    case 'info':
      return colors.infoDim;
    default:
      return colors.primaryDim;
  }
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16 };
