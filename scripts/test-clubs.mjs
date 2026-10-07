import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as cheerio from "cheerio";

const requirePackage = createRequire(import.meta.url);
function load(relative, overrides = {}) {
  const filename = path.resolve(relative);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiled = { exports: {} };
  runInNewContext(code, {
    module: compiled, exports: compiled.exports, URL, URLSearchParams, AbortSignal, FormData, File, console,
    process: { env: {} }, fetch: () => { throw new Error("Unexpected network request"); },
    require: (name) => {
      if (name in overrides) return overrides[name];
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.join(path.dirname(filename), name);
        const target = [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(existsSync);
        if (!target) throw new Error(`Missing module: ${name}`);
        return load(target, overrides);
      }
      return requirePackage(name);
    },
  }, { filename });
  return compiled.exports;
}
const i18n = load("lib/i18n/index.ts");
const profile = { id: "student", name: "Student One", role: "student" };
const clubFixture = {
  id: "club", slug: "suda", name: "수다", name_en: "Suda", category: "문화교류", status: "recruiting",
  description: "한국어 소개", description_en: "Practice Korean with fellow students.",
  activities: "정기 모임", activities_en: "Weekly conversation practice",
  recruiting_post: "모집 안내", recruiting_post_en: "New members welcome",
  meeting_day: "화요일", meeting_day_en: "Tuesday", meeting_time: "18:00",
  meeting_location: "학생휴게실", meeting_location_en: "Student lounge",
  president_id: profile.id, cover_image_url: null, advisor_name: null, advisor_department: null,
};
function mockDb(club = { ...clubFixture }) {
  const writes = [];
  const tables = {
    clubs: [club], profile_private: [{ student_id: "2026001" }], club_memberships: [],
    club_applications: [], profiles: [{ id: profile.id, role: "student" }],
  };
  const errors = {};
  const db = {
    auth: { getUser: async () => ({ data: { user: { email: "student@example.test" } } }) },
    from(table) {
      let action = "select", payload, single = false, columns = "";
      const query = {
        select(value) { columns = value; return query; }, eq() { return query; }, in() { return query; }, order() { return query; }, limit() { return query; }, returns() { return query; },
        single() { single = true; return query; }, maybeSingle() { single = true; return query; },
        insert(value) { action = "insert"; payload = value; return query; },
        update(value) { action = "update"; payload = value; return query; },
        then(resolve) {
          let data = tables[table] ?? [];
          if (action !== "select") {
            const stored = JSON.parse(JSON.stringify(payload));
            writes.push({ table, action, payload: stored });
            if (!errors[table]) {
              if (action === "update") for (const row of data) Object.assign(row, stored);
              else data = [{ id: "created", ...stored }];
            }
          }
          const error = errors[table] ?? (store.legacy && table === "clubs" && /activities_en|meeting_day_en|meeting_location_en|recruiting_post_en/.test(columns) ? { code: "42703" } : null);
          return Promise.resolve({ data: error ? null : single ? data[0] ?? null : data, error }).then(resolve);
        },
      };
      return query;
    },
  };
  const store = { db, tables, errors, writes, club, legacy: false };
  return store;
}
function overrides(locale, store, applicationState = { error: null, success: false }, optionalSections = false) {
  return {
    "next/link": ({ children, ...props }) => {
      delete props.replace;
      delete props.scroll;
      return React.createElement("a", props, children);
    },
    "next/image": ({ src, alt }) => React.createElement("img", { src, alt }),
    "next/headers": { cookies: async () => ({ getAll: () => [] }) },
    "next/navigation": { redirect: (url) => { throw new Error(url); }, notFound: () => { throw new Error("notFound"); } },
    "@/lib/i18n/server": { getLocale: async () => locale },
    "@/lib/auth": { getCurrentProfile: async () => profile, requireSuperAdmin: async () => profile },
    "@/utils/supabase/server": { createClient: () => store.db },
    "@/lib/notify": { notify: async () => {}, resolveSuperAdminIds: async () => [] },
    react: {
      ...React,
      useActionState: () => [applicationState, () => {}, false],
      useState: optionalSections ? (initial) => typeof initial === "boolean" ? [true, () => {}] : React.useState(initial) : React.useState,
    },
  };
}
async function renderPage(file, locale, store, params = {}, extra = {}) {
  const page = load(file, overrides(locale, store, extra.state, extra.optionalSections));
  return renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug: "suda" }), searchParams: Promise.resolve(params) }));
}
function visible(html) { return cheerio.load(html)("body").text(); }
function form(values) {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, value);
  return result;
}
function validApplication() {
  const values = {
    club_name: "수다", club_name_en: "Suda", category: "문화교류", registration_category: "국제교류", language: "mixed", established_at: "2026-10-07",
    purpose: "한국어 소개", purpose_en: "English introduction", activity_plan: "활동 목표", activity_plan_en: "English activity goals",
    president_contact: "01012345678", president_nationality: "domestic",
    treasurer_name: "Treasurer", treasurer_contact: "01012345679", treasurer_nationality: "domestic", treasurer_is_current_student: "on",
    membership_approval_days: "3", meeting_frequency: "Weekly", advisor_name: "Advisor", advisor_department: "Program", advisor_email: "advisor@smit.ac.kr",
    advisor_student_consent: "on", confirmed_club_rules: "on", agree_rules: "on",
  };
  for (let n = 0; n < 3; n++) {
    values[`founders[${n}][name]`] = `Founder ${n}`;
    values[`founders[${n}][nationality]`] = n === 0 ? "international" : "domestic";
    values[`founders[${n}][is_current_student]`] = "on";
  }
  return form(values);
}

