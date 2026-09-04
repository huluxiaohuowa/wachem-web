import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("experience carousel tabs and panels stay in sync", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const tabs = [...html.matchAll(/data-experience-tab="([^"]+)"/g)].map((match) => match[1]);
  const panels = [...html.matchAll(/data-experience-panel="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(tabs, ["mac", "ipad", "web"]);
  assert.deepEqual(panels, tabs);
  assert.match(html, /data-experience-counter>01<\/strong> \/ 03/);
});
