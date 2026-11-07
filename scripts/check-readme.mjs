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
  "Bug fixes", "Bug fixes", "Bug fix and tests", "Bug fix", "Bug fix", "Bug report",
  "Bug fixes", "Bug fix", "Bug report", "Bug fix", "Bug fix", "Bug fixes", "Bug fix",
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
  name: "2c23e24f49652589322695300b1e9735c0462d59a7401737e41071038daa455b",
  href: "34df511a73e673fbad2408e253decf94951c224ab1f48a68a781d5a6f97b4476",
  logo: "12b98abb2f848717e64a97b38e41992c078331da2f484e44e2f5ac184716d322",
  state: "5b39813918b9509930d3a41bb457851cb74ecd38cb4d81acbda5d1eb8e618188",
  about: "2aa9e96dce0b9915c99913d42c29615bf64af80b1b93a4616943e3b9925f78b7",
  evidence: "a92e28b5b74853f6b41a2b556f074b3c87dd391a8b43b5f66dc61fb335316399",
};

for (const [field, expected] of Object.entries(contracts)) {
  assert.equal(hash(rows.map((row) => row[field])), expected, `Contribution ${field} contract changed.`);
}

console.log("README contract: 33 contribution lines; order, states, labels, about sentences, logos, links and evidence match.");
