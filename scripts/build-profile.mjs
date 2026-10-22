// build-profile.mjs: renders README SVG assets (banner, open-source cards,
// projects row) in dark and light variants from scripts/profile-data.json.
// Dependency-free. Output: assets/*.svg. Run: node scripts/build-profile.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));
mkdirSync(join(root, "assets"), { recursive: true });

const W = 880;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// rough system-ui width estimate, used only to shrink long lines
const estW = (s, px) => s.length * px * 0.53;
const fitPx = (s, px, max) => { let p = px; while (estW(s, p) > max && p > 10) p -= 0.5; return p; };

const THEMES = {
  dark: {
    suffix: "dark",
    stage1: "#1a1330", stage2: "#2b2148", stage3: "#43335e", stageBorder: "#403468",
    card: "#1b1530", cardBorder: "#352a55",
    title: "#f2eefb", desc: "#bfb6da", muted: "#8d84ad", stat: "#a79dc6",
    merged: "#f3c7a0", open: "#b98aa8", landed: "#b7a5ec",
    glow1: "#b98aa8", glow2: "#f3c7a0",
  },
  light: {
    suffix: "light",
    stage1: "#1a1330", stage2: "#2b2148", stage3: "#43335e", stageBorder: "#d6cde6",
    card: "#f8f5fd", cardBorder: "#e0d7ef",
    title: "#262040", desc: "#4e4768", muted: "#7a7194", stat: "#6f648e",
    merged: "#a05a24", open: "#8a5470", landed: "#6a55a8",
    glow1: "#b98aa8", glow2: "#f3c7a0",
  },
};

// rounded five-point star path (chibi proportions), centered at cx,cy
function starPath(cx, cy, R, r, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = rot + (i * Math.PI) / 5;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const round = R * 0.28;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const p = pts[i], q = pts[(i + 1) % 10], s = pts[(i + 9) % 10];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const lenS = Math.hypot(p[0] - s[0], p[1] - s[1]);
    const t = Math.min(round / len, 0.45), tS = Math.min(round / lenS, 0.45);
    const inP = [p[0] + (s[0] - p[0]) * tS, p[1] + (s[1] - p[1]) * tS];
    const outP = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    d += (i === 0 ? `M${inP[0].toFixed(1)} ${inP[1].toFixed(1)}` : `L${inP[0].toFixed(1)} ${inP[1].toFixed(1)}`);
    d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${outP[0].toFixed(1)} ${outP[1].toFixed(1)}`;
  }
  return d + "Z";
}
const sparklePath = (cx, cy, r) =>
  `M${cx} ${cy - r}Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy}Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r}Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy}Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;

function svgDoc(w, h, label, body, extraStyle = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${esc(label)}">
<style>@media (prefers-reduced-motion: no-preference){.float{animation:float 7s ease-in-out infinite}.tw{animation:tw 5s ease-in-out infinite}}@keyframes float{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)}}@keyframes tw{0%,100%{opacity:.15}50%{opacity:.75}}.float,.tw{transform-box:fill-box;transform-origin:center}${extraStyle}</style>
${body}</svg>
`;
}

function banner(t) {
  const sparkles = [
    [86, 52, 5, 0], [180, 196, 4, 1.4], [320, 66, 6, 0.8], [468, 150, 4, 2.2],
    [560, 60, 3.5, 1.1], [628, 208, 5, 0.4], [806, 76, 4, 1.8], [760, 216, 3, 2.6],
  ].map(([x, y, r, dl]) => `<path class="tw" style="animation-delay:${dl}s" d="${sparklePath(x, y, r)}" fill="${t.glow2}"/>`).join("");
  const star = `
<g class="float">
  <path d="${starPath(706, 128, 64, 40)}" fill="#f5f1fb" stroke="#16121f" stroke-width="6.5" stroke-linejoin="round"/>
  <circle cx="686" cy="122" r="4.6" fill="#16121f"/>
  <circle cx="726" cy="122" r="4.6" fill="#16121f"/>
  <path d="M696 141Q701 146.5 706 141.5Q711 136.5 716 141.5Q721 146.5 726 140" stroke="#16121f" stroke-width="3.6" stroke-linecap="round" fill="none"/>
</g>`;
  const body = `
