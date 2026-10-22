// build-profile.mjs: renders every generated artifact of the profile from scripts/profile-data.json.
// Banners go to assets/banner-*.svg, the profile README to README.md. Dependency-free except for
// the custom skill tiles, which scripts/build-skill-tiles.mjs draws from the pinned simple-icons
// package first. Run: npm run build
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));
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
  const height = narrow ? 180 : 150;
  const padding = narrow ? 28 : 40;
  const nameY = narrow ? 92 : 76;
  const roleY = narrow ? 125 : 109;
  const lightX = narrow ? 520 : 810;
  const lightY = narrow ? 142 : 108;
  const lightScaleX = narrow ? 190 : 260;
  const lightScaleY = narrow ? 155 : 170;

  return `<svg xmlns="&#104;ttp://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${escapeText(`${data.banner.name}, ${data.banner.role}`)}">
  <defs>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${lightX} ${lightY}) scale(${lightScaleX} ${lightScaleY})">
      <stop stop-color="#ffffff" stop-opacity="${theme.lightOpacity}"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="16" fill="${theme.stage}"/>
  <rect width="${width}" height="${height}" rx="16" fill="url(#glow)"/>
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

const SKILL_ICON = 48;
const SKILL_GAP = 44;
const SKILL_BOX = 256;

function picture(darkSrc, lightSrc, alt, width) {
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${darkSrc}"><img alt="${alt}" src="${lightSrc}" width="${width}"></picture>`;
}

function stripSize(count, perline) {
  const lines = Math.ceil(count / perline);
  const unitsWidth = perline * SKILL_BOX + (perline - 1) * SKILL_GAP;
  const unitsHeight = lines * SKILL_BOX + (lines - 1) * SKILL_GAP;
  const px = SKILL_ICON / SKILL_BOX;
  return { width: Math.round(unitsWidth * px), height: Math.round(unitsHeight * px) };
}

function skillRowHtml(row) {
  const withIcon = row.items.filter((item) => item.icon);
  const withTile = row.items.filter((item) => item.tile);
  const parts = [];
  if (withIcon.length) {
    const ids = withIcon.map((item) => item.icon);
    const perline = row.perline ?? ids.length;
    const query = `https://skillicons.dev/icons?i=${ids.join(",")}${perline < ids.length ? `&perline=${perline}` : ""}`;
    const size = stripSize(ids.length, perline);
    parts.push(
      picture(
        `${query.replace(/,/g, "%2C")}&theme=dark`,
        `${query}&theme=light`,
        withIcon.map((item) => item.name).join(", "),
        size.width,
      ),
    );
  }
  if (withTile.length) {
    const key = row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const units = SKILL_GAP + withTile.length * SKILL_BOX + (withTile.length - 1) * SKILL_GAP;
    const width = Math.round((units * SKILL_ICON) / SKILL_BOX);
    parts.push(
      picture(
        `assets/skills/strip-${key}-dark.svg`,
        `assets/skills/strip-${key}-light.svg`,
        withTile.map((item) => item.name).join(", "),
        width,
      ),
    );
  }
  if (!parts.length) throw new Error(`skills row "${row.label}" has no icons`);
  return `  <tr>\n    <td>${row.label}</td>\n    <td>${parts.join("")}</td>\n  </tr>`;
}

function readme() {
  const r = data.readme;
  const skills = r.skills;
  const rows = skills.rows.map(skillRowHtml).join("\n");
  const also = skills.also.length ? `\nAlso: ${skills.also.join(", ")}.\n` : "\n";
  const contrib = r.activity.contrib;
  const contribBlock = `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${contrib.dark}">\n  <img alt="${contrib.alt}" src="${contrib.light}" width="${contrib.width}">\n</picture>`;
  const cards = r.activity.cards
    .map((card) => `  <picture>\n    <source media="(prefers-color-scheme: dark)" srcset="${card.dark}">\n    <img alt="${card.alt}" src="${card.light}">\n  </picture>`)
    .join("\n");

  const projects = r.projects
    .map((p) => `  <tr>\n    <td><a href="${p.href}"><b>${p.name}</b></a></td>\n    <td>${p.text}</td>\n  </tr>`)
    .join("\n");
  const education = r.education
    .map((e) => `  <tr>\n    <td><b>${e.title}</b></td>\n    <td>${e.text}</td>\n  </tr>`)
    .join("\n");

  return `<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="assets/banner-dark-narrow.svg">
  <source media="(max-width: 600px) and (prefers-color-scheme: light)" srcset="assets/banner-light-narrow.svg">
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/banner-light.svg">
  <img alt="${r.bannerAlt}" src="assets/banner-dark.svg" width="${r.bannerWidth}">
</picture>

${r.intro}

## Projects

<table>
${projects}
</table>

${r.projectsCounts}

## Skills

<table>
${rows}
</table>
${also}
${skills.note}

## Education and research

<table>
${education}
</table>

## Open source

${r.openSource.ships}<br>
${r.openSource.review}<br>
${r.openSource.counts}

## GitHub activity

${contribBlock}

<p align="center">
${cards}
</p>

## Elsewhere

${r.elsewhere}
`;
}

writeFileSync(join(root, "README.md"), readme());
console.log("wrote README.md");
