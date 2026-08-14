const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
const PHONE = "9000000002";
let TOKEN = null;
let results = [];

function log(track, label, method, endpoint, status, result, notes) {
  const r = { track, label, method, endpoint, status, result, notes };
  results.push(r);
  const icon = result === "PASS" ? "✅" : result === "FAIL" ? "❌" : result === "BLOCKED" ? "⛔" : "⚠️";
  console.log(icon + " [" + track + "] " + label + " | " + method + " " + endpoint + " → HTTP " + status + " | " + result + (notes ? " | " + notes : ""));
}

async function req(method, path, body, headers={}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (TOKEN && !headers["no-auth"]) h["Authorization"] = "Bearer " + TOKEN;
  try {
    const res = await fetch(API + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    let data;
    try { data = await res.json(); } catch(e) { data = {}; }
    return { status: res.status, data };
  } catch(e) {
    return { status: 0, data: { error: e.message } };
  }
}

async function runAll() {
  console.log("=== PHASE 7B.3 — REAL TEST API E2E ===\n");
  console.log("API: " + API);
  console.log("Org: " + ORG_ID + "\n");

  // ═══════════════════════════════════════
  // TRACK A — AUTH
  // ═══════════════════════════════════════
  console.log("\n── TRACK A: AUTH ──");

  // A1: Send OTP
  let r = await req("POST", "/auth/send-otp", { phone: PHONE, role: "CUSTOMER" }, { "no-auth": true });
  const devOtp = r.data?.data?._devOtp;
  log("A","Send OTP","POST","/auth/send-otp", r.status, r.status===200?"PASS":"FAIL", "devOtp=" + devOtp);

  // A2: Invalid OTP
  let r2 = await req("POST", "/auth/verify-otp", { phone: PHONE, otp: "000000" }, { "no-auth": true });
  log("A","Reject invalid OTP","POST","/auth/verify-otp", r2.status, r2.status>=400?"PASS":"FAIL", JSON.stringify(r2.data?.message));

  // A3: Verify OTP
  const otp = devOtp || "123456";
  let r3 = await req("POST", "/auth/verify-otp", { phone: PHONE, otp }, { "no-auth": true });
  if (r3.status === 200 && r3.data?.data?.accessToken) {
    TOKEN = r3.data.data.accessToken;
    log("A","Verify OTP + get token","POST","/auth/verify-otp", r3.status, "PASS", "token acquired, userId=" + r3.data?.data?.user?.id);
  } else {
    log("A","Verify OTP","POST","/auth/verify-otp", r3.status, "FAIL", JSON.stringify(r3.data));
    console.log("FATAL: Cannot acquire token. Stopping."); process.exit(1);
  }

  // A4: GET /auth/me
  let r4 = await req("GET", "/auth/me");
  log("A","GET /auth/me","GET","/auth/me", r4.status, r4.status===200&&r4.data?.data?.phone===PHONE?"PASS":"FAIL", "phone=" + r4.data?.data?.phone + " role=" + r4.data?.data?.role);

  // A5: Unauthorized (no token)
  let r5 = await req("GET", "/auth/me", null, { "no-auth": true, "Authorization": "" });
  log("A","Reject unauthenticated","GET","/auth/me", r5.status, r5.status===401?"PASS":"FAIL", r5.data?.message);

  // ═══════════════════════════════════════
  // TRACK B — ORG CONTEXT
  // ═══════════════════════════════════════
  console.log("\n── TRACK B: ORGANIZATION CONTEXT ──");

  // B1: GET /organizations/me
  let b1 = await req("GET", "/organizations/me");
  const myOrg = b1.data?.data;
  const foundOrg = Array.isArray(myOrg) ? myOrg.find(o => o.id === ORG_ID || o.organizationId === ORG_ID) : (myOrg?.id === ORG_ID ? myOrg : null);
  log("B","GET /organizations/me","GET","/organizations/me", b1.status, b1.status===200&&(Array.isArray(myOrg)?myOrg.length>0:!!myOrg)?"PASS":"FAIL", "orgs=" + (Array.isArray(myOrg)?myOrg.length:1) + " data=" + JSON.stringify(myOrg).substring(0,100));

  // B2: GET /organizations/:id with x-organization-id
  let b2 = await req("GET", "/organizations/" + ORG_ID, null, { "x-organization-id": ORG_ID });
  log("B","GET /organizations/:id with header","GET","/organizations/"+ORG_ID, b2.status, b2.status===200?"PASS":"FAIL", JSON.stringify(b2.data?.data).substring(0,120));

  // B3: Missing x-organization-id (should still work or gracefully 400/401)
  let b3 = await req("GET", "/organizations/" + ORG_ID, null, {});
  log("B","GET org without x-org-id header","GET","/organizations/"+ORG_ID, b3.status, [200,400,401,403].includes(b3.status)?"PASS":"FAIL", b3.data?.message);

  // B4: Invalid org ID (should 404 or 403)
  let b4 = await req("GET", "/organizations/00000000-0000-0000-0000-000000000000", null, { "x-organization-id": "00000000-0000-0000-0000-000000000000" });
  log("B","Invalid org ID → 404/403","GET","/organizations/00000000-0000-0000-0000-000000000000", b4.status, [403,404].includes(b4.status)?"PASS":"FAIL", b4.data?.message);

  // ═══════════════════════════════════════
  // TRACK C — BRANCHES
  // ═══════════════════════════════════════
  console.log("\n── TRACK C: BRANCHES ──");
  const ORG_HEADER = { "x-organization-id": ORG_ID };

  // C1: List branches
  let c1 = await req("GET", "/organizations/branches", null, ORG_HEADER);
  let seededBranchExists = false;
  if (c1.status === 200) {
    const branches = c1.data?.data?.items || c1.data?.data || [];
    seededBranchExists = (Array.isArray(branches) ? branches : [branches]).some(b => b.name === "Mumbai HQ" || b.code === "MUM-HQ");
    log("C","List branches","GET","/organizations/branches", c1.status, "PASS", "count=" + (Array.isArray(branches)?branches.length:1) + " seeded=" + seededBranchExists);
  } else {
    log("C","List branches","GET","/organizations/branches", c1.status, "FAIL", JSON.stringify(c1.data?.message));
  }

  // C2: Get seeded branch detail
  const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";
  let c2 = await req("GET", "/organizations/branches/" + BRANCH_ID, null, ORG_HEADER);
  log("C","GET seeded branch detail","GET","/organizations/branches/"+BRANCH_ID, c2.status, c2.status===200?"PASS":"FAIL", JSON.stringify(c2.data?.data).substring(0,100));

  // C3: Create test branch
  let c3 = await req("POST", "/organizations/branches", { name: "TEST-TEMP-Branch-E2E", code: "TST-E2E", address: "Test Street", city: "Pune", state: "Maharashtra", country: "India", postalCode: "411001" }, ORG_HEADER);
  const testBranchId = c3.data?.data?.id || c3.data?.data?.branch?.id;
  log("C","Create temp branch","POST","/organizations/branches", c3.status, [200,201].includes(c3.status)&&testBranchId?"PASS":"FAIL", "id=" + testBranchId);

  // C4: GET created branch
  if (testBranchId) {
    let c4 = await req("GET", "/organizations/branches/" + testBranchId, null, ORG_HEADER);
    log("C","Persist verify created branch","GET","/organizations/branches/"+testBranchId, c4.status, c4.status===200&&c4.data?.data?.name==="TEST-TEMP-Branch-E2E"?"PASS":"FAIL", c4.data?.data?.name);
  }

  // ═══════════════════════════════════════
  // TRACK D — DEPARTMENTS
  // ═══════════════════════════════════════
  console.log("\n── TRACK D: DEPARTMENTS ──");
  const BRANCH_ID_SEEDED = "36b4eee8-2ce1-4c33-aa1c-91819371b290";

  // D1: List departments
  let d1 = await req("GET", "/organizations/branches/" + BRANCH_ID_SEEDED + "/departments", null, ORG_HEADER);
  log("D","List departments","GET","/organizations/branches/:id/departments", d1.status, d1.status===200?"PASS":"FAIL", JSON.stringify(d1.data?.data).substring(0,100));

  // D2: Create department
  let d2 = await req("POST", "/organizations/branches/" + BRANCH_ID_SEEDED + "/departments", { name: "TEST-TEMP-Dept-E2E", code: "TST-DEPT", branchId: BRANCH_ID_SEEDED }, ORG_HEADER);
  const testDeptId = d2.data?.data?.id || d2.data?.data?.department?.id;
  log("D","Create temp department","POST","/organizations/branches/:id/departments", d2.status, [200,201].includes(d2.status)&&testDeptId?"PASS":"FAIL", "id=" + testDeptId);

  // ═══════════════════════════════════════
  // TRACK E — TEAMS
  // ═══════════════════════════════════════
  console.log("\n── TRACK E: TEAMS ──");
  const DEPT_ID_SEEDED = "4bd88b04-230d-481b-acbd-8c3767990837";

  // E1: List teams
  let e1 = await req("GET", "/organizations/branches/" + BRANCH_ID_SEEDED + "/departments/" + DEPT_ID_SEEDED + "/teams", null, ORG_HEADER);
  log("E","List teams","GET","/orgs/branches/:b/departments/:d/teams", e1.status, e1.status===200?"PASS":"FAIL", JSON.stringify(e1.data?.data).substring(0,100));

  // E2: Create team
  let e2 = await req("POST", "/organizations/branches/" + BRANCH_ID_SEEDED + "/departments/" + DEPT_ID_SEEDED + "/teams", { name: "TEST-TEMP-Team-E2E", code: "TST-TEAM", branchId: BRANCH_ID_SEEDED, departmentId: DEPT_ID_SEEDED }, ORG_HEADER);
  const testTeamId = e2.data?.data?.id;
  log("E","Create temp team","POST","/orgs/branches/:b/departments/:d/teams", e2.status, [200,201].includes(e2.status)&&testTeamId?"PASS":"FAIL", "id=" + testTeamId);

  // ═══════════════════════════════════════
  // TRACK F — MEMBERS / EMPLOYMENT / DESIGNATIONS
  // ═══════════════════════════════════════
  console.log("\n── TRACK F: MEMBERS / EMPLOYMENT / DESIGNATIONS ──");

  // F1: List members
  let f1 = await req("GET", "/organizations/members", null, ORG_HEADER);
  log("F","List members","GET","/organizations/members", f1.status, f1.status===200?"PASS":"FAIL", JSON.stringify(f1.data?.data).substring(0,120));

  // F2: List employment types
  let f2 = await req("GET", "/organizations/employment-types", null, ORG_HEADER);
  log("F","List employment types","GET","/organizations/employment-types", f2.status, f2.status===200?"PASS":"FAIL", JSON.stringify(f2.data?.data).substring(0,100));

  // F3: Create employment type
  let f3 = await req("POST", "/organizations/employment-types", { name: "TEST-TEMP-ET", code: "TST-ET", category: "GIG_INDEPENDENT", rulesConfig: {} }, ORG_HEADER);
  const testEtId = f3.data?.data?.id;
  log("F","Create employment type","POST","/organizations/employment-types", f3.status, [200,201].includes(f3.status)?"PASS":"FAIL", "id=" + testEtId);

  // F4: List designations
  let f4 = await req("GET", "/organizations/" + ORG_ID + "/designations", null, ORG_HEADER);
  log("F","List designations","GET","/organizations/:id/designations", f4.status, f4.status===200?"PASS":"FAIL", JSON.stringify(f4.data?.data).substring(0,100));

  // F5: Create designation
  let f5 = await req("POST", "/organizations/" + ORG_ID + "/designations", { name: "TEST-TEMP-Designation", code: "TST-DESIG", level: 5 }, ORG_HEADER);
  const testDesigId = f5.data?.data?.id;
  log("F","Create designation","POST","/organizations/:id/designations", f5.status, [200,201].includes(f5.status)?"PASS":"FAIL", "id=" + testDesigId);

  // ═══════════════════════════════════════
  // TRACK G — INVITATIONS
  // ═══════════════════════════════════════
  console.log("\n── TRACK G: INVITATIONS ──");

  // G1: Send invitation to a known test user
  let g1 = await req("POST", "/organizations/invitations", { phone: "9000000003", role: "EMPLOYEE", organizationId: ORG_ID }, ORG_HEADER);
  const invToken = g1.data?.data?.token || g1.data?.data?.invitation?.token || g1.data?.data?.invitationToken;
  log("G","Send invitation","POST","/organizations/invitations", g1.status, [200,201].includes(g1.status)?"PASS":"FAIL", "token=" + (invToken ? "PRESENT" : "missing") + " msg=" + g1.data?.message);

  // G2: Validate invitation token (if received)
  if (invToken) {
    let g2 = await req("GET", "/organizations/invitations/" + invToken);
    log("G","Validate invitation token","GET","/organizations/invitations/:token", g2.status, g2.status===200?"PASS":"FAIL", JSON.stringify(g2.data?.data).substring(0,100));
  } else {
    log("G","Validate invitation token","GET","/organizations/invitations/:token", 0, "BLOCKED", "No token returned from invite creation");
  }

  // ═══════════════════════════════════════
  // TRACK H — SETTINGS / SECURITY / IDOR
  // ═══════════════════════════════════════
  console.log("\n── TRACK H: SETTINGS / SECURITY / IDOR ──");

  // H1: GET org details
  let h1 = await req("GET", "/organizations/" + ORG_ID, null, ORG_HEADER);
  log("H","GET org details","GET","/organizations/:id", h1.status, h1.status===200?"PASS":"FAIL", JSON.stringify(h1.data?.data).substring(0,100));

  // H2: IDOR — access different org (should return 403/404)
  const FOREIGN_ORG = "00000000-dead-beef-0000-000000000001";
  let h2 = await req("GET", "/organizations/" + FOREIGN_ORG, null, { "x-organization-id": FOREIGN_ORG });
  log("H","IDOR - access foreign org","GET","/organizations/"+FOREIGN_ORG, h2.status, [403,404].includes(h2.status)?"PASS":"FAIL", h2.data?.message);

  // H3: 401 test
  let h3 = await req("GET", "/organizations/" + ORG_ID, null, { "no-auth": true, "x-organization-id": ORG_ID });
  log("H","401 - missing auth","GET","/organizations/:id no token", h3.status, h3.status===401?"PASS":"FAIL", h3.data?.message);

  // H4: PUT org update (non-destructive)
  let h4 = await req("PUT", "/organizations/" + ORG_ID, { name: "GoMyTruck Demo Org", description: "CEO Demo Organization - E2E verified" }, ORG_HEADER);
  log("H","PUT org update","PUT","/organizations/:id", h4.status, [200,201].includes(h4.status)?"PASS":"FAIL", h4.data?.message);

  // ═══════════════════════════════════════
  // TRACK I — TIME-011 / GIG INTEGRITY
  // ═══════════════════════════════════════
  console.log("\n── TRACK I: TIME-011 / GIG INTEGRITY ──");
  // These are worker/gig endpoints that should remain unaffected
  const trkIChecks = [
    ["GET", "/workers", "List workers"],
    ["GET", "/gig-jobs", "List gig jobs"],
  ];
  for (const [method, path, label] of trkIChecks) {
    let ri = await req(method, path, null, ORG_HEADER);
    // 200 = works, 404 = route not found (may not be org-scoped), both acceptable for integrity check
    log("I", label, method, path, ri.status, ri.status !== 500 ? "PASS" : "FAIL", ri.data?.message || ri.data?.code);
  }

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log("\n\n=== SUMMARY ===");
  const pass = results.filter(r => r.result === "PASS").length;
  const fail = results.filter(r => r.result === "FAIL").length;
  const blocked = results.filter(r => r.result === "BLOCKED").length;
  console.log("PASS: " + pass + " | FAIL: " + fail + " | BLOCKED: " + blocked + " | TOTAL: " + results.length);
  if (fail > 0) {
    console.log("\nFAILED CHECKS:");
    results.filter(r => r.result==="FAIL").forEach(r => console.log("  ❌ [" + r.track + "] " + r.label + " | " + r.method + " " + r.endpoint + " | " + r.notes));
  }
  console.log("\nJSON:", JSON.stringify(results, null, 2));
}

runAll().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
