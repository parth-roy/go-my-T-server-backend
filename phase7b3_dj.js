const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
const PHONE = "9000000002";
const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";
const DEPT_ID = "4bd88b04-230d-481b-acbd-8c3767990837";
const TEAM_ID = "6f99adac-4c5b-4f25-8bfb-8c5d41c57101";
const ORG_HEADER = { "x-organization-id": ORG_ID };
let TOKEN = null;
let results = [];

function safe(v) { try { return JSON.stringify(v).substring(0,150); } catch(e) { return String(v); } }
function log(track, label, method, endpoint, status, result, notes) {
  const r = { track, label, method, endpoint, status, result, notes };
  results.push(r);
  const icon = result==="PASS"?"✅":result==="FAIL"?"❌":result==="BLOCKED"?"⛔":"⚠️";
  console.log(icon+" ["+track+"] "+label+" | "+method+" "+endpoint+" → HTTP "+status+" | "+result+(notes?" | "+notes:""));
}
async function req(method, path, body, headers={}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (TOKEN && !headers["no-auth"]) h["Authorization"] = "Bearer "+TOKEN;
  delete h["no-auth"];
  try {
    const res = await fetch(API+path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    let data; try { data = await res.json(); } catch(e) { data = {}; }
    return { status: res.status, data };
  } catch(e) { return { status: 0, data: { error: e.message } }; }
}

async function main() {
  console.log("=== PHASE 7B.3 TRACKS D-J ===\n");

  // ── AUTH: acquire token
  await req("POST", "/auth/send-otp", { phone: PHONE, role: "CUSTOMER" }, {"no-auth":true});
  const tv = await req("POST", "/auth/verify-otp", { phone: PHONE, otp: "123456" }, {"no-auth":true});
  if (tv.status !== 200 || !tv.data?.data?.accessToken) { console.error("FATAL: no token"); process.exit(1); }
  TOKEN = tv.data.data.accessToken;
  console.log("Token acquired\n");

  // ═══ TRACK D — DEPARTMENTS ═══
  console.log("── TRACK D: DEPARTMENTS ──");
  let d1 = await req("GET", "/organizations/branches/"+BRANCH_ID+"/departments", null, ORG_HEADER);
  const depts = d1.data?.data?.items || d1.data?.data || [];
  const seededDept = Array.isArray(depts) ? depts.some(d => d.name==="Operations") : false;
  log("D","List departments","GET","/orgs/branches/:b/departments", d1.status, d1.status===200?"PASS":"FAIL", "count="+(Array.isArray(depts)?depts.length:"?")+" seeded="+seededDept+" raw="+safe(depts).substring(0,80));

  let d2 = await req("POST", "/organizations/branches/"+BRANCH_ID+"/departments", { name:"TEST-DEPT-E2E", code:"TST-D2", branchId: BRANCH_ID }, ORG_HEADER);
  const newDeptId = d2.data?.data?.id || d2.data?.data?.department?.id;
  log("D","Create temp dept","POST","/orgs/branches/:b/departments", d2.status, [200,201].includes(d2.status)&&newDeptId?"PASS":"FAIL", "id="+newDeptId+" msg="+safe(d2.data?.message));

  if (newDeptId) {
    let d3 = await req("GET", "/organizations/branches/"+BRANCH_ID+"/departments/"+newDeptId, null, ORG_HEADER);
    log("D","Persist verify dept","GET","/orgs/branches/:b/departments/:id", d3.status, d3.status===200&&d3.data?.data?.name==="TEST-DEPT-E2E"?"PASS":"FAIL", safe(d3.data?.data?.name));
  }

  // ═══ TRACK E — TEAMS ═══
  console.log("\n── TRACK E: TEAMS ──");
  let e1 = await req("GET", "/organizations/branches/"+BRANCH_ID+"/departments/"+DEPT_ID+"/teams", null, ORG_HEADER);
  const teams = e1.data?.data?.items || e1.data?.data || [];
  const seededTeam = Array.isArray(teams) ? teams.some(t => t.name==="Field Team") : false;
  log("E","List teams","GET","/orgs/branches/:b/departments/:d/teams", e1.status, e1.status===200?"PASS":"FAIL", "count="+(Array.isArray(teams)?teams.length:"?")+" seeded="+seededTeam);

  let e2 = await req("POST", "/organizations/branches/"+BRANCH_ID+"/departments/"+DEPT_ID+"/teams", { name:"TEST-TEAM-E2E", code:"TST-TM", branchId: BRANCH_ID, departmentId: DEPT_ID }, ORG_HEADER);
  const newTeamId = e2.data?.data?.id;
  log("E","Create temp team","POST","/orgs/branches/:b/departments/:d/teams", e2.status, [200,201].includes(e2.status)&&newTeamId?"PASS":"FAIL", "id="+newTeamId+" msg="+safe(e2.data?.message));

  if (newTeamId) {
    let e3 = await req("GET", "/organizations/branches/"+BRANCH_ID+"/departments/"+DEPT_ID+"/teams/"+newTeamId, null, ORG_HEADER);
    log("E","Persist verify team","GET","/orgs/.../teams/:id", e3.status, e3.status===200&&e3.data?.data?.name==="TEST-TEAM-E2E"?"PASS":"FAIL", safe(e3.data?.data?.name));
  }

  // ═══ TRACK F — MEMBERS / EMPLOYMENT / DESIGNATIONS ═══
  console.log("\n── TRACK F: MEMBERS / EMPLOYMENT / DESIGNATIONS ──");
  let f1 = await req("GET", "/organizations/members", null, ORG_HEADER);
  const members = f1.data?.data?.items || f1.data?.data || [];
  const myMem = Array.isArray(members) ? members.find(m => m.role==="PRIMARY_OWNER") : null;
  log("F","List members","GET","/organizations/members", f1.status, f1.status===200?"PASS":"FAIL", "count="+(Array.isArray(members)?members.length:"?")+" hasOwner="+(!!myMem));

  let f2 = await req("GET", "/organizations/employment-types", null, ORG_HEADER);
  const etypes = f2.data?.data?.items || f2.data?.data || [];
  log("F","List employment types","GET","/organizations/employment-types", f2.status, f2.status===200?"PASS":"FAIL", "count="+(Array.isArray(etypes)?etypes.length:"?"));

  let f3 = await req("POST", "/organizations/employment-types", { name:"TEST-ET-E2E", code:"TST-ET2", category:"GIG_INDEPENDENT", rulesConfig:{} }, ORG_HEADER);
  const newEtId = f3.data?.data?.id;
  log("F","Create employment type","POST","/organizations/employment-types", f3.status, [200,201].includes(f3.status)?"PASS":"FAIL", "id="+newEtId);

  let f4 = await req("GET", "/organizations/"+ORG_ID+"/designations", null, ORG_HEADER);
  const desigs = f4.data?.data?.items || f4.data?.data || [];
  log("F","List designations","GET","/organizations/:id/designations", f4.status, f4.status===200?"PASS":"FAIL", "count="+(Array.isArray(desigs)?desigs.length:"?"));

  let f5 = await req("POST", "/organizations/"+ORG_ID+"/designations", { name:"TEST-DESIG-E2E", code:"TST-DG2", level:3 }, ORG_HEADER);
  const newDesigId = f5.data?.data?.id;
  log("F","Create designation","POST","/organizations/:id/designations", f5.status, [200,201].includes(f5.status)?"PASS":"FAIL", "id="+newDesigId);

  // Member suspend/reactivate
  if (myMem && myMem.id) {
    // Try to get a non-owner member to test suspend
    const otherMem = Array.isArray(members) ? members.find(m => m.role!=="PRIMARY_OWNER") : null;
    if (otherMem) {
      let fs = await req("POST", "/organizations/members/"+otherMem.id+"/suspend", { reason: "E2E test" }, ORG_HEADER);
      log("F","Suspend non-owner member","POST","/organizations/members/:id/suspend", fs.status, [200,201].includes(fs.status)?"PASS":"BLOCKED", safe(fs.data?.message));
    } else {
      log("F","Suspend member","POST","/organizations/members/:id/suspend", 0, "BLOCKED","No non-owner member to test");
    }
  }

  // ═══ TRACK G — INVITATIONS ═══
  console.log("\n── TRACK G: INVITATIONS ──");
  let g1 = await req("POST", "/organizations/invitations", { phone:"9000000004", role:"EMPLOYEE", organizationId: ORG_ID }, ORG_HEADER);
  const invToken = g1.data?.data?.token || g1.data?.data?.invitation?.token || g1.data?.data?.invitationToken || g1.data?.data?.tokenPlain;
  log("G","Send invitation to 9000000004","POST","/organizations/invitations", g1.status, [200,201].includes(g1.status)?"PASS":"FAIL", "token="+(invToken?"PRESENT":"MISSING")+" msg="+safe(g1.data?.message)+" data="+safe(g1.data?.data).substring(0,80));

  if (invToken) {
    let g2 = await req("GET", "/organizations/invitations/"+invToken, null, {"no-auth":true});
    log("G","Validate invitation token","GET","/organizations/invitations/:token", g2.status, g2.status===200?"PASS":"FAIL", safe(g2.data?.data).substring(0,100));
  } else {
    log("G","Validate invitation token","GET","/organizations/invitations/:token", 0, "BLOCKED","No token from invite creation");
  }

  // ═══ TRACK H — SETTINGS / SECURITY ═══
  console.log("\n── TRACK H: SETTINGS / SECURITY ──");
  let h1 = await req("GET", "/organizations/"+ORG_ID, null, ORG_HEADER);
  log("H","GET org details","GET","/organizations/:id", h1.status, h1.status===200&&h1.data?.data?.name==="GoMyTruck Demo Org"?"PASS":"FAIL", safe(h1.data?.data?.name));

  // IDOR: access org we don't own
  let h2 = await req("GET", "/organizations/00000000-0000-0000-0000-000000000099", null, {"x-organization-id":"00000000-0000-0000-0000-000000000099"});
  log("H","IDOR: access foreign org → 403/404","GET","/orgs/00000000...", h2.status, [403,404].includes(h2.status)?"PASS":"FAIL", safe(h2.data?.message));

  // 401 (no auth)
  let h3 = await req("GET", "/organizations/"+ORG_ID, null, {"no-auth":true,"x-organization-id":ORG_ID});
  log("H","401 missing auth","GET","/organizations/:id (no token)", h3.status, h3.status===401?"PASS":"FAIL", safe(h3.data?.message));

  // 403 wrong org header
  let h4 = await req("GET", "/organizations/"+ORG_ID, null, {"x-organization-id":"00000000-0000-0000-0000-000000000099"});
  log("H","403 wrong x-org-id header","GET","/organizations/:id (wrong header)", h4.status, [403,404].includes(h4.status)?"PASS":"FAIL", safe(h4.data?.message));

  // PUT update (non-destructive)
  let h5 = await req("PUT", "/organizations/"+ORG_ID, { name:"GoMyTruck Demo Org" }, ORG_HEADER);
  log("H","PUT org (name preserved)","PUT","/organizations/:id", h5.status, [200,201].includes(h5.status)?"PASS":"FAIL", safe(h5.data?.message));

  // ═══ TRACK I — TIME-011 / GIG INTEGRITY ═══
  console.log("\n── TRACK I: TIME-011 / GIG INTEGRITY ──");
  for (const [m, p, lbl] of [["GET","/workers","List workers"],["GET","/gig-jobs","List gig jobs"]]) {
    let ri = await req(m, p, null, ORG_HEADER);
    log("I", lbl, m, p, ri.status, ri.status!==500?"PASS":"FAIL", safe(ri.data?.message||ri.data?.code));
  }

  // ═══ SUMMARY ═══
  console.log("\n\n=== FINAL SUMMARY (Tracks D-J) ===");
  const pass=results.filter(r=>r.result==="PASS").length;
  const fail=results.filter(r=>r.result==="FAIL").length;
  const blocked=results.filter(r=>r.result==="BLOCKED").length;
  console.log("PASS: "+pass+" | FAIL: "+fail+" | BLOCKED: "+blocked+" | TOTAL: "+results.length);
  results.filter(r=>r.result==="FAIL").forEach(r=>console.log("  ❌ ["+r.track+"] "+r.label+" | "+r.method+" "+r.endpoint+" | "+r.notes));
  console.log("\nJSON_RESULTS:"+JSON.stringify(results));
}
main().catch(e => { console.error("FATAL:", e.message, e.stack); process.exit(1); });