test("public club content falls back in both languages, including existing SUDA", () => {
  assert.equal(i18n.clubText("한국어", "English", "en"), "English");
  assert.equal(i18n.clubText("한국어", "English", "ko"), "한국어");
  assert.equal(i18n.clubText("한국어", "  ", "en"), "한국어");
  assert.equal(i18n.clubText(null, "English", "ko"), "English");
  assert.equal(i18n.clubName("", "Suda", "ko"), "Suda");
});

test("legacy schema restores SUDA on Home, Clubs and detail without any DB writes", async () => {
  const store = mockDb();
  store.legacy = true;
  store.club.description_en = null;
  for (const key of ["activities_en", "meeting_day_en", "meeting_location_en", "recruiting_post_en"]) delete store.club[key];
  for (const locale of ["ko", "en"]) {
    const list = await renderPage("app/clubs/page.tsx", locale, store);
    assert.match(list, /href="\/clubs\/suda"/);
    assert.match(list, /한국어 소개/);
    const detail = await renderPage("app/clubs/[slug]/page.tsx", locale, store);
    assert.match(detail, /한국어 소개/);
    const home = load("app/page.tsx", {
      ...overrides(locale, store),
      "@/components/home/home-freshness": { HomeFreshness: () => null },
      "@/components/home/news-preview": { NewsPreview: () => null },
    });
    assert.match(renderToStaticMarkup(await home.default()), /href="\/clubs\/suda"/);
  }
  assert.equal(store.writes.length, 0);
});

test("desktop and mobile navigation mark only the current menu in KO and EN", () => {
  for (const locale of ["ko", "en"]) for (const [pathname, href] of [["/", "/"], ["/clubs/suda/join", "/clubs"], ["/club-rules", "/club-rules"], ["/clubs/new", "/club-rules"], ["/news", "/news"], ["/my/club", "/my"]]) {
    const options = {
      ...overrides(locale, mockDb()),
      "next/navigation": { usePathname: () => pathname },
      "@/components/nav/accessibility-controls": { AccessibilityControls: () => null },
    };
    const header = load("components/nav/site-header.tsx", options);
    const $ = cheerio.load(renderToStaticMarkup(React.createElement(header.SiteHeader, { locale, profile: null })));
    assert.equal($('nav a[aria-current="page"]').length, 1);
    assert.equal($('nav a[aria-current="page"]').attr("href"), href);
    assert.ok($('nav a[aria-current="page"]').hasClass("text-coral-dark"));
    const mobile = load("components/nav/bottom-nav.tsx", options);
    const bottom = cheerio.load(renderToStaticMarkup(React.createElement(mobile.BottomNav, { locale })));
    assert.equal(bottom('a[aria-current="page"]').length, 1);
    assert.equal(bottom('a[aria-current="page"]').attr("href"), pathname === "/clubs/new" ? "/clubs/new" : href);
  }
});

