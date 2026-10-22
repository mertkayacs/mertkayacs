// build-skill-tiles.mjs: renders custom skill tiles for items skillicons.dev does not have,
// matching the tandpfun/skill-icons look: 256 viewBox, rounded square rx 60, light tile
// #F4F2ED, dark tile #242938, logo centred with its longest side at 200 of 256 units.
// Logos come from the pinned simple-icons package (CC0). Run: node scripts/build-skill-tiles.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));

const TILE = { light: "#F4F2ED", dark: "#242938" };
const LOGO_TARGET = 200;
const GAP = 44;

function iconFor(slug) {
  const key = "si" + slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  const icon = simpleIcons[key];
  if (!icon) throw new Error(`simple-icons has no icon for slug "${slug}" (looked for ${key})`);
  return icon;
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

function tileSvg(theme, slug) {
  const icon = iconFor(slug);
  const b = pathBounds(icon.path);
  const scale = LOGO_TARGET / Math.max(b.width, b.height);
  const tx = 128 - scale * (b.x + b.width / 2);
  const ty = 128 - scale * (b.y + b.height / 2);
  const tile = TILE[theme];
  const brand = `#${icon.hex}`;
  const fallback = theme === "dark" ? "#fff" : "#000";
  const fill = contrast(brand, tile) >= 3 ? brand : fallback;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" fill="none">
<rect width="256" height="256" fill="${tile}" rx="60"/>
<path d="${icon.path}" fill="${fill}" transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(scale)})"/>
</svg>
`;
}

function tileInner(theme, slug) {
  return tileSvg(theme, slug).replace(/^<svg[^>]*>\n/, "").replace(/<\/svg>\n$/, "");
}

function stripSvg(theme, rowKey, slugs) {
  const lead = GAP;
  const width = lead + slugs.length * 256 + (slugs.length - 1) * GAP;
  const scale = 48 / 256;
  const groups = slugs
    .map((slug, idx) => {
      const x = lead + idx * (256 + GAP);
      return `    <g transform="translate(${x},0)">\n      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" fill="none">\n  ${tileInner(theme, slug)}      </svg>\n    </g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width * scale)}" height="48" viewBox="0 0 ${width} 256" fill="none">
${groups}
</svg>
`;
}

const rowKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

mkdirSync(join(root, "assets/skills"), { recursive: true });

const summary = [];
for (const row of data.readme.skills.rows) {
  const tiles = row.items.filter((item) => item.tile);
  if (!tiles.length) continue;
  const slugs = tiles.map((item) => {
    iconFor(item.tile);
    return item.tile;
  });
  for (const slug of slugs) {
    for (const theme of ["dark", "light"]) {
      writeFileSync(join(root, `assets/skills/${slug}-${theme}.svg`), tileSvg(theme, slug));
    }
  }
  const key = rowKey(row.label);
  for (const theme of ["dark", "light"]) {
    writeFileSync(join(root, `assets/skills/strip-${key}-${theme}.svg`), stripSvg(theme, key, slugs));
  }
  summary.push(`${row.label}: ${slugs.join(", ")}`);
}

console.log(summary.map((line) => `tiles: ${line}`).join("\n"));