<defs>
  <linearGradient id="dusk-${t.suffix}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${t.stage1}"/><stop offset=".52" stop-color="${t.stage2}"/><stop offset="1" stop-color="${t.stage3}"/>
  </linearGradient>
  <radialGradient id="glow-${t.suffix}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(706 218) scale(320 130)">
    <stop offset="0" stop-color="${t.glow1}" stop-opacity=".3"/><stop offset=".55" stop-color="${t.glow2}" stop-opacity=".12"/><stop offset="1" stop-color="${t.glow2}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="260" rx="18" fill="url(#dusk-${t.suffix})" stroke="${t.stageBorder}"/>
<rect width="${W}" height="260" rx="18" fill="url(#glow-${t.suffix})"/>
${sparkles}
${star}
<text x="64" y="148" font-family="${FONT}" font-size="54" font-weight="700" letter-spacing="-1.2" fill="#f7f4fb">${esc(data.banner.name)}</text>
<text x="64" y="188" font-family="${FONT}" font-size="19" fill="#d4caeb">${esc(data.banner.role)}</text>`;
  return svgDoc(W, 260, `${data.banner.name}, ${data.banner.role}`, body);
}

function pill(p, t, x, y) {
  const color = t[p.kind] || t.muted;
  const w = Math.round(estW(p.text, 11.5)) + 18;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${t.card}" stroke="${color}" stroke-opacity=".55"/>
<text x="${x + 9}" y="${y + 15.4}" font-family="${FONT}" font-size="11.5" font-weight="600" fill="${color}">${esc(p.text)}</text></g>`;
}

function ossCards(t) {
  const m = 24, gap = 12, cw = (W - m * 2 - gap) / 2, ch = 104;
  const rows = data.oss.cards.map((c, i) => {
    const x = m + (i % 2) * (cw + gap), y = 14 + Math.floor(i / 2) * (ch + gap);
    const px = fitPx(c.desc, 12.5, cw - 36);
    let pillX = x + 18;
    const pills = c.pills.map((p) => { const s = pill(p, t, pillX, y + 68); pillX += Math.round(estW(p.text, 11.5)) + 18 + 8; return s; }).join("");
    return `<g><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${t.card}" stroke="${t.cardBorder}"/>
<text x="${x + 18}" y="${y + 32}" font-family="${FONT}" font-size="15" font-weight="650" fill="${t.title}">${esc(c.title)}</text>
<text x="${x + 18}" y="${y + 55}" font-family="${FONT}" font-size="${px}" fill="${t.desc}">${esc(c.desc)}</text>
${pills}</g>`;
  }).join("");
  const tot = data.oss.totals;
  const h = 14 + 4 * ch + 3 * gap + 56 + 12;
  const totals = `
<text x="${m}" y="${h - 24}" font-family="${FONT}" font-size="13.5" fill="${t.title}">${esc(tot.text_prefix)}
<tspan fill="${t.merged}" font-weight="650">${esc(tot.merged)}</tspan><tspan fill="${t.muted}">, </tspan><tspan fill="${t.open}" font-weight="650">${esc(tot.open)}</tspan><tspan fill="${t.muted}">, </tspan><tspan fill="${t.muted}">${esc(tot.closed)},</tspan><tspan fill="${t.muted}"> as of ${data.as_of}.</tspan></text>`;
  return svgDoc(W, h, `Open source contributions: ${tot.text_prefix} ${tot.merged}, ${tot.open}, ${tot.closed}, as of ${data.as_of}`, rows + totals);
}

const wrap = (s, max) => {
  const words = s.split(" "); const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length > max && cur) lines.push(w);
    else lines[lines.length - 1] = (cur + " " + w).trim();
  }
  return lines.slice(0, 2);
};

function projects(t) {
  const m = 24, gap = 12, cw = (W - m * 2 - gap * 2) / 3, ch = 112;
  const tiles = data.projects.map((p, i) => {
    const x = m + (i % 3) * (cw + gap), y = 14 + Math.floor(i / 3) * (ch + gap);
    const lines = wrap(p.desc, 41);
    const desc = lines.map((l, j) => `<text x="${x + 16}" y="${y + 56 + j * 15}" font-family="${FONT}" font-size="12" fill="${t.desc}">${esc(l)}</text>`).join("");
    const stat = p.stat ? `<text x="${x + 16}" y="${y + ch - 14}" font-family="${FONT}" font-size="11.5" font-weight="600" fill="${t.merged}">${esc(p.stat)}</text>` : "";
    return `<g><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${t.card}" stroke="${t.cardBorder}"/>
<text x="${x + 16}" y="${y + 33}" font-family="${FONT}" font-size="15" font-weight="650" fill="${t.title}">${esc(p.name)}</text>${desc}${stat}</g>`;
  }).join("");
  const h = 14 + 2 * ch + gap + 34 + 8;
  const foot = `<text x="${W - m}" y="${h - 16}" text-anchor="end" font-family="${FONT}" font-size="11.5" fill="${t.muted}">${esc(data.footnote)}</text>`;
  return svgDoc(W, h, "Projects: reevesagents, xdfdet, tholos, jevalt, jevoss, ultramod", tiles + foot);
}

for (const t of Object.values(THEMES)) {
  writeFileSync(join(root, `assets/banner-${t.suffix}.svg`), banner(t));
  writeFileSync(join(root, `assets/oss-${t.suffix}.svg`), ossCards(t));
  writeFileSync(join(root, `assets/projects-${t.suffix}.svg`), projects(t));
  console.log(`wrote ${t.suffix} variants`);
}
