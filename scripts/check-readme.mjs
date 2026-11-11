import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadData, renderReadme } from "./build-profile.mjs";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

// README.md is generated. A hand edit fails here: change scripts/profile-data.json and run npm run build.
assert.equal(readme, renderReadme(loadData()), "README.md is not the output of scripts/build-profile.mjs. Edit scripts/profile-data.json, then run npm run build.");

// Header, in the order of the project READMEs: logo, tagline, subtitle, badge row, button row.
const header = readme.match(
  /^<p align="center">\n  <picture>\n    <source media="\(prefers-color-scheme: dark\)" srcset="docs\/brand\/svg\/mertkaya-logo-on-dark\.svg">\n    <img src="docs\/brand\/svg\/mertkaya-logo-on-light\.svg" alt="Mert Kaya" width="260">\n  <\/picture>\n<\/p>\n\n<h1 align="center">([^<]+)<\/h1>\n\n<p align="center">\n  ([^<]+)<br>\n  <b>([^<]+)<\/b>\n<\/p>\n\n<p align="center">\n([\s\S]+?)\n<\/p>\n\n<p align="center">\n([\s\S]+?)\n<\/p>\n\n## Projects\n/,
);
assert.ok(header, "Header blocks are missing or out of order: logo, tagline, subtitle, badge row, button row, then Projects.");
const [, tagline, role, lab, badgeRow, buttonRow] = header;
assert.ok([1, 2].includes(tagline.match(/[.!?](?= |$)/g)?.length), "The tagline must be one or two short sentences.");
assert.match(role, /Enocta/, "The subtitle must name the role at Enocta.");
assert.equal(lab, "Founder of Eschatia Labs, an independent, non-profit open-source AI research lab.", "The subtitle must describe Eschatia Labs in its fixed words.");

const badges = badgeRow.split("\n");
assert.ok(badges.length >= 4 && badges.length <= 6, "The badge row needs 4 to 6 badges.");
for (const badge of badges) {
  assert.match(badge, /^  <a href="https:\/\/[^"]+"><img alt="[^"]+" src="https:\/\/img\.shields\.io\/[^"]*style=flat-square[^"]*"><\/a>$/, `Badge is not a linked flat-square Shields badge: ${badge}`);
}
const buttons = buttonRow.split("\n");
assert.ok(buttons.length >= 5 && buttons.length <= 7, "The button row needs 5 to 7 buttons.");
for (const button of buttons) {
  assert.match(button, /^  <a href="https:\/\/[^"]+"><img alt="[^"]+" src="https:\/\/img\.shields\.io\/badge\/[^"]*\?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2C[^"]+&logoColor=white"><\/a>$/, `Button is not a linked for-the-badge button with a Lucide icon: ${button}`);
}

// Every link to Mert's own sites carries the README UTM tags.
const ownLinks = [...readme.matchAll(/(?:href="|\]\()(https:\/\/(?:[\w-]+\.)*(?:mertkayacs|eschatialabs)\.com[^")\s]*)/g)].map((match) => match[1]);
assert.ok(ownLinks.length >= 4, "Links to mertkayacs.com and eschatialabs.com are missing.");
for (const link of ownLinks) {
  assert.match(link, /\?utm_source=github&utm_medium=readme&utm_campaign=mertkayacs-repo&utm_content=[\w-]+$/, `Link to an own site without UTM tags: ${link}`);
}

