/**
 * Genera los assets de icono de GymTracker desde una única fuente vectorial.
 *
 * El icono es un monograma "G" cuyo travesaño es la barra de una mancuerna,
 * en lima eléctrico sobre negro (la identidad heredada de la PWA).
 *
 * Uso:  node scripts/generate-icons.mjs
 *
 * Salidas (assets/images/):
 *   icon.png                      1024  icono principal (iOS y genérico)
 *   android-icon-foreground.png   1024  marca sola, dentro de la zona segura
 *   android-icon-background.png   1024  fondo sólido del icono adaptativo
 *   android-icon-monochrome.png   1024  silueta blanca para iconos temáticos
 *   splash-icon.png               1024  marca sobre transparente
 *   favicon.png                     64  web
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BG = '#08080a';
const LIME = '#c8ff2e';
const SIZE = 1024;
const C = SIZE / 2;

const RADIUS = 296;
const STROKE = 116;
const GAP_DEG = 76;

/**
 * La marca. El trazo del círculo arranca a las 3 en punto y avanza en sentido
 * horario; desplazando el patrón medio hueco, el hueco queda centrado a la
 * derecha y forma la boca de la G, por donde entra el travesaño.
 */
const mark = (color) => {
  const circumference = 2 * Math.PI * RADIUS;
  const gap = (circumference * GAP_DEG) / 360;
  const dash = circumference - gap;
  return `
    <circle cx="${C}" cy="${C}" r="${RADIUS}" fill="none" stroke="${color}"
            stroke-width="${STROKE}" stroke-linecap="round"
            stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-gap / 2}"/>
    <rect x="${C - 10}" y="${C - 34}" width="300" height="68" rx="34" fill="${color}"/>`;
};

/**
 * @param {object} opts
 * @param {string|null} opts.background  color de fondo, o null para transparente
 * @param {string} opts.color            color de la marca
 * @param {number} opts.scale            1 = tamaño natural; <1 para la zona segura de Android
 */
const svg = ({ background = null, color = LIME, scale = 1 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${background ? `<rect width="${SIZE}" height="${SIZE}" fill="${background}"/>` : ''}
  <g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">
    ${mark(color)}
  </g>
</svg>`;

// Android recorta el icono adaptativo con formas variables: el contenido debe
// caber en el 66% central. La marca mide 708px de 1024 (69%), así que se
// reduce al 86% para quedar en ~59% y no perder trazo en el recorte circular.
const ANDROID_SAFE_SCALE = 0.86;

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
mkdirSync(outDir, { recursive: true });

const render = async (name, markup, size = SIZE) => {
  await sharp(Buffer.from(markup)).resize(size, size).png().toFile(join(outDir, name));
  console.log(`  ${name}`);
};

console.log('Generando iconos…');
await render('icon.png', svg({ background: BG }));
await render('android-icon-foreground.png', svg({ scale: ANDROID_SAFE_SCALE }));
await render('android-icon-background.png', svg({ background: BG, scale: 0 }));
await render('android-icon-monochrome.png', svg({ color: '#ffffff', scale: ANDROID_SAFE_SCALE }));
await render('splash-icon.png', svg({}));
await render('favicon.png', svg({ background: BG }), 64);
console.log('Listo.');
