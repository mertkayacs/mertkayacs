// build-skill-tiles.mjs: builds one self-hosted SVG strip per stack row and theme into
// assets/skills/rows/, so every row scales by the same factor at any width. Geometry
// lives in scripts/skill-geometry.mjs. Glyphs come from the vendored tandpfun/skill-icons
// files in assets/skills/icons (MIT, see assets/skills/NOTICE.md); the custom tiles are
// drawn from the pinned simple-icons package (CC0) in the same 256-unit tile shape.
// Run: node scripts/build-skill-tiles.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";
import { PER_LINE, STRIDE, unitsWidth, unitsHeight, pxWidth, pxHeight } from "./skill-geometry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));

const TILE_BG = { light: "#F4F2ED", dark: "#242938" };
const LOGO_TARGET = 200;

const SKILL_ICON_FILES = {
  py: ["Python-Dark.svg", "Python-Light.svg"],
  ts: ["TypeScript.svg", "TypeScript.svg"],
  js: ["JavaScript.svg", "JavaScript.svg"],
  java: ["Java-Dark.svg", "Java-Light.svg"],
  go: ["GoLang.svg", "GoLang.svg"],
  cpp: ["CPP.svg", "CPP.svg"],
  cs: ["CS.svg", "CS.svg"],
  dart: ["Dart-Dark.svg", "Dart-Light.svg"],
  php: ["PHP-Dark.svg", "PHP-Light.svg"],
  bash: ["Bash-Dark.svg", "Bash-Light.svg"],
  pytorch: ["PyTorch-Dark.svg", "PyTorch-Light.svg"],
  tensorflow: ["TensorFlow-Dark.svg", "TensorFlow-Light.svg"],
  sklearn: ["ScikitLearn-Dark.svg", "SciKitLearn-Light.svg"],
  opencv: ["OpenCV-Dark.svg", "OpenCV-Light.svg"],
  react: ["React-Dark.svg", "React-Light.svg"],
  nextjs: ["NextJS-Dark.svg", "NextJS-Light.svg"],
  astro: ["Astro.svg", "Astro.svg"],
  vue: ["VueJS-Dark.svg", "VueJS-Light.svg"],
  nodejs: ["NodeJS-Dark.svg", "NodeJS-Light.svg"],
  fastapi: ["FastAPI.svg", "FastAPI.svg"],
  flask: ["Flask-Dark.svg", "Flask-Light.svg"],
  tailwind: ["TailwindCSS-Dark.svg", "TailwindCSS-Light.svg"],
  vite: ["Vite-Dark.svg", "Vite-Light.svg"],
  flutter: ["Flutter-Dark.svg", "Flutter-Light.svg"],
  firebase: ["Firebase-Dark.svg", "Firebase-Light.svg"],
  unity: ["Unity-Dark.svg", "Unity-Light.svg"],
  htmx: ["Htmx-Dark.svg", "Htmx-Light.svg"],
  postgres: ["PostgreSQL-Dark.svg", "PostgreSQL-Light.svg"],
  mysql: ["MySQL-Dark.svg", "MySQL-Light.svg"],
  sqlite: ["SQLite.svg", "SQLite.svg"],
  supabase: ["Supabase-Dark.svg", "Supabase-Light.svg"],
  docker: ["Docker.svg", "Docker.svg"],
  linux: ["Linux-Dark.svg", "Linux-Light.svg"],
  ubuntu: ["Ubuntu-Dark.svg", "Ubuntu-Light.svg"],
  arch: ["Arch-Dark.svg", "Arch-Light.svg"],
  git: ["Git.svg", "Git.svg"],
  githubactions: ["GithubActions-Dark.svg", "GithubActions-Light.svg"],
  cloudflare: ["Cloudflare-Dark.svg", "Cloudflare-Light.svg"],
  azure: ["Azure-Dark.svg", "Azure-Light.svg"],
  nginx: ["Nginx.svg", "Nginx.svg"],
  ansible: ["Ansible.svg", "Ansible.svg"],
  grafana: ["Grafana-Dark.svg", "Grafana-Light.svg"],
  prometheus: ["Prometheus.svg", "Prometheus.svg"],
  arduino: ["Arduino.svg", "Arduino.svg"],
  npm: ["Npm-Dark.svg", "Npm-Light.svg"],
  pnpm: ["Pnpm-Dark.svg", "Pnpm-Light.svg"],
  latex: ["LaTeX-Dark.svg", "LaTeX-Light.svg"],
};

const rowKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function svgInner(text) {
  const open = text.indexOf(">");
  const close = text.lastIndexOf("</svg>");
  if (open < 0 || close < 0) throw new Error("not an svg file");
  return text.slice(open + 1, close).trim();
}

function scopeIds(inner, prefix) {
  return inner
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace(/([a-z:]*href)="#([^"]+)"/g, (_, attr, id) => `${attr}="#${prefix}${id}"`);
}

function glyphCell(item, theme) {
  const files = SKILL_ICON_FILES[item.icon];
  if (!files) throw new Error(`no vendored skill-icons file for id "${item.icon}"`);
  const file = theme === "dark" ? files[0] : files[1];
  const text = readFileSync(join(root, "assets/skills/icons", file), "utf8");
  if (!/viewBox="0 0 256 256"/.test(text)) throw new Error(`${file} is not a 256 tile`);
  return svgInner(text);
}

class Lexer {
  constructor(d) {
    this.s = d;
    this.i = 0;
  }
  skip() {
    while (this.i < this.s.length && /[\s,\t\n\r]/.test(this.s[this.i])) this.i++;
  }
  peekCmd() {
    this.skip();
    const c = this.s[this.i];
    return c !== undefined && /[a-zA-Z]/.test(c) ? c : null;
  }
  readCmd() {
    const c = this.peekCmd();
    if (c === null) throw new Error("expected command");
    this.i++;
    return c;
  }
  readNumber() {
    this.skip();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i));
    if (!m) throw new Error("expected number");
    this.i += m[0].length;
    return parseFloat(m[0]);
  }
  readFlag() {
    this.skip();
    const c = this.s[this.i];
    if (c !== "0" && c !== "1") throw new Error("expected arc flag");
    this.i++;
    return c === "1";
  }
  done() {
    this.skip();
    return this.i >= this.s.length;
  }
}

