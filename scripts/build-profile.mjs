// build-profile.mjs: renders the profile README from scripts/profile-data.json in the
// header format of the project READMEs (logo, tagline, subtitle, a flat-square badge row
// and a for-the-badge button row), then a two-column project grid, closed details for
// career, education and stack, the open-source groups, the activity cards and the views
// badge. The stack row strips come from scripts/build-skill-tiles.mjs; this script only
// points at them. Button icons come from lucide-static, pinned in package.json at the
// README kit's version and encoded the way the kit encodes them.
// Run: npm run build (writes README.md). npm run check compares README.md with renderReadme().
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pxWidth } from "./skill-geometry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "mertkayacs";
// Links to these sites (and their subdomains) carry the README UTM tags.
const OWN_SITES = ["mertkayacs.com", "eschatialabs.com"];

export function loadData() {
  return JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));
}

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Python's urllib.parse.quote(value, safe=""), so badge URLs match the README kit's output.
function quote(value) {
  return Array.from(new TextEncoder().encode(String(value)), (byte) => {
    const char = String.fromCharCode(byte);
    return /[A-Za-z0-9_.~-]/.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }).join("");
}

// Shields static-badge text: a dash is written as two dashes, an underscore as two underscores.
function shieldText(value) {
  return quote(String(value).replace(/-/g, "--").replace(/_/g, "__"));
}

