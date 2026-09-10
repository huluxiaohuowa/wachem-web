import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("experience carousel tabs and panels stay in sync", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const tabs = [...html.matchAll(/data-experience-tab="([^"]+)"/g)].map((match) => match[1]);
  const panels = [...html.matchAll(/data-experience-panel="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(tabs, ["draw", "recognize", "assets", "ipad", "web"]);
  assert.deepEqual(panels, tabs);
  assert.match(html, /data-experience-counter>01<\/strong> \/ 05/);
});

test("privacy policy is linked from both navigation areas", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const privacyLinks = [...html.matchAll(/<a href="privacy\/"[^>]*data-i18n="privacyPolicy"/g)];

  assert.equal(privacyLinks.length, 2);
});

test("model copy distinguishes Apple and Web recognition models", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../script.js", import.meta.url), "utf8");

  assert.match(html, /data-i18n="appleSelfTrainedModel">自训练模型/);
  assert.match(html, /data-i18n="webExistingModel">现有识别模型/);
  assert.match(script, /目前权重仍在持续训练与更新中/);
  assert.match(script, /Web 端继续使用现有识别模型/);
  assert.doesNotMatch(script, /Model compute paths by product/);
});