test("EN Signup → Login → Profile supports international names, student IDs and contact numbers", async () => {
  const store = mockDb();
  const options = overrides("en", store);
  for (const file of ["app/(auth)/signup/page.tsx", "app/(auth)/login/page.tsx", "app/my/page.tsx"]) {
    const html = await renderPage(file, "en", store);
    assert.doesNotMatch(visible(html), /[가-힣]/);
  }
  let signupPayload;
  store.db.auth.signUp = async (payload) => { signupPayload = payload; return { data: { session: null }, error: null }; };
  store.db.auth.signInWithPassword = async () => ({ error: null });
  const auth = load("lib/actions/auth.ts", options);
  const values = { name: "José Nguyễn", student_id: "INT-A2026", contact: "+44 1234 567890", department: "e-Business", email: "student@example.test", password: "test-password", password_confirm: "test-password" };
  await assert.rejects(auth.signUp(form(values)), /\/login\?signup=1/);
  assert.equal(signupPayload.options.data.name, "José Nguyễn");
  assert.equal(signupPayload.options.data.student_id, "INT-A2026");
  assert.equal(signupPayload.options.data.contact, "441234567890");
  const confirmation = await renderPage("app/(auth)/login/page.tsx", "en", store, { signup: "1" });
  assert.match(visible(confirmation), /Check your email/);
  await assert.rejects(auth.signIn(form(values)), (error) => error.message === "/");
  await assert.rejects(auth.signUp(form({ ...values, password_confirm: "different" })), (error) => decodeURIComponent(error.message.replaceAll("+", " ")).includes("passwords do not match"));
  store.db.auth.signInWithPassword = async () => ({ error: { message: "Invalid login credentials" } });
  await assert.rejects(auth.signIn(form(values)), (error) => decodeURIComponent(error.message.replaceAll("+", " ")).includes("Email or password is incorrect"));
  const action = load("lib/actions/profile.ts", options);
  const saved = await action.updateMyProfile({}, form({ contact: "+44 1234 567890", department: "e-Business" }));
  assert.equal(saved.success, true);
  assert.equal(store.writes.at(-1).table, "profile_private");
  assert.equal(store.writes.at(-1).payload.contact, "441234567890");
});
for (const locale of ["ko", "en"]) {
  test(`${locale}: Clubs → detail → Join renders localized content and preserves membership states`, async () => {
    const store = mockDb();
    const list = await renderPage("app/clubs/page.tsx", locale, store);
    assert.match(list, /href="\/clubs\/suda"/);
    assert.match(list, /href="\/clubs\/suda\/join"/);
    assert.ok(list.includes(locale === "en" ? clubFixture.description_en : clubFixture.description));
    const detail = await renderPage("app/clubs/[slug]/page.tsx", locale, store);
    assert.match(detail, /href="\/clubs\/suda\/join"/);
    for (const field of ["description", "activities", "recruiting_post", "meeting_day", "meeting_location"]) assert.ok(detail.includes(clubFixture[locale === "en" ? `${field}_en` : field]), field);
    let join = await renderPage("app/clubs/[slug]/join/page.tsx", locale, store);
    assert.match(join, /name="motivation"/);
    assert.ok(join.includes(i18n.getDictionary(locale).clubJoin.submit));
    if (locale === "en") for (const html of [list, detail, join]) assert.doesNotMatch(visible(html), /[가-힣]/);
    store.tables.club_memberships = [{ status: "applied" }];
    join = await renderPage("app/clubs/[slug]/join/page.tsx", locale, store, { success: "1" });
    assert.ok(join.includes(i18n.getDictionary(locale).clubJoin.success));
    assert.doesNotMatch(join, /name="motivation"/);
    store.club.status = "active";
    assert.ok((await renderPage("app/clubs/[slug]/join/page.tsx", locale, store)).includes(i18n.getDictionary(locale).clubJoin.closed));
  });
  test(`${locale}: Club Guide → Start a Club → submission confirmation has consistent UI and unchanged field codes`, async () => {
    const store = mockDb();
    const guide = await renderPage("app/club-rules/page.tsx", locale, store);
    assert.match(guide, /href="\/clubs\/new"/);
    for (const optionalSections of [false, true]) {
      const start = await renderPage("app/clubs/new/page.tsx", locale, store, {}, { optionalSections });
      const $ = cheerio.load(start);
      assert.equal($('input[name="club_name"]').is("[required]"), true);
      assert.equal($('input[name="club_name_en"]').is("[required]"), true);
      assert.equal($('input[name="president_nationality"]:checked').val(), locale === "en" ? "international" : "domestic");
      const cta = $('a[href="#apply"]');
      for (const token of ["flex", "items-center", "justify-center"]) assert.ok(cta.hasClass(token));
      assert.match(start, /name="purpose_en"/);
      assert.match(start, /name="activity_plan_en"/);
      assert.match(start, /value="국제교류"/);
      assert.match(start, /value="문화교류"/);
      if (locale === "en") assert.doesNotMatch(visible(start), /[가-힣]/);
    }
    const submitted = await renderPage("app/clubs/new/page.tsx", locale, store, {}, { state: { error: null, success: true } });
    assert.ok(submitted.includes(i18n.getDictionary(locale).clubApplication.submitted));
    assert.doesNotMatch(submitted, /name="club_name"/);
  });
  test(`${locale}: application action saves bilingual public content and retains original eligibility requirements`, async () => {
    const store = mockDb();
    const action = load("lib/actions/club-applications.ts", overrides(locale, store));
    const result = await action.submitClubApplication({}, validApplication());
    assert.equal(result.success, true);
    const saved = store.writes.find((w) => w.table === "club_applications").payload;
    assert.equal(saved.purpose_en, "English introduction");
    assert.equal(saved.activity_plan_en, "English activity goals");
    assert.equal(saved.status, "submitted");
    assert.equal(saved.president_profile_id, profile.id);
    const founders = store.writes.find((w) => w.table === "club_application_founders").payload;
    assert.equal(founders.length, 5);
    const tooFew = validApplication();
    tooFew.delete("founders[2][name]");
    const minimum = await action.submitClubApplication({}, tooFew);
    assert.equal(minimum.success, false);
    assert.match(minimum.error, /5/);
    const noInternational = validApplication();
    noInternational.set("founders[0][nationality]", "domestic");
    assert.equal((await action.submitClubApplication({}, noInternational)).error, i18n.getDictionary(locale).clubApplication.errors.internationalMemberRequired);
    const noConsent = validApplication();
    noConsent.delete("advisor_student_consent");
    assert.equal((await action.submitClubApplication({}, noConsent)).error, i18n.getDictionary(locale).clubApplication.errors.confirmAdvisor);
    const noRules = validApplication();
    noRules.delete("confirmed_club_rules");
    assert.equal((await action.submitClubApplication({}, noRules)).error, i18n.getDictionary(locale).clubApplication.errors.confirmRead);
  });
}

