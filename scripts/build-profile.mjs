// build-profile.mjs: renders the wide and narrow profile banners in dark and light variants.
// Dependency-free. Output: assets/banner-*.svg. Run: node scripts/build-profile.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));
const bustData = readFileSync(join(root, "assets/bust-420.png")).toString("base64");
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

const themes = {
  dark: { stage: "#0b0b0f", title: "#f5f5f7", secondary: "#a1a1a6", lightOpacity: ".06" },
  light: { stage: "#f5f5f7", title: "#1d1d1f", secondary: "#6e6e73", lightOpacity: ".03" },
};

function escapeText(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function banner(theme, narrow) {
  const width = narrow ? 600 : 880;
  const height = narrow ? 240 : 200;
  const padding = narrow ? 28 : 40;
  const bustHeight = narrow ? 220 : 200;
  const bustWidth = bustHeight * (306 / 420);
  const bustX = width - bustWidth;
  const bustY = height - bustHeight;
  const nameY = narrow ? 105 : 91;
  const roleY = narrow ? 138 : 124;
  const lightX = narrow ? 520 : 810;
  const lightY = narrow ? 142 : 108;
  const lightScaleX = narrow ? 190 : 260;
  const lightScaleY = narrow ? 155 : 170;

  return `<svg xmlns="&#104;ttp://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeText(`${data.banner.name}, ${data.banner.role}`)}">
  <defs>
    <radialGradient id="bust-light" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${lightX} ${lightY}) scale(${lightScaleX} ${lightScaleY})">
      <stop stop-color="#ffffff" stop-opacity="${theme.lightOpacity}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="16" fill="${theme.stage}"/>
  <rect width="${width}" height="${height}" rx="16" fill="url(#bust-light)"/>
  <image href="data:image/png;base64,${bustData}" x="${bustX}" y="${bustY}" width="${bustWidth}" height="${bustHeight}"/>
  <text x="${padding}" y="${nameY}" font-family="${font}" font-size="46" font-weight="700" letter-spacing="-0.02em" fill="${theme.title}">${escapeText(data.banner.name)}</text>
  <text x="${padding}" y="${roleY}" font-family="${font}" font-size="17" font-weight="400" letter-spacing="0" fill="${theme.secondary}">${escapeText(data.banner.role)}</text>
</svg>
`;
}

for (const [name, theme] of Object.entries(themes)) {
  writeFileSync(join(root, `assets/banner-${name}.svg`), banner(theme, false));
  writeFileSync(join(root, `assets/banner-${name}-narrow.svg`), banner(theme, true));
  console.log(`wrote ${name} banners`);
}