function pathBounds(d) {
  const lex = new Lexer(d);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };
  const point = (v) => ({ x: v[0], y: v[1] });

  function cubicExtrema(p0, p1, p2, p3) {
    for (const axis of ["x", "y"]) {
      const u = p1[axis] - p0[axis], v = p2[axis] - p1[axis], w = p3[axis] - p2[axis];
      const c0 = u, c1 = 2 * (v - u), c2 = u - 2 * v + w;
      const roots = [];
      if (Math.abs(c2) < 1e-12) {
        if (Math.abs(c1) > 1e-12) roots.push(-c0 / c1);
      } else {
        const disc = c1 * c1 - 4 * c2 * c0;
        if (disc >= 0) {
          const sq = Math.sqrt(disc);
          roots.push((-c1 + sq) / (2 * c2), (-c1 - sq) / (2 * c2));
        }
      }
      for (const t of roots) {
        if (t > 0 && t < 1) {
          const mt = 1 - t;
          add(
            mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
            mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
          );
        }
      }
    }
  }
  function quadExtrema(p0, p1, p2) {
    for (const axis of ["x", "y"]) {
      const den = p0[axis] - 2 * p1[axis] + p2[axis];
      if (Math.abs(den) < 1e-12) continue;
      const t = (p0[axis] - p1[axis]) / den;
      if (t > 0 && t < 1) {
        const mt = 1 - t;
        add(mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y);
      }
    }
  }
  function arcExtrema(from, rx, ry, phiDeg, largeArc, sweep, to) {
    if (rx === 0 || ry === 0) return;
    const phi = (phiDeg * Math.PI) / 180;
    const cos = Math.cos(phi), sin = Math.sin(phi);
    const dx = (from.x - to.x) / 2, dy = (from.y - to.y) / 2;
    const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let co = Math.sqrt(Math.max(0, num / den));
    if (largeArc === sweep) co = -co;
    const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
    const center = { x: cxp * cos - cyp * sin + (from.x + to.x) / 2, y: cxp * sin + cyp * cos + (from.y + to.y) / 2 };
    const angle = (ux, uy, vx, vy) => {
      const dot = ux * vx + uy * vy;
      const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
      let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
      if (ux * vy - uy * vx < 0) a = -a;
      return a;
    };
    const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dTheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
    if (sweep && dTheta < 0) dTheta += 2 * Math.PI;
    const inArc = (t) => {
      let rel = (t - theta1) % (2 * Math.PI);
      if (rel < 0) rel += 2 * Math.PI;
      if (dTheta >= 0) return rel <= dTheta || 2 * Math.PI - rel <= 1e-9;
      return rel >= dTheta + 2 * Math.PI || rel <= 1e-9;
    };
    const evalP = (theta) => {
      const c = Math.cos(theta), s = Math.sin(theta);
      add(center.x + rx * c * cos - ry * s * sin, center.y + rx * c * sin + ry * s * cos);
    };
    const A = rx * cos, B = -ry * sin;
    const C = rx * sin, D = ry * cos;
    for (const base of [Math.atan2(B, A), Math.atan2(D, C)]) {
      for (const t of [base, base + Math.PI, base + 2 * Math.PI]) {
        if (inArc(t)) evalP(t);
      }
    }
  }

  let x = 0, y = 0, sx = 0, sy = 0;
  let cmd = null, prevCmd = null;
  let cpx = null, cpy = null, qpx = null, qpy = null;
  while (!lex.done() || cmd !== null) {
    const peeked = lex.peekCmd();
    if (peeked !== null) {
      cmd = lex.readCmd();
    } else if (cmd === null) {
      throw new Error("path data before any command");
    }
    const C = cmd.toUpperCase();
    const rel = cmd === cmd.toLowerCase();
    const more = () => !lex.done() && lex.peekCmd() === null;

    if (C === "M") {
      do {
        let nx = lex.readNumber(), ny = lex.readNumber();
        if (rel) { nx += x; ny += y; }
        x = nx; y = ny; sx = x; sy = y; add(x, y);
        if (cmd === "M" || cmd === "m") cmd = rel ? "l" : "L";
      } while (more());
    } else if (C === "L") {
      while (more()) {
        let nx = lex.readNumber(), ny = lex.readNumber();
        if (rel) { nx += x; ny += y; }
        x = nx; y = ny; add(x, y);
      }
    } else if (C === "H") {
      while (more()) {
        let nx = lex.readNumber();
        if (rel) nx += x;
        x = nx; add(x, y);
      }
    } else if (C === "V") {
      while (more()) {
        let ny = lex.readNumber();
        if (rel) ny += y;
        y = ny; add(x, y);
      }
    } else if (C === "C" || C === "S") {
      while (more()) {
        let x1, y1;
        if (C === "C") {
          x1 = lex.readNumber(); y1 = lex.readNumber();
          if (rel) { x1 += x; y1 += y; }
        } else if (prevCmd && "CScs".includes(prevCmd) && cpx !== null) {
          x1 = 2 * x - cpx; y1 = 2 * y - cpy;
        } else {
          x1 = x; y1 = y;
        }
        let x2 = lex.readNumber(), y2 = lex.readNumber();
        let nx = lex.readNumber(), ny = lex.readNumber();
        if (rel) { x2 += x; y2 += y; nx += x; ny += y; }
        cubicExtrema(point([x, y]), point([x1, y1]), point([x2, y2]), point([nx, ny]));
        add(nx, ny);
        cpx = x2; cpy = y2;
        x = nx; y = ny;
      }
    } else if (C === "Q" || C === "T") {
      while (more()) {
        let x1, y1;
        if (C === "Q") {
          x1 = lex.readNumber(); y1 = lex.readNumber();
          if (rel) { x1 += x; y1 += y; }
        } else if (prevCmd && "QTqt".includes(prevCmd) && qpx !== null) {
          x1 = 2 * x - qpx; y1 = 2 * y - qpy;
        } else {
          x1 = x; y1 = y;
        }
        let nx = lex.readNumber(), ny = lex.readNumber();
        if (rel) { nx += x; ny += y; }
        quadExtrema(point([x, y]), point([x1, y1]), point([nx, ny]));
        add(nx, ny);
        qpx = x1; qpy = y1;
        x = nx; y = ny;
      }
    } else if (C === "A") {
      while (more()) {
        const rx = lex.readNumber(), ry = lex.readNumber(), rot = lex.readNumber();
        const laf = lex.readFlag(), sf = lex.readFlag();
        let nx = lex.readNumber(), ny = lex.readNumber();
        if (rel) { nx += x; ny += y; }
        arcExtrema(point([x, y]), rx, ry, rot, laf, sf, point([nx, ny]));
        add(nx, ny);
        x = nx; y = ny;
      }
    } else if (C === "Z") {
      x = sx; y = sy;
    } else {
      throw new Error(`unsupported path command ${cmd}`);
    }
    prevCmd = cmd;
    if (lex.done()) cmd = null;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
}

