import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEmpresaAppearance, appearanceContrast, resolveEmpresaAppearance } from '../services/commerceAppearance.js';
import { createEmpresaPalette, getEmpresaButtonStyle, getEmpresaCardStyle } from '../components/empresa/styles/empresaTheme.js';
// Compara ambos consumidores del contrato publicado dentro de este workspace.
import { appearanceTokens, DEFAULT_APPEARANCE } from '../../comercio-web/src/domain/appearance.js';

const baseTheme = {
  dark: false, roundness: 4,
  fonts: { bodyMedium: { fontFamily: 'System', fontSize: 14 }, titleLarge: { fontFamily: 'System', fontSize: 22 } },
  colors: { primary: '#3f51b5', background: '#ffffff', error: '#b3261e', onError: '#ffffff', elevation: { level0: 'transparent', level1: '#ffffff', level5: '#eeeeee' } },
};

test('sin personalización visual conserva exactamente el tema y la paleta de hoy', () => {
  for (const settings of [null, undefined, {}, DEFAULT_APPEARANCE, { ...DEFAULT_APPEARANCE, headline: 'Texto de bienvenida' }, { primary: 'invalid', design: { cardRadius: -1 }, logo: 'https://example.test/logo.png' }]) {
    assert.equal(applyEmpresaAppearance(baseTheme, settings), baseTheme);
    assert.equal(resolveEmpresaAppearance(settings, false), null);
  }
  assert.equal(createEmpresaPalette(baseTheme).brand, '#673ab7');
  assert.equal(getEmpresaCardStyle(baseTheme), undefined);
});

test('comparte los colores efectivos del escaparate en claro y oscuro, incluso con fondos extremos', () => {
  const cases = [
    { primary: '#24634b', secondary: '#ad632c', background: '#f0f4ef' },
    { primary: '#175b9a', design: { backgroundLight: '#15151e', cardLight: '#fae0e0', headerLight: '#ffffff', footerLight: '#123f39', backgroundDark: '#f9f1ed', cardDark: '#123f39', headerDark: '#ffea00' } },
    ...['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#777777'].map((color) => ({ primary: color, design: { backgroundLight: color, cardLight: color, backgroundDark: color, cardDark: color } })),
  ];
  for (const settings of cases) for (const dark of [false, true]) {
    const mobile = resolveEmpresaAppearance(settings, dark);
    const web = appearanceTokens(settings, dark ? 'dark' : 'light');
    assert.equal(mobile.backgroundColor, web.background);
    assert.equal(mobile.palette.card, web.variables['--brand-card']);
    assert.equal(mobile.header, web.variables['--brand-header']);
    assert.equal(mobile.footer, web.variables['--brand-footer']);
    assert.equal(mobile.primary, web.variables['--brand-card-accent']);
    assert.equal(mobile.dark, web.dark);
    assert.ok(appearanceContrast(mobile.palette.title, mobile.palette.card) >= 4.5);
    assert.ok(appearanceContrast(mobile.palette.copy, mobile.palette.card) >= 4.5);
    assert.ok(appearanceContrast(mobile.primary, mobile.onPrimary) >= 4.5);
    assert.ok(appearanceContrast(mobile.header, mobile.headerText) >= 4.5);
  }
});

test('usa imágenes publicadas seguras y conserva la estructura nativa', () => {
  const image = 'data:image/webp;base64,YWJjZA==';
  const theme = applyEmpresaAppearance(baseTheme, { logo: image, backgroundImage: image, headerImage: image, footerImage: image, cover: image, ordersCover: image, design: { cardSize: 'large', cardGap: 32, heroHeight: 520, cardRadius: 0, cardShadow: 'none', buttonStyle: 'square' } });
  assert.equal(theme.colors.background, 'transparent');
  assert.equal(theme.empresaAppearance.images.footerImage, image);
  assert.equal(theme.empresaAppearance.headerText, '#ffffff');
  assert.equal(getEmpresaCardStyle(theme).borderRadius, 0);
  assert.equal(getEmpresaCardStyle(theme).elevation, 0);
  assert.equal(theme.roundness, 0);
  assert.equal(theme.colors.error, baseTheme.colors.error);
  assert.equal(theme.fonts, baseTheme.fonts);
  assert.equal(theme.empresaAppearance.styles.cardSize, undefined);
  assert.equal(theme.empresaAppearance.styles.heroHeight, undefined);
  for (const bad of ['https://example.test/x.png', 'data:image/svg+xml;base64,PHN2Zy8+', 'javascript:alert(1)', 'data:image/png;base64,' + 'A'.repeat(350000)]) {
    assert.equal(resolveEmpresaAppearance({ backgroundImage: bad }, false), null);
  }
});

test('aplica radios de botones personalizados solo cuando hay una apariencia activa', () => {
  const customizedTheme = (buttonStyle) => applyEmpresaAppearance(baseTheme, { primary: '#24634b', design: { buttonStyle } });

  assert.equal(getEmpresaButtonStyle(baseTheme), undefined);
  assert.deepEqual(getEmpresaButtonStyle(customizedTheme('pill')), { borderRadius: 999 });
  assert.deepEqual(getEmpresaButtonStyle(customizedTheme('rounded')), { borderRadius: 12 });
  assert.deepEqual(getEmpresaButtonStyle(customizedTheme('square')), { borderRadius: 0 });
});

test('actualizar, restaurar y cambiar de empresa no mezcla ajustes ni muta el tema global', () => {
  const snapshot = structuredClone(baseTheme);
  const first = applyEmpresaAppearance(baseTheme, { primary: '#24634b', design: { cardLight: '#fff4ce', font: 'serif' } });
  const second = applyEmpresaAppearance(baseTheme, { primary: '#a34535', design: { cardLight: '#143b35', font: 'mono' } }, 'android');
  assert.notEqual(first.colors.surface, second.colors.surface);
  assert.equal(first.fonts.bodyMedium.fontFamily, 'Georgia');
  assert.equal(second.fonts.bodyMedium.fontFamily, 'monospace');
  assert.equal(first.fonts.bodyMedium.fontSize, baseTheme.fonts.bodyMedium.fontSize);
  assert.equal(applyEmpresaAppearance(baseTheme, DEFAULT_APPEARANCE), baseTheme);
  assert.deepEqual(baseTheme, snapshot);
});
