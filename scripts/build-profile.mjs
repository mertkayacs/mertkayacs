// build-profile.mjs: renders README SVG assets (banner, open-source cards,
// projects row) in dark and light variants from scripts/profile-data.json.
// Dependency-free. Output: assets/*.svg. Run: node scripts/build-profile.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));
mkdirSync(join(root, "assets"), { recursive: true });
const bustData = readFileSync(join(root, "assets/bust-420.png")).toString("base64");

const W = 880;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// rough system-ui width estimate, used only to shrink long lines
const estW = (s, px) => s.length * px * 0.53;
const fitPx = (s, px, max) => { let p = px; while (estW(s, p) > max && p > 10) p -= 0.5; return p; };

const THEMES = {
  dark: {
    suffix: "dark",
    stage1: "#0b0b0f", stage2: "#141418", stage3: "#1d1d22", stageBorder: "#26262c",
    card: "#141418", cardBorder: "#2d2d33",
    title: "#f5f5f7", desc: "#b8b8c0", muted: "#898992", stat: "#a7a7b0",
    merged: "#f3c7a0", open: "#b98aa8", landed: "#b7a5ec",
    glow1: "#b98aa8", glow2: "#f3c7a0", bannerTitle: "#f5f5f7", bannerDesc: "#b8b8c0", bannerGlowOpacity: ".16",
  },
  light: {
    suffix: "light",
    stage1: "#f5f5f7", stage2: "#ededf0", stage3: "#e5e5e9", stageBorder: "#d8d8dd",
    card: "#fbfbfc", cardBorder: "#dedee3",
    title: "#1d1d22", desc: "#4f4f57", muted: "#777780", stat: "#686870",
    merged: "#a05a24", open: "#8a5470", landed: "#6a55a8",
    glow1: "#b98aa8", glow2: "#f3c7a0", bannerTitle: "#16161a", bannerDesc: "#55555d", bannerGlowOpacity: ".09",
  },
};

function svgDoc(w, h, label, body) {
  return `<svg xmlns="&#104;ttp://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${esc(label)}">
${body}</svg>
`;
}

function banner(t) {
  const body = `
<defs>
  <clipPath id="frame-${t.suffix}"><rect width="${W}" height="300" rx="18"/></clipPath>
  <radialGradient id="bust-light-${t.suffix}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(716 146) scale(248 220)">
    <stop offset="0" stop-color="${t.glow1}" stop-opacity="${t.bannerGlowOpacity}"/><stop offset=".62" stop-color="${t.glow2}" stop-opacity=".04"/><stop offset="1" stop-color="${t.glow2}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="sweep-${t.suffix}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".11"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <image id="bust-${t.suffix}" href="data:image/png;base64,${bustData}" x="562" y="3" width="306" height="420"/>
  <mask id="bust-mask-${t.suffix}" x="0" y="0" width="${W}" height="300" maskUnits="userSpaceOnUse" style="mask-type:alpha"><use href="#bust-${t.suffix}"/></mask>
</defs>
<g clip-path="url(#frame-${t.suffix})">
  <rect width="${W}" height="300" fill="${t.stage1}"/>
  <rect width="${W}" height="300" fill="url(#bust-light-${t.suffix})"/>
  <use href="#bust-${t.suffix}"/>
  <g mask="url(#bust-mask-${t.suffix})" transform="rotate(14 716 146)">
    <rect x="450" y="-100" width="76" height="500" fill="url(#sweep-${t.suffix})">
      <animate attributeName="x" values="450;940;940" keyTimes="0;.22;1" dur="9s" repeatCount="indefinite"/>
    </rect>
  </g>
  <text x="56" y="134" font-family="${FONT}" font-size="56" font-weight="700" letter-spacing="-1.4" fill="${t.bannerTitle}">${esc(data.banner.name)}</text>
  <text x="56" y="178" font-family="${FONT}" font-size="18" fill="${t.bannerDesc}">${esc(data.banner.role)}</text>
</g>
<rect x=".5" y=".5" width="879" height="299" rx="17.5" stroke="${t.stageBorder}"/>`;
  return svgDoc(W, 300, `${data.banner.name}, ${data.banner.role}`, body);
}