const fmt = (n) => String(Math.round(n * 1000) / 1000);

function tileCell(theme, slug) {
  const key = "si" + slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  const icon = simpleIcons[key];
  if (!icon) throw new Error(`simple-icons has no icon for slug "${slug}" (looked for ${key})`);
  const b = pathBounds(icon.path);
  const scale = LOGO_TARGET / Math.max(b.width, b.height);
  const tx = 128 - scale * (b.x + b.width / 2);
  const ty = 128 - scale * (b.y + b.height / 2);
  const tile = TILE_BG[theme];
  const brand = `#${icon.hex}`;
  const fallback = theme === "dark" ? "#fff" : "#000";
  const fill = contrast(brand, tile) >= 3 ? brand : fallback;
  return `<rect width="256" height="256" fill="${tile}" rx="60"/>
<path d="${icon.path}" fill="${fill}" transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(scale)})"/>`;
}

function stripSvg(theme, key, items) {
  const lines = Math.max(1, Math.ceil(items.length / PER_LINE));
  const groups = items
    .map((item, index) => {
      const x = (index % PER_LINE) * STRIDE;
      const y = Math.floor(index / PER_LINE) * STRIDE;
      const cell = item.tile ? tileCell(theme, item.tile) : glyphCell(item, theme);
      const scoped = scopeIds(cell, `${key}i${index}-`);
      return `  <g transform="translate(${x} ${y})">\n    ${scoped}\n  </g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pxWidth}" height="${pxHeight(lines)}" viewBox="0 0 ${unitsWidth} ${unitsHeight(lines)}" fill="none">
${groups}
</svg>
`;
}

mkdirSync(join(root, "assets/skills/rows"), { recursive: true });

const summary = [];
for (const row of data.readme.skills.rows) {
  const key = rowKey(row.label);
  for (const theme of ["dark", "light"]) {
    writeFileSync(join(root, `assets/skills/rows/${key}-${theme}.svg`), stripSvg(theme, key, row.items));
  }
  summary.push(`${row.label}: ${row.items.length} icons, ${Math.max(1, Math.ceil(row.items.length / PER_LINE))} line(s)`);
}

console.log(summary.map((line) => `rows: ${line}`).join("\n"));
console.log(`row width: ${pxWidth} px for every row`);
