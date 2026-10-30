// Proyección nativa de COMERCIO_webAppearance. No traslada la estructura del
// escaparate: adapta su identidad visual al tema y a la paleta de empresa.
const DEFAULT_COLORS = { primary: '#6d45d8', secondary: '#f97316', background: '#f7f7f9' };
const COLOR = /^#[\da-f]{6}$/i;
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const IMAGE_KEYS = ['logo', 'cover', 'ordersCover', 'backgroundImage', 'headerImage', 'footerImage'];
const DESIGN_COLORS = ['backgroundLight', 'backgroundDark', 'surfaceLight', 'surfaceDark', 'cardLight', 'cardDark', 'headerLight', 'headerDark', 'footerLight', 'footerDark'];
const STYLE_DEFAULTS = { cardRadius: 16, cardShadow: 'soft', buttonStyle: 'pill', font: 'inter' };
const rgb = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
const mix = (color, target, amount) => `#${rgb(color).map((value, index) => Math.round(value * (1 - amount) + rgb(target)[index] * amount).toString(16).padStart(2, '0')).join('')}`;
const luminance = (hex) => rgb(hex).map((value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
export const appearanceContrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const readable = (color, surface) => {
  const target = appearanceContrast('#000000', surface) >= appearanceContrast('#ffffff', surface) ? '#000000' : '#ffffff';
  let next = color;
  for (let step = 0; step <= 100 && appearanceContrast(next, surface) < 4.5; step += 1) next = mix(color, target, step / 100);
  return next;
};
const ink = (surface) => appearanceContrast('#201d27', surface) >= 4.5 ? '#201d27' : (appearanceContrast('#ffffff', surface) >= 4.5 ? '#ffffff' : '#000000');

export function resolveEmpresaAppearance(settings, isDark) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const design = settings.design && typeof settings.design === 'object' && !Array.isArray(settings.design) ? settings.design : {};
  const colors = Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([key, fallback]) => [key, COLOR.test(settings[key]) ? settings[key] : fallback]));
  const images = Object.fromEntries(IMAGE_KEYS.map((key) => [key, typeof settings[key] === 'string' && settings[key].length <= 350000 && IMAGE.test(settings[key]) ? settings[key] : '']));
  const styles = {
    cardRadius: Number.isInteger(design.cardRadius) && design.cardRadius >= 0 && design.cardRadius <= 32 ? design.cardRadius : 16,
    cardShadow: ['none', 'soft', 'raised'].includes(design.cardShadow) ? design.cardShadow : 'soft',
    buttonStyle: ['pill', 'rounded', 'square'].includes(design.buttonStyle) ? design.buttonStyle : 'pill',
    font: ['inter', 'system', 'serif', 'rounded', 'mono'].includes(design.font) ? design.font : 'inter',
  };
  const modified = Object.entries(colors).some(([key, value]) => value.toLowerCase() !== DEFAULT_COLORS[key])
    || Object.values(images).some(Boolean)
    || DESIGN_COLORS.some((key) => COLOR.test(design[key]))
    || (typeof design.siteName === 'string' && Boolean(design.siteName.trim()))
    || Object.entries(styles).some(([key, value]) => value !== STYLE_DEFAULTS[key]);
  if (!modified) return null;

  const mode = isDark ? 'Dark' : 'Light';
  const chosen = (key) => COLOR.test(design[`${key}${mode}`]) ? design[`${key}${mode}`] : '';
  const customBackground = chosen('background');
  const selectedBackground = customBackground || colors.background;
  const dark = customBackground ? appearanceContrast('#ffffff', selectedBackground) > appearanceContrast('#000000', selectedBackground) : Boolean(isDark);
  const target = dark ? '#0c0c12' : '#ffffff';
  let text = dark ? '#f7f5fc' : '#201d27';
  let muted = dark ? '#bcb8c6' : '#6f6b78';
  let backgroundColor = selectedBackground;
  if (customBackground) {
    text = readable(text, backgroundColor);
    muted = readable(muted, backgroundColor);
  } else {
    for (let step = 0; step <= 100 && ((dark ? luminance(backgroundColor) >= luminance(muted) : luminance(backgroundColor) <= luminance(muted)) || appearanceContrast(backgroundColor, muted) < (dark ? 5.5 : 4.5)); step += 1) backgroundColor = mix(selectedBackground, target, step / 100);
  }
  const safeSurface = (color) => {
    let surface = color;
    for (let step = 0; step <= 100 && (appearanceContrast(surface, muted) < 4.5 || (dark ? luminance(surface) >= luminance(muted) : luminance(surface) <= luminance(muted))); step += 1) surface = mix(color, target, step / 100);
    return surface;
  };
  const paper = safeSurface(chosen('surface') || (dark ? mix(backgroundColor, '#ffffff', 0.045) : '#ffffff'));
  const primary = readable(readable(colors.primary, paper), backgroundColor);
  const secondary = readable(readable(colors.secondary, paper), backgroundColor);
  const card = chosen('card') || paper;
  const cardText = ink(card);
  const cardMuted = readable(muted, card);
  const accent = readable(colors.primary, card);
  const header = images.headerImage ? '#15151e' : chosen('header') || safeSurface(mix(paper, primary, dark ? 0.2 : 0.1));
  const footer = images.footerImage ? '#15151e' : chosen('footer') || safeSurface(mix(paper, secondary, dark ? 0.17 : 0.08));
  return {
    dark, backgroundColor, backgroundText: text, backgroundMuted: muted, images, styles,
    siteName: typeof design.siteName === 'string' ? design.siteName.trim().slice(0, 90) : '',
    primary: accent, secondary: readable(colors.secondary, card),
    onPrimary: ink(accent),
    header, headerText: ink(header), headerMuted: images.headerImage ? '#ffffff' : readable(muted, header),
    footer, footerText: ink(footer),
    palette: {
      backdrop: `${backgroundColor}aa`, background: images.backgroundImage ? 'transparent' : backgroundColor,
      border: mix(card, cardText, 0.14), borderStrong: mix(card, accent, 0.28),
      brand: accent, brandSoft: mix(card, accent, dark ? 0.16 : 0.09), brandStrong: accent,
      card, cardSoft: card, copy: cardMuted, hero: card, icon: accent, input: card,
      menu: card, muted: cardMuted, panel: card, shadowColor: dark ? '#000000' : mix(accent, '#000000', 0.7), title: cardText,
    },
  };
}