// Projects: two cards per row, three rows; each card shows the project's logo kit from its own repo.
const grid = readme.match(/## Projects\n\n<table>\n([\s\S]+?)\n<\/table>\n\n<p align="center"><sub>Download counts from \d{1,2} [A-Z][a-z]+ \d{4}: [^<]+<\/sub><\/p>\n/);
assert.ok(grid, "The project grid or its dated download note is missing.");
assert.equal(grid[1].match(/<tr>/g)?.length, 3, "The project grid needs three rows.");
const cards = [...grid[1].matchAll(/    <td width="50%" valign="top">\n([\s\S]+?)\n    <\/td>/g)].map((match) => match[1]);
const projects = [
  ["reevesagents", "master", "reevesagents"],
  ["jevalt", "main", "jevalt"],
  ["xdfdet", "main", "xdfdet"],
  ["tholos", "main", "tholos"],
  ["ultramod", "main", "ultramod"],
  ["jevoss", "main", "jevoss"],
];
assert.equal(cards.length, projects.length, "The project grid needs six cards.");
cards.forEach((card, index) => {
  const [repo, branch, slug] = projects[index];
  const logo = `https://raw.githubusercontent.com/mertkayacs/${repo}/${branch}/docs/brand/svg/${slug}-logo-on-`;
  assert.ok(card.includes(`<source media="(prefers-color-scheme: dark)" srcset="${logo}dark.svg">`), `${repo}: dark logo missing.`);
  assert.ok(card.includes(` src="${logo}light.svg" width="`), `${repo}: light logo missing.`);
  const sentence = card.match(/\n      <p>(.+)<\/p>\n/)?.[1].replace(/<[^>]+>/g, "");
  assert.ok(sentence && sentence.endsWith(".") && !/\.\s/.test(sentence), `${repo}: the card needs exactly one sentence.`);
  assert.ok(card.includes(`https://img.shields.io/github/stars/mertkayacs/${repo}?style=flat-square`), `${repo}: stars badge missing.`);
});
assert.match(cards[1], /Emberwick/, "The JevAlt card must say that Emberwick runs on it.");

// Career, education and stack sit in closed details with bold summaries, as do the open-source groups and the activity cards.
const about = readme.match(/\n## About\n\n([\s\S]+?)\n\n## Open source Contributions of mine\n/);
assert.ok(about, "The About section is missing or out of order.");
assert.deepEqual([...about[1].matchAll(/^<details>\n<summary><b>(.+)<\/b><\/summary>$/gm)].map((match) => match[1]), ["Career", "Education and research", "Stack"], "About details changed.");
assert.ok(!/<details open/.test(readme), "Every details element starts closed.");

assert.ok(
  readme.includes("[Augmentation and Cutout in Deepfake Detection: A Comparative Study of Accuracy, Calibration, and Attention](https://ieeexplore.ieee.org/document/11745298), with Venera Adanova. Presented at UBMK 2026 in Istanbul and published in IEEE Xplore."),
  "The UBMK 2026 paper line must link IEEE Xplore and say it is published there.",
);
assert.ok(!/to appear|will appear|accepted at|in press/i.test(readme), "Old paper status wording is back.");

const openSource = readme.match(/## Open source Contributions of mine\n\n([\s\S]+?)\nThe full list is on \[mertkayacs\.com\/open-source\]\(https:\/\/mertkayacs\.com\/open-source\/\?[^)]+\)\.\n/);

assert.ok(openSource, "README open-source block is missing.");
const groups = [...openSource[1].matchAll(/^<details>\n<summary><b>(.+)<\/b><\/summary>\n\n([\s\S]+?)\n\n<\/details>$/gm)];
assert.deepEqual(
  groups.map((match) => match[1]),
  ["Used by millions", "Widely used developer tools", "Smaller projects"],
  "Contribution group headings changed.",
);
assert.deepEqual(
  groups.map((match) => match[2].split("\n").filter((line) => line.startsWith("- <a ")).length),
  [13, 16, 4],
  "Contributions moved between groups.",
);

const lines = openSource[1].split("\n").filter((line) => line.startsWith("- <a "));
const expectedLabels = [
  "Bug fixes", "Official plugin and bug fixes", "Bug fix and tests", "Bug fix", "Bug fix", "Bug fix",
  "Bug report", "Bug fixes", "Bug fix", "Bug report", "Bug fix", "Bug fixes", "Bug fix",
  "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix",
  "New feature", "Bug fixes", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix",
  "Bug fix", "Bug fixes", "Bug fix", "Bug report",
];

assert.equal(lines.length, expectedLabels.length, "Contribution count changed.");

const rows = lines.map((line, index) => {
  const fields = line.slice(2).split(" · ");
  assert.equal(fields.length, 4, `Contribution ${index + 1} does not use the compact four-field form.`);

  const [link, state, label, tail] = fields;
  const linkedName = link.match(/^<a href="([^"]+)">(.+) <b>(.+)<\/b><\/a>$/);
  assert.ok(linkedName, `Contribution ${index + 1} changed its linked-name markup.`);
  assert.ok(linkedName[2].includes("<img "), `Contribution ${index + 1} is missing its logo.`);

  const evidenceAt = tail.lastIndexOf(" ([");
  const about = evidenceAt >= 0 ? tail.slice(0, evidenceAt) : tail;
  const evidence = evidenceAt >= 0 ? tail.slice(evidenceAt + 1) : "";
  assert.ok(about.endsWith("."), `Contribution ${index + 1} about sentence is incomplete.`);
  assert.equal(label, expectedLabels[index], `Contribution ${index + 1} has the wrong kind label.`);

  return {
    name: linkedName[3],
    href: linkedName[1],
    logo: linkedName[2],
    state,
    label,
    about,
    evidence,
  };
});

const hash = (values) => createHash("sha256").update(JSON.stringify(values)).digest("hex");
const contracts = {
  name: "7ad20119c6bc52ce350c8a1d1209f1008b1cf0de66ec122753bcdd0db50086d4",
  href: "a5cb28b2d755c64f4ae5a88b7694c2bcbdde945f197d9a5d3cdd88711db4fd14",
  logo: "212c0d262fe1a22c1988520465d938110e725bd7b9e3b875297872993d944901",
  state: "17a938fdb3aac454cb17d4792852a95fd0e58db61866020b012bb07270630a82",
  about: "ff6dea75cfa748819c07531708bc2c56e36f24689cb0e1793424493f532a757c",
  evidence: "b3f7659765c894cbc74bddf324466cea7fd1744b051de748a9b6236cfe3bbb0f",
};

for (const [field, expected] of Object.entries(contracts)) {
  assert.equal(hash(rows.map((row) => row[field])), expected, `Contribution ${field} contract changed.`);
}

// Activity: the generated cards from the cards branch, then the views badge as the last line.
const activity = readme.match(/\n## Activity\n\n<details>\n<summary><b>[^<]+<\/b><\/summary>\n\n([\s\S]+?)\n\n<\/details>\n\n/);
assert.ok(activity, "The Activity section is missing.");
for (const card of ["contrib", "stats", "languages"]) {
  for (const theme of ["light", "dark"]) {
    assert.ok(activity[1].includes(`https://raw.githubusercontent.com/mertkayacs/mertkayacs/cards/${card}-${theme}.svg`), `Activity card ${card}-${theme} is missing.`);
  }
}
assert.match(
  readme.trimEnd().split("\n").at(-1),
  /^\[!\[views\]\(https:\/\/hits\.sh\/github\.com\/mertkayacs\.svg\?view=today-total&style=flat-square&label=views&color=[0-9A-F]{6}&labelColor=[0-9A-F]{6}\)\]\(https:\/\/mertkayacs\.com\/\?utm_source=github&utm_medium=readme&utm_campaign=mertkayacs-repo&utm_content=views-badge\)$/,
  "The hits.sh views badge must be the last line.",
);

// Writing and image rules: no em or en dashes, no emoji, no photos of Mert.
assert.ok(!/[–—]/.test(readme), "Em or en dash found.");
assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u.test(readme), "Emoji found.");
assert.ok(!/avatars\.githubusercontent\.com|gravatar\.com/i.test(readme), "A profile photo is linked.");

console.log("README contract: generated from profile-data.json; header, 6 project cards, closed details, paper line, activity cards and views badge in place; 33 contribution lines (13, 16, 4); order, states, labels, about sentences, logos, links and evidence match.");