test("membership submission retains recruiting and duplicate checks and localized feedback", async () => {
  const store = mockDb();
  const action = load("lib/actions/club-memberships.ts", overrides("en", store));
  await assert.rejects(action.applyToClub("club", form({ motivation: "I want to join" })), /success=1/);
  const saved = store.writes[0].payload;
  assert.equal(saved.user_id, profile.id);
  assert.equal(saved.club_id, "club");
  store.errors.club_memberships = { code: "23505" };
  await assert.rejects(action.applyToClub("club", form({})), (error) => decodeURIComponent(error.message).includes("already applied"));
  store.club.status = "active";
  const before = store.writes.length;
  await assert.rejects(action.applyToClub("club", form({})), (error) => decodeURIComponent(error.message).includes("not currently accepting"));
  assert.equal(store.writes.length, before);
});

test("president can add only an English introduction without clearing SUDA Korean data or changing admin fields", async () => {
  const store = mockDb();
  const action = load("lib/actions/club-admin.ts", overrides("en", store));
  await assert.rejects(action.updateMyClub("club", form({ description_en: "English-only update", name: "Tampered", status: "closed" })), /success=1/);
  assert.equal(store.club.description, "한국어 소개");
  assert.equal(store.club.description_en, "English-only update");
  assert.equal(store.club.activities, "정기 모임");
  assert.equal(store.club.name, "수다");
  assert.equal(store.club.status, "recruiting");
  store.club.president_id = "another-president";
  const before = store.writes.length;
  await assert.rejects(action.updateMyClub("club", form({ description_en: "Unauthorized" })), (error) => decodeURIComponent(error.message).includes("registered president"));
  assert.equal(store.writes.length, before);
  const pageStore = mockDb();
  const manage = await renderPage("app/my/club/page.tsx", "en", pageStore);
  for (const field of ["description_en", "activities_en", "recruiting_post_en", "meeting_day_en", "meeting_location_en"]) assert.ok(manage.includes(`name="${field}"`), field);
  assert.match(manage, /name="description"[^>]*>한국어 소개/);
});

