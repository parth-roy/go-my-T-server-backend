const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";
const DEPT_ID = "4bd88b04-230d-481b-acbd-8c3767990837";
const ORG_HEADER = { "x-organization-id": ORG_ID };
let TOKEN = null;

async function req(method, path, body, headers={}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (TOKEN) h["Authorization"] = "Bearer "+TOKEN;
  delete h["no-auth"];
  const res = await fetch(API+path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch(e) { data = {}; }
  return { status: res.status, data };
}

async function main() {
  await req("POST", "/auth/send-otp", { phone: "9000000002", role: "CUSTOMER" }, {"no-auth":true});
  const tv = await req("POST", "/auth/verify-otp", { phone: "9000000002", otp: "123456" }, {"no-auth":true});
  TOKEN = tv.data.data.accessToken;
  console.log("Token OK\n");

  // Test each failing endpoint and dump full error
  const tests = [
    ["GET", "/organizations/branches/"+BRANCH_ID+"/departments", ORG_HEADER, "D1 - List Departments (500)"],
    ["GET", "/organizations/branches/"+BRANCH_ID+"/departments/"+DEPT_ID+"/teams", ORG_HEADER, "E1 - List Teams (500)"],
    ["GET", "/organizations/members", ORG_HEADER, "F1 - List Members (403)"],
    ["GET", "/organizations/employment-types", ORG_HEADER, "F2 - List Employment Types (403)"],
    ["GET", "/organizations/"+ORG_ID+"/designations", ORG_HEADER, "F4 - List Designations (500)"],
    // Also test: branches list (403 from Track C)
    ["GET", "/organizations/branches", ORG_HEADER, "C1 - List Branches (403)"],
  ];

  for (const [method, path, headers, label] of tests) {
    const r = await req(method, path, null, headers);
    console.log("=== " + label + " ===");
    console.log("HTTP:", r.status);
    console.log("BODY:", JSON.stringify(r.data, null, 2).substring(0, 400));
    console.log();
  }
}
main().catch(e => { console.error("ERR:", e); });
