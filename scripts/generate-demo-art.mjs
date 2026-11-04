// Generates DreamCanvas's bundled artwork. Everything here is drawn from code in this
// file, so the images are original and carry no third-party rights (see docs/ASSETS.md).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'demo');
mkdirSync(outDir, { recursive: true });

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const defs = (w, h, stops, extra = '') => `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${Math.round(w / 60)}"/></filter>
<filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${Math.round(w / 200)}"/></filter>
<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${Math.round(w / 26)}"/></filter>
${extra}</defs><rect width="${w}" height="${h}" fill="url(#sky)"/>`;

function ridge(w, h, base, amp, seed, fill, steps = 40) {
  const r = rng(seed);
  const a = 1 + r() * 2;
  const b = 3 + r() * 4;
  const p1 = r() * 6;
  const p2 = r() * 6;
  let d = `M0 ${h}`;
  for (let i = 0; i <= steps; i += 1) {
    const x = (w * i) / steps;
    const t = i / steps;
    const y = base + amp * (Math.sin(t * a * Math.PI * 2 + p1) * 0.6 + Math.sin(t * b * Math.PI * 2 + p2) * 0.28 + (r() - 0.5) * 0.16);
    d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `<path d="${d}L${w} ${h}Z" fill="${fill}"/>`;
}

function palm(x, y, s, c) {
  let frond = '';
  for (const [a, l] of [[-150, 1], [-115, 0.9], [-75, 0.95], [-35, 1.05], [-5, 0.8], [185, 0.8]]) {
    frond += `<path transform="translate(${x + 40 * s} ${y - 430 * s}) rotate(${a}) scale(${s * l})" d="M0 0C90 -50 190 -44 270 26C190 -6 100 2 0 0Z" fill="${c}"/>`;
  }
  return `<path d="M${x - 10 * s} ${y}C${x + 20 * s} ${y - 170 * s} ${x + 6 * s} ${y - 300 * s} ${x + 34 * s} ${y - 432 * s}L${x + 48 * s} ${y - 430 * s}C${x + 30 * s} ${y - 300 * s} ${x + 54 * s} ${y - 170 * s} ${x + 34 * s} ${y}Z" fill="${c}"/>${frond}`;
}

function windows(x, y, w, h, seed, lit, dark) {
  const r = rng(seed);
  let out = '';
  const size = Math.max(10, w / 9);
  for (let yy = y + size; yy < y + h - size; yy += size * 1.7) {
    for (let xx = x + size * 0.8; xx < x + w - size; xx += size * 1.6) {
      out += `<rect x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" width="${size * 0.8}" height="${size}" fill="${r() > 0.58 ? lit : dark}"/>`;
    }
  }
  return out;
}

const scenes = [
  { id: 'beach-sunset', title: 'Beach at sunset', w: 1600, h: 1067, tags: ['travel', 'beach', 'summer', 'sunset', 'ocean', 'tropical', 'holiday', 'palm', 'bali', 'maldives', 'hawaii', 'island', 'vacation', 'warm'], focus: [0.55, 0.45], draw(w, h) {
    let waves = '';
    for (let i = 0; i < 20; i += 1) { const y = h * 0.62 + i * i * 0.95; const op = 0.1 + i * 0.012; waves += `<rect x="${w * 0.5 - (80 + i * 34)}" y="${y}" width="${160 + i * 68}" height="${5 + i * 0.7}" fill="#FFE9A8" opacity="${op + 0.25}"/>`; }
    return defs(w, h, [[0, '#6F4DCE'], [0.32, '#FF72B5'], [0.56, '#FFB36B'], [0.62, '#FFE36F']]) +
      `<circle cx="${w * 0.54}" cy="${h * 0.52}" r="240" fill="#FFF1B8" filter="url(#glow)" opacity=".85"/><circle cx="${w * 0.54}" cy="${h * 0.5}" r="118" fill="#FFF6D6"/>` +
      `<rect y="${h * 0.61}" width="${w}" height="${h * 0.26}" fill="#C85A9E"/><rect y="${h * 0.61}" width="${w}" height="${h * 0.1}" fill="#FF8FA3" opacity=".6"/>${waves}` +
      `<path d="M0 ${h * 0.84}C${w * 0.3} ${h * 0.8} ${w * 0.6} ${h * 0.9} ${w} ${h * 0.84}V${h}H0Z" fill="#3B1E55"/>` + palm(190, h * 0.9, 1.55, '#241B32') + palm(1400, h * 0.92, 1.15, '#241B32');
  } },
  { id: 'turquoise-lagoon', title: 'Lagoon with overwater huts', w: 1600, h: 1067, tags: ['travel', 'lagoon', 'ocean', 'island', 'maldives', 'tropical', 'calm', 'summer', 'water', 'luxury', 'beach', 'peaceful'], focus: [0.6, 0.5], draw(w, h) {
    let huts = '';
    [[0.36, 1], [0.52, 1.12], [0.7, 1.3]].forEach(([p, s]) => { const x = w * p; const y = h * 0.53; huts += `<path d="M${x - 92 * s} ${y}L${x} ${y - 80 * s}L${x + 92 * s} ${y}Z" fill="#8E4B7A"/><rect x="${x - 66 * s}" y="${y}" width="${132 * s}" height="${50 * s}" fill="#FFF6D6"/><rect x="${x - 14 * s}" y="${y + 12 * s}" width="${28 * s}" height="${38 * s}" fill="#6F4DCE"/><path d="M${x - 58 * s} ${y + 50 * s}V${y + 92 * s}M${x + 58 * s} ${y + 50 * s}V${y + 92 * s}" stroke="#3B1E55" stroke-width="${7 * s}"/>`; });
    return defs(w, h, [[0, '#BEDCFF'], [0.42, '#FFE2F0'], [0.5, '#FFF3CF']]) +
      `<rect y="${h * 0.5}" width="${w}" height="${h * 0.5}" fill="#3FC7C0"/><path d="M0 ${h * 0.5}H${w}V${h * 0.62}C${w * 0.6} ${h * 0.56} ${w * 0.3} ${h * 0.66} 0 ${h * 0.6}Z" fill="#8BE8D8"/><path d="M0 ${h * 0.82}C${w * 0.35} ${h * 0.7} ${w * 0.65} ${h * 0.92} ${w} ${h * 0.78}V${h}H0Z" fill="#23A6B5"/><path d="M0 ${h * 0.92}C${w * 0.3} ${h * 0.84} ${w * 0.6} ${h} ${w * 0.8} ${h}H0Z" fill="#FFE9B8"/>` + huts +
      `<ellipse cx="${w * 0.2}" cy="${h * 0.19}" rx="170" ry="48" fill="#fff" opacity=".85" filter="url(#blur)"/><ellipse cx="${w * 0.72}" cy="${h * 0.12}" rx="130" ry="34" fill="#fff" opacity=".8" filter="url(#blur)"/>`;
  } },
  { id: 'mountain-dawn', title: 'Mountain ridges at dawn', w: 1600, h: 1067, tags: ['travel', 'mountain', 'adventure', 'hiking', 'nature', 'dawn', 'calm', 'alps', 'outdoors', 'peaceful', 'landscape'], focus: [0.5, 0.42], draw(w, h) {
    return defs(w, h, [[0, '#FFE36F'], [0.3, '#FFB9D1'], [0.65, '#BEA4FF']]) + `<circle cx="${w * 0.68}" cy="${h * 0.3}" r="110" fill="#FFF6D6"/><circle cx="${w * 0.68}" cy="${h * 0.3}" r="220" fill="#FFF1B8" filter="url(#glow)" opacity=".7"/>` +
      ridge(w, h, h * 0.45, 90, 3, '#C9B4FF') + ridge(w, h, h * 0.56, 90, 8, '#A07CF0') + ridge(w, h, h * 0.68, 80, 21, '#6F4DCE') + ridge(w, h, h * 0.82, 60, 34, '#3B2A6B');
  } },
  { id: 'desert-road', title: 'Open desert road', w: 1067, h: 1600, tags: ['travel', 'road', 'freedom', 'journey', 'adventure', 'desert', 'trip', 'open road', 'independence'], focus: [0.5, 0.5], draw(w, h) {
    let dashes = '';
    for (let i = 0; i < 9; i += 1) { const t = i / 9; const y = h * (0.56 + 0.42 * t * t); const ww = 3 + t * 16; const hh = 12 + t * 66; dashes += `<rect x="${w / 2 - ww / 2}" y="${y}" width="${ww}" height="${hh}" fill="#FFE36F"/>`; }
    return defs(w, h, [[0, '#FF72B5'], [0.32, '#FFA36B'], [0.56, '#FFE36F']]) +
      `<circle cx="${w * 0.5}" cy="${h * 0.42}" r="120" fill="#FFF6D6"/><path d="M0 ${h * 0.56}L${w * 0.08} ${h * 0.42}H${w * 0.22}L${w * 0.28} ${h * 0.56}Z" fill="#B0416F"/><path d="M${w * 0.68} ${h * 0.56}L${w * 0.74} ${h * 0.37}H${w * 0.9}L${w} ${h * 0.5}V${h * 0.56}Z" fill="#8E2A66"/><rect y="${h * 0.555}" width="${w}" height="${h * 0.45}" fill="#E8795B"/><path d="M${w * 0.47} ${h * 0.555}H${w * 0.53}L${w * 1.05} ${h}H${-w * 0.05}Z" fill="#3B2A44"/>${dashes}`;
  } },
  { id: 'balloon-sky', title: 'Hot air balloons', w: 1200, h: 1200, tags: ['travel', 'balloon', 'dream', 'sky', 'adventure', 'turkey', 'cappadocia', 'freedom', 'wonder', 'sunrise'], focus: [0.5, 0.42], draw(w, h) {
    const balloon = (x, y, s, a, b) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -120C80 -120 124 -64 124 -8C124 50 44 92 22 128H-22C-44 92 -124 50 -124 -8C-124 -64 -80 -120 0 -120Z" fill="${a}"/><path d="M0 -120C34 -120 52 -64 52 -8C52 50 18 92 9 128H-9C-18 92 -52 50 -52 -8C-52 -64 -34 -120 0 -120Z" fill="${b}"/><rect x="-18" y="142" width="36" height="28" fill="#3B2A44"/><path d="M-22 128L-16 142M22 128L16 142" stroke="#3B2A44" stroke-width="4"/></g>`;
    return defs(w, h, [[0, '#BEA4FF'], [0.5, '#FFB9D1'], [1, '#FFE36F']]) + balloon(w * 0.42, h * 0.38, 2, '#FF72B5', '#FFE36F') + balloon(w * 0.8, h * 0.56, 1, '#6F4DCE', '#FFB9D1') + balloon(w * 0.14, h * 0.62, 0.72, '#FFE36F', '#FF72B5') + balloon(w * 0.68, h * 0.17, 0.5, '#FFF6D6', '#FF8FA3') + ridge(w, h, h * 0.82, 50, 12, '#8E5AA8') + ridge(w, h, h * 0.92, 40, 5, '#4A2E66');
  } },
  { id: 'white-village', title: 'White village over the sea', w: 1600, h: 1067, tags: ['travel', 'greece', 'santorini', 'europe', 'mediterranean', 'sea', 'city break', 'italy', 'village', 'summer', 'architecture'], focus: [0.42, 0.5], draw(w, h) {
    const r = rng(77);
    let houses = '';
    for (let row = 0; row < 7; row += 1) {
      for (let i = 0; i < 8 - row; i += 1) {
        const hw = 120 + r() * 80; const hh = 88 + r() * 54; const x = -40 + i * 170 + row * 20 + r() * 26; const y = h * 0.46 + row * 92 - hh * 0.15;
        const shade = ['#FFFFFF', '#FFF8EE', '#FFEFF6', '#F4ECFF'][Math.floor(r() * 4)];
        houses += `<rect x="${x}" y="${y}" width="${hw}" height="${hh + 70}" fill="${shade}"/><rect x="${x + hw - 30}" y="${y}" width="30" height="${hh + 70}" fill="#E9D8F2"/><rect x="${x + 26}" y="${y + 26}" width="30" height="44" fill="${r() > 0.5 ? '#6F4DCE' : '#FF72B5'}"/>`;
        if (r() > 0.72) houses += `<path d="M${x + 14} ${y}A${hw / 2 - 14} ${hw / 2 - 14} 0 0 1 ${x + hw - 14} ${y}Z" fill="#5B7BE0"/>`;
      }
    }
    return defs(w, h, [[0, '#7FC4F5'], [0.45, '#D8ECFF']]) + `<rect y="${h * 0.4}" width="${w}" height="${h * 0.6}" fill="#2F7BC8"/><rect y="${h * 0.4}" width="${w}" height="10" fill="#BEDCFF"/><ellipse cx="${w * 0.84}" cy="${h * 0.42}" rx="240" ry="32" fill="#7A6CB0"/>` + `<path d="M0 ${h * 0.5}L${w * 0.72} ${h * 0.56}L${w * 0.84} ${h}H0Z" fill="#E9B98F"/>` + houses;
  } },
  { id: 'city-dusk', title: 'City skyline at dusk', w: 1600, h: 1067, tags: ['career', 'city', 'skyline', 'ambition', 'success', 'business', 'new york', 'urban', 'work', 'future', 'leadership', 'finance'], focus: [0.5, 0.55], draw(w, h) {
    const r = rng(5);
    let far = ''; let near = '';
    for (let x = -20; x < w; x += 92) { const bh = 260 + r() * 330; far += `<rect x="${x}" y="${h - bh - 130}" width="88" height="${bh + 130}" fill="#6B4FB5"/>`; }
    for (let x = -30; x < w; x += 150 + r() * 40) { const bh = 200 + r() * 420; const bw = 120 + r() * 50; near += `<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh}" fill="#2B1E4A"/>` + windows(x, h - bh, bw, bh, Math.floor(x + 400), '#FFE36F', '#3D2C63'); }
    return defs(w, h, [[0, '#2B1E5A'], [0.4, '#7A3FC0'], [0.7, '#FF72B5'], [0.9, '#FFB36B']]) + `<circle cx="${w * 0.3}" cy="${h * 0.62}" r="90" fill="#FFE36F" opacity=".9"/>` + far + near;
  } },
  { id: 'glass-towers', title: 'Looking up at glass towers', w: 1067, h: 1600, tags: ['career', 'architecture', 'skyscraper', 'business', 'office', 'ambition', 'city', 'success', 'building', 'future', 'corporate'], focus: [0.5, 0.35], draw(w, h) {
    const tower = (a, b, c, d, fill, lines) => { let out = `<path d="M${a} ${h}L${b} ${c}L${d} ${c + 40}L${a + 460} ${h}Z" fill="${fill}"/>`; for (let i = 1; i < 12; i += 1) { const t = i / 12; const y = h + (c - h) * t * (2 - t); const x1 = a + (b - a) * t * (2 - t); const x2 = a + 460 + (d - a - 460) * t * (2 - t); out += `<path d="M${x1} ${y}L${x2} ${y}" stroke="${lines}" stroke-width="3" opacity=".6"/>`; } return out; };
    return defs(w, h, [[0, '#FFE2F0'], [0.5, '#BEA4FF'], [1, '#6F4DCE']]) + tower(-420, w * 0.34, 130, w * 0.46, '#8E74E6', '#EADFFF') + tower(620, w * 0.58, 60, w * 0.72, '#FF8CC4', '#FFE2F0') + tower(160, w * 0.48, 280, w * 0.55, '#FFE36F', '#FFF6D6');
  } },
  { id: 'sunlit-desk', title: 'Sunlit desk', w: 1600, h: 1067, tags: ['career', 'desk', 'work', 'office', 'laptop', 'study', 'productivity', 'freelance', 'startup', 'remote', 'writing', 'focus'], focus: [0.5, 0.56], draw(w, h) {
    return defs(w, h, [[0, '#FFE9B8'], [1, '#FFCEDC']]) +
      `<path d="M${w * 0.12} 0H${w * 0.5}L${w * 0.84} ${h * 0.72}H${w * 0.42}Z" fill="#FFF8DF" opacity=".75"/><path d="M${w * 0.3} 0H${w * 0.33}L${w * 0.67} ${h * 0.72}H${w * 0.64}Z" fill="#FFCEDC" opacity=".6"/>` +
      `<rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#7A4B9E"/><rect y="${h * 0.72}" width="${w}" height="14" fill="#A577CC"/>` +
      `<rect x="${w * 0.33}" y="${h * 0.4}" width="${w * 0.34}" height="${h * 0.3}" fill="#241B32"/><rect x="${w * 0.345}" y="${h * 0.42}" width="${w * 0.31}" height="${h * 0.26}" fill="#FFB9D1"/><rect x="${w * 0.36}" y="${h * 0.45}" width="${w * 0.14}" height="16" fill="#6F4DCE"/><rect x="${w * 0.36}" y="${h * 0.49}" width="${w * 0.2}" height="10" fill="#FFF"/><rect x="${w * 0.36}" y="${h * 0.52}" width="${w * 0.17}" height="10" fill="#FFF"/>` +
      `<path d="M${w * 0.29} ${h * 0.74}H${w * 0.71}L${w * 0.67} ${h * 0.7}H${w * 0.33}Z" fill="#3B2A44"/>` +
      `<rect x="${w * 0.78}" y="${h * 0.58}" width="96" height="${h * 0.14}" fill="#FFE36F" stroke="#241B32" stroke-width="5"/><path d="M${w * 0.78 + 96} ${h * 0.61}c46 0 46 60 0 60" fill="none" stroke="#241B32" stroke-width="10"/>` +
      `<rect x="${w * 0.12}" y="${h * 0.6}" width="110" height="${h * 0.12}" fill="#FF72B5"/>` + [[-40, 180], [-14, 240], [16, 210], [44, 160]].map(([a, l]) => `<path transform="translate(${w * 0.12 + 55} ${h * 0.6}) rotate(${a})" d="M0 0C-50 ${-l * 0.4} -30 ${-l * 0.8} 0 ${-l}C30 ${-l * 0.8} 50 ${-l * 0.4} 0 0Z" fill="#2E8F73"/>`).join('');
  } },
  { id: 'corner-office', title: 'Office with a city view', w: 1600, h: 1067, tags: ['career', 'office', 'promotion', 'leadership', 'ceo', 'business', 'success', 'professional', 'job', 'city'], focus: [0.5, 0.5], draw(w, h) {
    const r = rng(9); let city = '';
    for (let x = 80; x < w - 80; x += 80) { const bh = 180 + r() * 300; city += `<rect x="${x}" y="${h * 0.74 - bh}" width="74" height="${bh}" fill="${r() > 0.5 ? '#A58BE8' : '#C4B0F5'}"/>`; }
    return defs(w, h, [[0, '#FFB9D1'], [0.74, '#FFF1B8']]) + city + `<rect y="${h * 0.74}" width="${w}" height="${h * 0.26}" fill="#3B2A5A"/><rect y="0" width="${w}" height="40" fill="#241B32"/>` + [0.02, 0.33, 0.66, 0.97].map((p) => `<rect x="${w * p - 12}" y="0" width="24" height="${h * 0.74}" fill="#241B32"/>`).join('') +
      `<path d="M${w * 0.2} ${h}L${w * 0.27} ${h * 0.8}H${w * 0.73}L${w * 0.8} ${h}Z" fill="#6F4DCE"/><rect x="${w * 0.45}" y="${h * 0.7}" width="${w * 0.1}" height="${h * 0.1}" fill="#FF72B5"/>`;
  } },
  { id: 'library-arches', title: 'Library arches', w: 1067, h: 1600, tags: ['study', 'library', 'university', 'learning', 'books', 'education', 'knowledge', 'exam', 'student', 'degree', 'academic'], focus: [0.5, 0.5], draw(w, h) {
    const r = rng(14); let shelves = ''; const colors = ['#FF72B5', '#FFE36F', '#BEA4FF', '#6F4DCE', '#FFF6D6', '#E8795B'];
    for (let y = h * 0.26; y < h * 0.86; y += 138) { for (let x = w * 0.2; x < w * 0.8;) { const bw = 18 + r() * 28; const bh = 92 + r() * 34; shelves += `<rect x="${x}" y="${y + 126 - bh}" width="${bw}" height="${bh}" fill="${colors[Math.floor(r() * 6)]}"/>`; x += bw + 3; } shelves += `<rect x="${w * 0.18}" y="${y + 126}" width="${w * 0.64}" height="12" fill="#3B2A44"/>`; }
    return defs(w, h, [[0, '#4A2E7A'], [1, '#6F4DCE']]) + `<path d="M${w * 0.16} ${h}V${h * 0.3}A${w * 0.34} ${w * 0.34} 0 0 1 ${w * 0.84} ${h * 0.3}V${h}Z" fill="#2B1E4A"/>` + shelves + `<rect y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="#FFCEDC"/>`;
  } },
  { id: 'book-stack', title: 'Stack of books and a lamp', w: 1200, h: 1200, tags: ['study', 'books', 'reading', 'learning', 'education', 'writing', 'novel', 'language', 'exam', 'student', 'cozy'], focus: [0.5, 0.56], draw(w, h) {
    const book = (y, x, bw, c) => `<rect x="${x}" y="${y}" width="${bw}" height="74" fill="${c}"/><rect x="${x + 22}" y="${y + 16}" width="${bw * 0.34}" height="10" fill="#FFF6D6"/><rect x="${x}" y="${y}" width="${bw}" height="74" fill="none" stroke="#241B32" stroke-width="5"/>`;
    return defs(w, h, [[0, '#FFE2F0'], [1, '#FFB9D1']]) + `<path d="M${w * 0.72} ${h * 0.2}L${w * 0.32} ${h * 0.9}H${w}V${h * 0.4}Z" fill="#FFF3B8" opacity=".85"/><rect y="${h * 0.82}" width="${w}" height="${h * 0.18}" fill="#6F4DCE"/>` +
      book(h * 0.76, 240, 640, '#FF72B5') + book(h * 0.69, 280, 540, '#FFE36F') + book(h * 0.62, 220, 600, '#BEA4FF') + book(h * 0.55, 330, 470, '#FFF6D6') +
      `<path d="M${w * 0.82} ${h * 0.82}V${h * 0.26}L${w * 0.66} ${h * 0.16}" fill="none" stroke="#241B32" stroke-width="16"/><path d="M${w * 0.6} ${h * 0.08}L${w * 0.78} ${h * 0.2}L${w * 0.62} ${h * 0.32}L${w * 0.5} ${h * 0.2}Z" fill="#FFE36F" stroke="#241B32" stroke-width="6"/>`;
  } },
  { id: 'sun-room', title: 'Quiet sun room with a mat', w: 1600, h: 1067, tags: ['wellness', 'yoga', 'calm', 'health', 'self care', 'mindfulness', 'morning', 'balance', 'peace', 'meditation', 'fitness'], focus: [0.55, 0.6], draw(w, h) {
    const leaf = (x, y, a, l, c) => `<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0C-${l * 0.3} -${l * 0.45} -${l * 0.2} -${l * 0.85} 0 -${l}C${l * 0.2} -${l * 0.85} ${l * 0.3} -${l * 0.45} 0 0Z" fill="${c}"/>`;
    return defs(w, h, [[0, '#FFF1E0'], [1, '#FFE2F0']]) + `<rect x="${w * 0.54}" y="${h * 0.08}" width="${w * 0.34}" height="${h * 0.52}" fill="#FFF8C8" stroke="#E7C9D8" stroke-width="16"/><path d="M${w * 0.71} ${h * 0.08}V${h * 0.6}M${w * 0.54} ${h * 0.34}H${w * 0.88}" stroke="#E7C9D8" stroke-width="12"/>` +
      `<rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#E5B9A8"/><path d="M${w * 0.44} ${h * 0.7}H${w * 0.9}L${w} ${h}H${w * 0.5}Z" fill="#FFF3C4" opacity=".7"/><path d="M${w * 0.3} ${h * 0.8}H${w * 0.72}L${w * 0.8} ${h * 0.96}H${w * 0.2}Z" fill="#BEA4FF"/><path d="M${w * 0.3} ${h * 0.8}H${w * 0.72}L${w * 0.722} ${h * 0.815}H${w * 0.292}Z" fill="#6F4DCE"/>` +
      `<path d="M${w * 0.1} ${h * 0.76}H${w * 0.24}L${w * 0.22} ${h * 0.92}H${w * 0.12}Z" fill="#FF72B5"/>` + [[-50, 240], [-24, 300], [0, 330], [26, 280], [52, 220]].map(([a, l]) => leaf(w * 0.17, h * 0.76, a, l, '#3E9C7E')).join('');
  } },
  { id: 'forest-light', title: 'Light through a forest', w: 1067, h: 1600, tags: ['wellness', 'nature', 'forest', 'walk', 'calm', 'green', 'trees', 'peace', 'hiking', 'mental health', 'outdoors'], focus: [0.5, 0.5], draw(w, h) {
    const r = rng(31); let trees = '';
    for (let i = 0; i < 12; i += 1) { const x = r() * w; const tw = 26 + r() * 60; trees += `<rect x="${x}" y="0" width="${tw}" height="${h}" fill="${i % 2 ? '#2F5D57' : '#23483F'}" opacity="${0.55 + r() * 0.45}"/>`; }
    return defs(w, h, [[0, '#FFF3C4'], [0.5, '#9FDDB4'], [1, '#3E9C7E']]) + `<path d="M${w * 0.5} -40L${w * 0.1} ${h}H${w * 0.9}Z" fill="#FFF8D6" opacity=".35"/>` + trees + `<path d="M${w * 0.5} ${h * 0.56}C${w * 0.42} ${h * 0.72} ${w * 0.3} ${h * 0.84} ${w * 0.14} ${h}H${w * 0.86}C${w * 0.7} ${h * 0.84} ${w * 0.6} ${h * 0.72} ${w * 0.54} ${h * 0.56}Z" fill="#FFE2B8"/>`;
  } },
  { id: 'tea-window', title: 'Cup of tea on a windowsill', w: 1200, h: 1200, tags: ['wellness', 'cozy', 'home', 'slow', 'morning', 'tea', 'rest', 'self care', 'comfort', 'autumn', 'quiet'], focus: [0.5, 0.62], draw(w, h) {
    return defs(w, h, [[0, '#FFD9C2'], [1, '#FFB9D1']]) + `<rect x="${w * 0.12}" y="${h * 0.08}" width="${w * 0.76}" height="${h * 0.6}" fill="#BEDCFF" stroke="#FFF" stroke-width="22"/><path d="M${w * 0.5} ${h * 0.08}V${h * 0.68}" stroke="#FFF" stroke-width="18"/><circle cx="${w * 0.7}" cy="${h * 0.26}" r="80" fill="#FFF3C4"/>` + ridge(w, h * 0.68, h * 0.54, 26, 2, '#A7C8E8') +
      `<rect y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="#FFF3E6"/><rect y="${h * 0.68}" width="${w}" height="16" fill="#E5C7B8"/>` +
      `<path d="M${w * 0.34} ${h * 0.6}H${w * 0.64}C${w * 0.64} ${h * 0.78} ${w * 0.58} ${h * 0.82} ${w * 0.49} ${h * 0.82}C${w * 0.4} ${h * 0.82} ${w * 0.34} ${h * 0.78} ${w * 0.34} ${h * 0.6}Z" fill="#FF72B5" stroke="#241B32" stroke-width="6"/><path d="M${w * 0.64} ${h * 0.63}c70 0 70 90 -8 96" fill="none" stroke="#241B32" stroke-width="12"/><path d="M${w * 0.42} ${h * 0.54}c-30 -40 30 -60 0 -106M${w * 0.53} ${h * 0.54}c-30 -40 30 -60 0 -106" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".85"/>`;
  } },
  { id: 'paint-studio', title: 'Painter’s studio', w: 1600, h: 1067, tags: ['creative', 'art', 'painting', 'studio', 'design', 'artist', 'creativity', 'color', 'illustration', 'hobby', 'portfolio'], focus: [0.45, 0.5], draw(w, h) {
    const r = rng(44); let blots = ''; const c = ['#FF72B5', '#FFE36F', '#BEA4FF', '#6F4DCE', '#FF8FA3'];
    for (let i = 0; i < 16; i += 1) blots += `<circle cx="${w * 0.3 + r() * w * 0.3}" cy="${h * 0.16 + r() * h * 0.44}" r="${30 + r() * 80}" fill="${c[i % 5]}" opacity=".8"/>`;
    return defs(w, h, [[0, '#FFF3E6'], [1, '#FFE2F0']]) + `<rect y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#D9A58C"/>` +
      `<path d="M${w * 0.34} ${h}L${w * 0.45} ${h * 0.05}M${w * 0.56} ${h}L${w * 0.45} ${h * 0.05}" stroke="#7A4B3A" stroke-width="18"/><rect x="${w * 0.26}" y="${h * 0.1}" width="${w * 0.38}" height="${h * 0.56}" fill="#FFF"/><clipPath id="cv"><rect x="${w * 0.26}" y="${h * 0.1}" width="${w * 0.38}" height="${h * 0.56}"/></clipPath><g clip-path="url(#cv)" filter="url(#blur)">${blots}</g><rect x="${w * 0.26}" y="${h * 0.1}" width="${w * 0.38}" height="${h * 0.56}" fill="none" stroke="#241B32" stroke-width="7"/><rect x="${w * 0.24}" y="${h * 0.66}" width="${w * 0.42}" height="18" fill="#7A4B3A"/>` +
      `<rect x="${w * 0.76}" y="${h * 0.56}" width="120" height="${h * 0.22}" fill="#BEDCFF" stroke="#241B32" stroke-width="5"/><path d="M${w * 0.79} ${h * 0.56}L${w * 0.76} ${h * 0.28}M${w * 0.81} ${h * 0.56}L${w * 0.83} ${h * 0.26}M${w * 0.83} ${h * 0.56}L${w * 0.88} ${h * 0.32}" stroke="#241B32" stroke-width="9"/>`;
  } },
  { id: 'vinyl-wall', title: 'Pink wall with a record', w: 1067, h: 1600, tags: ['creative', 'music', 'vinyl', 'song', 'band', 'studio', 'retro', 'pink', 'artist', 'concert', 'album'], focus: [0.5, 0.56], draw(w, h) {
    const cx = w * 0.46; const cy = h * 0.58; let rings = '';
    for (let i = 0; i < 14; i += 1) rings += `<circle cx="${cx}" cy="${cy}" r="${180 + i * 14}" fill="none" stroke="#D8DDE6" stroke-width="1.6" opacity=".5"/>`;
    return defs(w, h, [[0, '#FC7785'], [1, '#FF8FA3']]) + `<rect x="${w * 0.68}" width="${w * 0.32}" height="${h}" fill="#FFB9D1"/><circle cx="${cx + 16}" cy="${cy + 22}" r="384" fill="#C93A55" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="384" fill="#F3C5CC"/>${rings}<path d="M${cx} ${cy}L${cx - 120} ${cy - 366}A384 384 0 0 1 ${cx + 120} ${cy - 366}Z" fill="#FFF" opacity=".5"/><path d="M${cx} ${cy}L${cx - 120} ${cy + 366}A384 384 0 0 0 ${cx + 120} ${cy + 366}Z" fill="#FFF" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="132" fill="#FC7785"/><rect x="${cx - 110}" y="${cy - 12}" width="220" height="24" fill="#FFE6EF"/><circle cx="${cx}" cy="${cy}" r="11" fill="#241B32"/>`;
  } },
  { id: 'soft-petals', title: 'Soft pink petals', w: 1200, h: 1200, tags: ['soft', 'flower', 'petals', 'dreamy', 'pastel', 'calm', 'beauty', 'spring', 'wedding', 'love', 'self care', 'gentle'], focus: [0.48, 0.5], draw(w, h) {
    const petal = (a, l, c) => `<path transform="translate(${w * 0.46} ${h * 0.56}) rotate(${a})" d="M0 0C-${l * 0.42} -${l * 0.3} -${l * 0.34} -${l * 0.82} 0 -${l}C${l * 0.34} -${l * 0.82} ${l * 0.42} -${l * 0.3} 0 0Z" fill="${c}"/>`;
    return defs(w, h, [[0, '#F2C594'], [0.5, '#9CC4B4'], [1, '#5F978E']]) + `<g filter="url(#soft)">` + [[-74, 460, '#FF9AAF'], [-30, 520, '#FFB29C'], [18, 500, '#FF8FA3'], [64, 430, '#FFAFA3'], [120, 380, '#F58DA0'], [-120, 360, '#FFC2B5']].map(([a, l, c]) => petal(a, l, c)).join('') + `</g><circle cx="${w * 0.46}" cy="${h * 0.56}" r="70" fill="#FFD28F" filter="url(#blur)"/>`;
  } },
  { id: 'home-window', title: 'Bright apartment', w: 1600, h: 1067, tags: ['lifestyle', 'home', 'apartment', 'house', 'interior', 'independence', 'cozy', 'family', 'moving', 'plants', 'living room'], focus: [0.45, 0.6], draw(w, h) {
    return defs(w, h, [[0, '#FFF3E6'], [1, '#FFE2F0']]) + `<rect x="${w * 0.1}" y="${h * 0.08}" width="${w * 0.4}" height="${h * 0.54}" fill="#BEDCFF" stroke="#FFF" stroke-width="18"/><path d="M${w * 0.3} ${h * 0.08}V${h * 0.62}" stroke="#FFF" stroke-width="14"/><path d="M${w * 0.02} ${h * 0.04}H${w * 0.14}V${h * 0.66}H${w * 0.07}Z" fill="#FF72B5"/><path d="M${w * 0.58} ${h * 0.04}H${w * 0.46}V${h * 0.66}H${w * 0.53}Z" fill="#FF72B5"/>` +
      `<rect x="${w * 0.66}" y="${h * 0.2}" width="${w * 0.12}" height="${h * 0.2}" fill="#FFE36F" stroke="#241B32" stroke-width="6"/><rect x="${w * 0.8}" y="${h * 0.14}" width="${w * 0.09}" height="${h * 0.26}" fill="#BEA4FF" stroke="#241B32" stroke-width="6"/>` +
      `<rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="#D9A58C"/><rect x="${w * 0.56}" y="${h * 0.56}" width="${w * 0.38}" height="${h * 0.26}" fill="#6F4DCE"/><rect x="${w * 0.54}" y="${h * 0.66}" width="${w * 0.42}" height="${h * 0.15}" fill="#8A6AE0"/><rect x="${w * 0.6}" y="${h * 0.6}" width="${w * 0.1}" height="${h * 0.09}" fill="#FFE36F"/><rect x="${w * 0.2}" y="${h * 0.86}" width="${w * 0.4}" height="${h * 0.1}" fill="#FFB9D1"/>`;
  } },
  { id: 'night-camp', title: 'Tent under the stars', w: 1600, h: 1067, tags: ['travel', 'night', 'stars', 'camping', 'adventure', 'nature', 'space', 'freedom', 'outdoors', 'astronomy', 'dream'], focus: [0.5, 0.6], draw(w, h) {
    const r = rng(101); let stars = '';
    for (let i = 0; i < 120; i += 1) stars += `<circle cx="${r() * w}" cy="${r() * h * 0.62}" r="${1 + r() * 3}" fill="#FFF6D6" opacity="${0.5 + r() * 0.5}"/>`;
    return defs(w, h, [[0, '#120C2E'], [0.5, '#3B2478'], [0.8, '#B04FA8']]) + `<path d="M0 ${h * 0.12}C${w * 0.3} ${h * 0.5} ${w * 0.7} ${h * 0.1} ${w} ${h * 0.44}" stroke="#BEA4FF" stroke-width="130" fill="none" opacity=".2" filter="url(#soft)"/>${stars}` + ridge(w, h, h * 0.68, 66, 17, '#3A2262') + ridge(w, h, h * 0.8, 40, 28, '#1E1438') +
      `<path d="M${w * 0.5} ${h * 0.6}L${w * 0.64} ${h * 0.84}H${w * 0.36}Z" fill="#FFE36F"/><path d="M${w * 0.5} ${h * 0.6}L${w * 0.54} ${h * 0.84}H${w * 0.46}Z" fill="#FF8C42"/>`;
  } },
];

const manifest = [];
for (const scene of scenes) {
  const { id, title, w, h, tags, focus } = scene;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${scene.draw(w, h)}</svg>`;
  const base = await sharp(Buffer.from(svg)).removeAlpha().toBuffer();
  const grain = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: 'gaussian', mean: 128, sigma: 26 } } }).png().toBuffer();
  await sharp(base).composite([{ input: grain, blend: 'soft-light' }]).jpeg({ quality: 80, mozjpeg: true }).toFile(join(outDir, `${id}.jpg`));
  manifest.push({ id, title, width: w, height: h, focus: { x: focus[0], y: focus[1] }, tags });
}
writeFileSync(join(root, 'src', 'lib', 'assets', 'demo-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${manifest.length} images in public/demo`);