function hex(color) {
  return color.replace(/^#/, "");
}

function withUtm(href, campaign, slot) {
  const url = new URL(href);
  const host = url.hostname.toLowerCase();
  if (!OWN_SITES.some((site) => host === site || host.endsWith(`.${site}`))) return href;
  const tags = [["utm_source", "github"], ["utm_medium", "readme"], ["utm_campaign", campaign], ["utm_content", slot]];
  for (const [key, value] of tags) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

// A Lucide icon as a white 24 by 24 outline, base64-encoded into a data URI for Shields' logo= value.
function lucideLogo(name) {
  const source = readFileSync(join(root, "node_modules/lucide-static/icons", `${name}.svg`), "utf8");
  const children = [...source.matchAll(/<(path|circle|ellipse|line|polyline|polygon|rect)\b([^>]*?)\s*\/>/g)].map(
    ([, tag, attrs]) => `<${tag} ${[...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => `${key}="${value}"`).join(" ")}/>`,
  );
  if (!children.length) throw new Error(`Lucide icon ${name} has no shapes`);
  const shared = 'fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"';
  const body = children.length === 1 ? children[0].replace(/^<([a-z]+) /, `<$1 ${shared} `) : `<g ${shared}>${children.join("")}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${body}</svg>`;
  return quote(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

function staticBadge(badge, color) {
  const text = badge.message ? `${shieldText(badge.label)}-${shieldText(badge.message)}` : shieldText(badge.label);
  const logo = badge.logo ? `&logo=${badge.logo}&logoColor=white` : "";
  return `https://img.shields.io/badge/${text}-${hex(color)}?style=flat-square${logo}`;
}

function starsBadge(path, color) {
  return `https://img.shields.io/github/stars/${path}?style=flat-square&logo=github&color=${hex(color)}`;
}

// URLs go into attributes as they are, like the README kit writes them (no quotes or spaces in them).
function linkedImage(href, alt, src) {
  return `<a href="${href}"><img alt="${escapeAttr(alt)}" src="${src}"></a>`;
}

// Inline copy: plain strings, or { link, text, slot } tokens for links.
function inlineHtml(tokens, campaign) {
  return tokens
    .map((token) => (typeof token === "string"
      ? escapeText(token)
      : `<a href="${withUtm(token.link, campaign, token.slot)}">${escapeText(token.text)}</a>`))
    .join("");
}

function inlineMarkdown(tokens, campaign) {
  return tokens
    .map((token) => (typeof token === "string" ? token : `[${token.text}](${withUtm(token.link, campaign, token.slot)})`))
    .join("");
}

function picture(darkSrc, lightSrc, alt, width) {
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${darkSrc}"><img alt="${escapeAttr(alt)}" src="${lightSrc}" width="${width}"></picture>`;
}

function header(r, campaign) {
  const badges = r.badges.map((badge) => {
    const src = badge.stars ? starsBadge(badge.stars, r.colors.stars) : staticBadge(badge, badge.color ?? r.colors.accent);
    return `  ${linkedImage(withUtm(badge.link, campaign, badge.slot ?? "readme-link"), badge.alt, src)}`;
  });
  const ctas = r.ctas.map((cta) => {
    const color = hex(cta.primary ? r.colors.accent : r.colors.ink);
    const src = `https://img.shields.io/badge/${shieldText(cta.label)}-${color}?style=for-the-badge&logo=${lucideLogo(cta.icon)}&logoColor=white`;
    return `  ${linkedImage(withUtm(cta.link, campaign, cta.slot ?? "readme-link"), cta.label, src)}`;
  });
  return `<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${r.logo.dark}">
    <img src="${r.logo.light}" alt="${escapeAttr(r.logo.alt)}" width="${r.logo.width}">
  </picture>
</p>

<h1 align="center">${escapeText(r.tagline)}</h1>

<p align="center">
  ${escapeText(r.subtitle.line)}<br>
  <b>${escapeText(r.subtitle.highlight)}</b>
</p>

<p align="center">
${badges.join("\n")}
</p>

<p align="center">
${ctas.join("\n")}
</p>`;
}

// One card: the project's logo from its own repo (light and dark), one sentence, stars and a
// sourced download figure where there is one.
function projectCard(p, r, campaign) {
  const repoUrl = `https://github.com/${OWNER}/${p.repo}`;
  const raw = (variant) => `https://raw.githubusercontent.com/${OWNER}/${p.repo}/${p.branch}/docs/brand/svg/${p.slug}-logo-on-${variant}.svg`;
  const badges = [`      ${linkedImage(repoUrl, `${p.name} GitHub stars`, starsBadge(`${OWNER}/${p.repo}`, r.colors.stars))}`];
  if (p.downloads) {
    badges.push(`      ${linkedImage(p.downloads.link, p.downloads.alt, staticBadge(p.downloads, r.colors.accent))}`);
  }
  return `    <td width="50%" valign="top">
      <a href="${repoUrl}">${picture(raw("dark"), raw("light"), p.name, p.logoWidth)}</a>
      <p>${inlineHtml(p.text, campaign)}</p>
${badges.join("\n")}
    </td>`;
}

function projectGrid(r, campaign) {
  const rows = [];
  for (let i = 0; i < r.projects.items.length; i += 2) {
    const cards = r.projects.items.slice(i, i + 2).map((p) => projectCard(p, r, campaign));
    rows.push(`  <tr>\n${cards.join("\n")}\n  </tr>`);
  }
  return `<table>\n${rows.join("\n")}\n</table>

<p align="center"><sub>${escapeText(r.projects.note)}</sub></p>`;
}

function details(summary, body) {
  return `<details>\n<summary><b>${summary}</b></summary>\n\n${body}\n\n</details>`;
}

function skillGroupMarkdown(row) {
  const key = row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const alt = row.items.map((item) => item.name).join(", ");
  return `**${row.label}**\n\n${picture(`assets/skills/rows/${key}-dark.svg`, `assets/skills/rows/${key}-light.svg`, alt, pxWidth)}`;
}

// The compact contribution line: linked logo and name, state, kind, the sentence about the
// project, then the evidence links. check-readme.mjs holds these lines to a hash contract.
function contributionLine(item) {
  const img = `<img src="assets/logos/${item.logo}" height="16" alt="" align="absmiddle">`;
  const logo = item.logoDark
    ? `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/logos/${item.logoDark}">${img}</picture>`
    : img;
  const evidence = item.evidence?.length ? ` (${item.evidence.map((e) => `[${e.text}](${e.href})`).join(", ")})` : "";
  return `- <a href="${item.href}">${logo} <b>${item.name}</b></a> · ${item.state} · ${item.kind} · ${item.about}${evidence}`;
}

function activity(a) {
  const contrib = `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${a.contrib.dark}">\n  <img alt="${escapeAttr(a.contrib.alt)}" src="${a.contrib.light}" width="${a.contrib.width}">\n</picture>`;
  const cards = a.cards
    .map((card) => `  <picture>\n    <source media="(prefers-color-scheme: dark)" srcset="${card.dark}">\n    <img alt="${escapeAttr(card.alt)}" src="${card.light}">\n  </picture>`)
    .join("\n");
  return `${contrib}\n\n<p align="center">\n${cards}\n</p>`;
}

function viewsBadge(r, campaign) {
  const query = `view=today-total&style=flat-square&label=views&color=${hex(r.colors.accent)}&labelColor=${hex(r.colors.ink)}`;
  return `[![views](https://hits.sh/github.com/${OWNER}.svg?${query})](${withUtm(r.views.link, campaign, "views-badge")})`;
}

export function renderReadme(data) {
  const r = data.readme;
  const campaign = `${r.repo}-repo`;
  const career = r.career.map((c) => `- ${c.text}`).join("\n");
  const education = r.education.map((e) => `- **${e.title}**, ${e.text}`).join("\n");
  const stack = r.skills.rows.map(skillGroupMarkdown).join("\n\n");
  const also = r.skills.also.length ? `\n\nAlso: ${r.skills.also.join(", ")}.` : "";
  const groups = r.openSource.groups
    .map((group) => details(group.label, group.items.map(contributionLine).join("\n")))
    .join("\n\n");

  return `${header(r, campaign)}

## Projects

${projectGrid(r, campaign)}

## About

${details("Career", career)}

${details("Education and research", education)}

${details("Stack", `${stack}${also}`)}

## Open source Contributions of mine

${groups}

${inlineMarkdown(r.openSource.more, campaign)}

## Activity

${details(r.activity.summary, activity(r.activity))}

${viewsBadge(r, campaign)}
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(join(root, "README.md"), renderReadme(loadData()));
  console.log("wrote README.md");
}
