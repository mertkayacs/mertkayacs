// build-profile.mjs: renders the profile README from scripts/profile-data.json. The
// stack row strips come from scripts/build-skill-tiles.mjs; this script only points
// at them, one picture per group under a bold label with an explicit width shared by
// every row, so desktop keeps the natural size and phones scale each strip to the
// content column. Career, projects and education are markdown lists, not tables.
// Run: npm run build
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pxWidth } from "./skill-geometry.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "scripts/profile-data.json"), "utf8"));

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function picture(darkSrc, lightSrc, alt, width) {
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${darkSrc}"><img alt="${escapeAttr(alt)}" src="${lightSrc}" width="${width}"></picture>`;
}

function skillGroupMarkdown(row) {
  const key = row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const alt = row.items.map((item) => item.name).join(", ");
  return `**${row.label}**\n\n${picture(`assets/skills/rows/${key}-dark.svg`, `assets/skills/rows/${key}-light.svg`, alt, pxWidth)}`;
}

function openSourceLink(item) {
  const img = item.logoDark
    ? `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/logos/${item.logoDark}"><img src="assets/logos/${item.logo}" height="16" alt="" align="absmiddle"></picture>`
    : `<img src="assets/logos/${item.logo}" height="16" alt="" align="absmiddle">`;
  const title = item.title ? ` title="${escapeAttr(item.title)}"` : "";
  return `<a href="${item.href}"${title}>${img} ${item.name}</a>`;
}

function readme() {
  const r = data.readme;
  const skills = r.skills;
  const stackGroups = skills.rows.map(skillGroupMarkdown).join("\n\n");
  const also = skills.also.length ? `Also: ${skills.also.join(", ")}.\n` : "\n";
  const contrib = r.activity.contrib;
  const contribBlock = `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${contrib.dark}">\n  <img alt="${escapeAttr(contrib.alt)}" src="${contrib.light}" width="${contrib.width}">\n</picture>`;
  const cards = r.activity.cards
    .map((card) => `  <picture>\n    <source media="(prefers-color-scheme: dark)" srcset="${card.dark}">\n    <img alt="${escapeAttr(card.alt)}" src="${card.light}">\n  </picture>`)
    .join("\n");

  const career = r.career.map((c) => `- ${c.text}`).join("\n");
  const projects = r.projects
    .map((p) => `- **[${p.name}](${p.href})**: ${p.text}`)
    .join("\n");
  const education = r.education
    .map((e) => `- **${e.title}**, ${e.text}`)
    .join("\n");
  const merged = r.openSource.merged.map(openSourceLink).join(", ");
  const inProgress = r.openSource.inProgress.map(openSourceLink).join(", ");

  return `${r.intro}

## Career

${career}

## Projects

${projects}

${r.projectsCounts}

## Stack

${stackGroups}

${also}
## Education and research

${education}

## Open source

**Merged:** ${merged}

**In progress:** ${inProgress}

${r.openSource.more}

## Activity

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
