const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";

async function main() {
  await fetch(API+"/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: "9000000002", role: "CUSTOMER" }) });
  const tv = await fetch(API+"/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "9000000002", otp: "123456" })
  });
  const tvd = await tv.json();
  const token = tvd.data.accessToken;

  const res = await fetch(API+"/organizations/branches/"+BRANCH_ID+"/departments?limit=10&page=1", {
    headers: { "Authorization": "Bearer "+token, "x-organization-id": ORG_ID }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
main().catch(console.error);
