import assert from "node:assert/strict";
import test from "node:test";
import { searchReferrer } from "../lib/search-referrer.ts";

test("recognizes supported search engines without counting paid or spoofed hosts", () => {
  const site = "https://example.org";
  assert.equal(searchReferrer("https://www.google.com.tr/", site, ""), "google");
  assert.equal(searchReferrer("https://www.bing.com/", site, ""), "bing");
  assert.equal(searchReferrer("https://www.google.com/", site, "?gclid=123"), null);
  assert.equal(searchReferrer("https://www.google.com.example.org/", site, ""), null);
  assert.equal(searchReferrer(site, site, ""), null);
});