export function applyEmpresaAppearance(theme, settings, platform = 'ios') {
  const appearance = resolveEmpresaAppearance(settings, theme.dark);
  if (!appearance) return theme;
  const { palette } = appearance;
  const fontFamily = appearance.styles.font === 'serif' ? (platform === 'ios' ? 'Georgia' : 'serif') : appearance.styles.font === 'mono' ? (platform === 'ios' ? 'Menlo' : 'monospace') : null;
  return {
    ...theme, dark: appearance.dark, empresaAppearance: appearance,
    roundness: appearance.styles.buttonStyle === 'square' ? 0 : appearance.styles.buttonStyle === 'rounded' ? 2 : theme.roundness,
    fonts: fontFamily ? Object.fromEntries(Object.entries(theme.fonts).map(([key, value]) => [key, { ...value, fontFamily }])) : theme.fonts,
    colors: {
      ...theme.colors,
      primary: appearance.primary, onPrimary: appearance.onPrimary,
      primaryContainer: palette.brandSoft, onPrimaryContainer: palette.brandStrong,
      secondary: appearance.secondary, onSecondary: ink(appearance.secondary),
      secondaryContainer: palette.brandSoft, onSecondaryContainer: palette.brandStrong,
      background: palette.background, onBackground: appearance.backgroundText,
      surface: palette.card, onSurface: palette.title, surfaceVariant: palette.cardSoft, onSurfaceVariant: palette.copy,
      surfaceDisabled: palette.brandSoft, onSurfaceDisabled: palette.muted,
      outline: palette.borderStrong, outlineVariant: palette.border,
      inverseSurface: palette.title, inverseOnSurface: palette.card,
      elevation: Object.fromEntries(Object.keys(theme.colors.elevation).map((key) => [key, key === 'level0' ? 'transparent' : palette.card])),
    },
  };
}