test("final approval copies both public languages without changing the approval workflow", async () => {
  const store = mockDb();
  store.tables.club_applications = [{ id: "application", applicant_id: profile.id, president_profile_id: profile.id, club_name: "수다", club_name_en: "Suda", category: "문화교류", purpose: "한국어 소개", purpose_en: "English introduction", activity_plan: "주요 활동", activity_plan_en: "English activities", status: "recommended" }];
  const action = load("lib/actions/admin-applications.ts", {
    ...overrides("en", store),
    "@/lib/eligibility": { evaluateEligibility: () => {}, MANUAL_CHECKLIST_ITEMS: [] },
    "@/lib/certificate": { getApprovalNumber: () => "test-approval" },
  });
  await assert.rejects(action.approveApplication("application", form({})), /\/admin\/club-applications$/);
  const saved = store.writes.find((w) => w.table === "clubs" && w.action === "insert").payload;
  assert.equal(saved.description, "한국어 소개");
  assert.equal(saved.description_en, "English introduction");
  assert.equal(saved.activities_en, "English activities");
  assert.equal(saved.president_id, profile.id);
  assert.equal(saved.status, "recruiting");
  assert.equal(store.writes.find((w) => w.table === "club_applications" && w.action === "update").payload.status, "approved");
});

test("migration adds public columns only and original action validation conditions remain unchanged", () => {
  const sql = readFileSync("supabase/migrations/0018_club_public_content_i18n.sql", "utf8");
  assert.doesNotMatch(sql, /create\s+(?:policy|function|trigger)|drop\s|alter\s+policy/i);
  const updates = [...sql.matchAll(/update\s+public\.(\w+)\s+set\s+([\s\S]*?)\s+where\s+([\s\S]*?);/gi)];
  assert.equal(updates.length, 1);
  assert.equal(updates[0][1], "clubs");
  assert.deepEqual([...updates[0][2].matchAll(/(?:^|,)\s*(\w+)\s*=/g)].map((match) => match[1]), ["description_en", "activities_en"]);
  assert.match(updates[0][3], /slug = 'suda'/);
  assert.doesNotMatch(sql, /add column.*(?:student_id|contact|advisor|nationality|president_id)/i);
  function conditions(text, filename) {
    const tree = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
    const result = [];
    const printer = ts.createPrinter();
    function visit(node) { if (ts.isIfStatement(node)) result.push(printer.printNode(ts.EmitHint.Expression, node.expression, tree)); ts.forEachChild(node, visit); }
    visit(tree);
    return result;
  }
  for (const file of ["lib/actions/club-applications.ts", "lib/actions/club-memberships.ts", "lib/actions/admin-applications.ts"]) {
    const before = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
    assert.deepEqual(conditions(readFileSync(file, "utf8"), file), conditions(before, file), file);
  }
});
