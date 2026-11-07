import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const openSource = readme.match(/## Open source\n\n([\s\S]+?)\nThe full list/);

assert.ok(openSource, "README open-source block is missing.");
assert.deepEqual(
  [...openSource[1].matchAll(/^\*\*(.+)\*\*$/gm)].map((match) => match[1]),
  ["Used by millions", "Widely used developer tools", "Smaller projects"],
  "Contribution group headings changed.",
);

const lines = openSource[1].split("\n").filter((line) => line.startsWith("- <a "));
const expectedLabels = [
  "Bug fixes", "Bug fixes", "Bug fix and tests", "Bug fix", "Bug fix", "Bug fix",
  "Bug report", "Bug fixes", "Bug fix", "Bug report", "Bug fix", "Bug fixes", "Bug fix",
  "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "New feature",
  "Bug fixes", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix", "Bug fix",
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
  name: "be91de9367c507708662d00667a802a1c65b24482d26f23769b688bf056c6123",
  href: "1a1e90c775d083e176667e6033d4ef8e95edd32f576002dbcc6884f0158d9c38",
  logo: "ac84ce42c68a1c10d9202c1a6c32d89aa601166fa2e31af2b7393714c7698872",
  state: "73d822560672fae4e56429535f1be304ec5cac7e53a79ea08aae4a927af0fafd",
  about: "c9a5a42725171d236594348b7d316a15871dfbd34178ef44a9271275a4c9468d",
  evidence: "3318afac354a9c27ce368dc4b9cc14f443c4fe7c0318ad26cc87b921d54f4ec5",
};

for (const [field, expected] of Object.entries(contracts)) {
  assert.equal(hash(rows.map((row) => row[field])), expected, `Contribution ${field} contract changed.`);
}

console.log("README contract: 33 contribution lines; order, states, labels, about sentences, logos, links and evidence match.");
