const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
let TOKEN = null;

async function req(method, path, body, extraHeaders={}) {
  const h = { "Content-Type": "application/json", "x-organization-id": ORG_ID, ...extraHeaders };
  if (TOKEN) h["Authorization"] = "Bearer "+TOKEN;
  const res = await fetch(API+path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch(e) { data = {}; }
  console.log(method, path, "→", res.status, JSON.stringify(data).substring(0,200));
  return { status: res.status, data };
}

async function main() {
  await req("POST", "/auth/send-otp", { phone: "9000000002", role: "CUSTOMER" }, {"x-organization-id": undefined});
  const tv = await fetch(API+"/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "9000000002", otp: "123456" })
  });
  const tvd = await tv.json();
  TOKEN = tvd.data.accessToken;
  console.log("TOKEN:", TOKEN ? "OK" : "MISSING");

  // Re-test failing endpoints with x-org-id header explicitly
  await req("GET", "/organizations/branches");
  await req("GET", "/organizations/members");
  await req("GET", "/organizations/employment-types");
  await req("GET", "/organizations/"+ORG_ID+"/designations");
  await req("GET", "/organizations/branches/36b4eee8-2ce1-4c33-aa1c-91819371b290/departments");
  await req("GET", "/organizations/branches/36b4eee8-2ce1-4c33-aa1c-91819371b290/departments/4bd88b04-230d-481b-acbd-8c3767990837/teams");
}
main().catch(e => console.error("ERR:", e));