function pill(p, t, x, y, size = 11.5) {
  const color = t[p.kind] || t.muted;
  const w = Math.round(estW(p.text, size)) + 18;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${t.card}" stroke="${color}" stroke-opacity=".55"/>
<text x="${x + 9}" y="${y + +(size * 1.34).toFixed(1)}" font-family="${FONT}" font-size="${size}" font-weight="600" fill="${color}">${esc(p.text)}</text></g>`;
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

// Narrow single-column variants. 420 px wide so that at a 390 px CSS width,
// common on phones, titles render near 15 px and descriptions near 12 px.
const NW = 420, NM = 20, NGAP = 12, NTITLE = 16.2, NDESC = 12.9, NPILL = 12;
const wrapPx = (s, max, px) => {
  const words = s.split(" "); const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    const cand = (cur + " " + w).trim();
    if (estW(cand, px) > max && cur) lines.push(w);
    else lines[lines.length - 1] = cand;
  }
  return lines;
};

function ossCardsNarrow(t) {
  const cw = NW - NM * 2, ch = 114;
  const rows = data.oss.cards.map((c, i) => {
    const x = NM, y = 14 + i * (ch + NGAP);
    const desc = wrapPx(c.desc, cw - 36, NDESC).map((l, j) =>
      `<text x="${x + 18}" y="${y + 54 + j * 17}" font-family="${FONT}" font-size="${NDESC}" fill="${t.desc}">${esc(l)}</text>`).join("");
    let pillX = x + 18;
    const pills = c.pills.map((p) => { const s = pill(p, t, pillX, y + 78, NPILL); pillX += Math.round(estW(p.text, NPILL)) + 18 + 8; return s; }).join("");
    return `<g><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${t.card}" stroke="${t.cardBorder}"/>
<text x="${x + 18}" y="${y + 30}" font-family="${FONT}" font-size="${NTITLE}" font-weight="650" fill="${t.title}">${esc(c.title)}</text>
${desc}
${pills}</g>`;
  }).join("");
  const tot = data.oss.totals;
  const h = 14 + data.oss.cards.length * ch + (data.oss.cards.length - 1) * NGAP + 76;
  const totals = `
<text x="${NM}" y="${h - 66}" font-family="${FONT}" font-size="13.5" fill="${t.title}">${esc(tot.text_prefix)}</text>
<text x="${NM}" y="${h - 46}" font-family="${FONT}" font-size="13.5" fill="${t.muted}"><tspan fill="${t.merged}" font-weight="650">${esc(tot.merged)}</tspan><tspan fill="${t.muted}">, </tspan><tspan fill="${t.open}" font-weight="650">${esc(tot.open)}</tspan><tspan fill="${t.muted}">, </tspan>${esc(tot.closed)},</text>
<text x="${NM}" y="${h - 26}" font-family="${FONT}" font-size="13.5" fill="${t.muted}">as of ${data.as_of}.</text>`;
  return svgDoc(NW, h, `Open source contributions: ${tot.text_prefix} ${tot.merged}, ${tot.open}, ${tot.closed}, as of ${data.as_of}`, rows + totals);
}

function projectsNarrow(t) {
  const cw = NW - NM * 2, ch = 110;
  const tiles = data.projects.map((p, i) => {
    const x = NM, y = 14 + i * (ch + NGAP);
    const desc = wrapPx(p.desc, cw - 36, NDESC).map((l, j) =>
      `<text x="${x + 18}" y="${y + 54 + j * 17}" font-family="${FONT}" font-size="${NDESC}" fill="${t.desc}">${esc(l)}</text>`).join("");
    const stat = p.stat ? `<text x="${x + 18}" y="${y + ch - 16}" font-family="${FONT}" font-size="12" font-weight="600" fill="${t.merged}">${esc(p.stat)}</text>` : "";
    return `<g><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${t.card}" stroke="${t.cardBorder}"/>
<text x="${x + 18}" y="${y + 30}" font-family="${FONT}" font-size="${NTITLE}" font-weight="650" fill="${t.title}">${esc(p.name)}</text>${desc}${stat}</g>`;
  }).join("");
  const h = 14 + data.projects.length * ch + (data.projects.length - 1) * NGAP + 42;
  const foot = `<text x="${NW - NM}" y="${h - 16}" text-anchor="end" font-family="${FONT}" font-size="11.5" fill="${t.muted}">${esc(data.footnote)}</text>`;
  return svgDoc(NW, h, "Projects: reevesagents, xdfdet, tholos, jevalt, jevoss, ultramod", tiles + foot);
}

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
  writeFileSync(join(root, `assets/oss-${t.suffix}-narrow.svg`), ossCardsNarrow(t));
  writeFileSync(join(root, `assets/projects-${t.suffix}-narrow.svg`), projectsNarrow(t));
  console.log(`wrote ${t.suffix} variants`);
}
