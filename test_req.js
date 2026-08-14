const API = "https://api-test.gomytruck.com/api/v1";
const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";
const DEPT_ID = "4bd88b04-230d-481b-acbd-8c3767990837";

async function main() {
  await fetch(API+"/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: "9000000002", role: "CUSTOMER" }) });
  const tv = await fetch(API+"/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "9000000002", otp: "123456" })
  });
  const tvd = await tv.json();
  const token = tvd.data.accessToken;

  // Let's do department list
  const resD = await fetch(API+"/organizations/branches/"+BRANCH_ID+"/departments", {
    headers: { "Authorization": "Bearer "+token, "x-organization-id": ORG_ID }
  });
  console.log("Dept:", await resD.text());

  // Let's do teams list
  const resT = await fetch(API+"/organizations/branches/"+BRANCH_ID+"/departments/"+DEPT_ID+"/teams", {
    headers: { "Authorization": "Bearer "+token, "x-organization-id": ORG_ID }
  });
  console.log("Team:", await resT.text());

  // Let's do designations list
  const resG = await fetch(API+"/organizations/"+ORG_ID+"/designations", {
    headers: { "Authorization": "Bearer "+token, "x-organization-id": ORG_ID }
  });
  console.log("Desig:", await resG.text());
}
main().catch(console.error);
