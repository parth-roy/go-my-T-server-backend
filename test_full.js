const env = Object.assign({}, process.env, { NODE_ENV: 'development', PORT: 8888, RAZORPAYX_PAYOUTS_ENABLED: 'false', MULTI_PARTY_TRANSFERS_ENABLED: 'false', PRIVATE_BID: 'false' });
const { spawn } = require('child_process');
const server = spawn('npm', ['run', 'dev'], { env, cwd: process.cwd(), shell: true });

server.stdout.on('data', d => console.log('OUT:', d.toString()));
server.stderr.on('data', d => console.log('ERR:', d.toString()));

setTimeout(async () => {
  try {
    const API = "http://localhost:8888/api/v1";
    console.log("SENDING REQUESTS TO LOCAL SERVER");
    
    // Auth
    await fetch(API+"/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: "9000000002", role: "CUSTOMER" }) });
    const tv = await fetch(API+"/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "9000000002", otp: "123456" })
    });
    const tvd = await tv.json();
    const token = tvd.data.accessToken;

    const ORG_ID = "631f488a-b898-41db-9bc6-a874e5f234a2";
    const BRANCH_ID = "36b4eee8-2ce1-4c33-aa1c-91819371b290";

    const resD = await fetch(API+"/organizations/branches/"+BRANCH_ID+"/departments", {
      headers: { "Authorization": "Bearer "+token, "x-organization-id": ORG_ID }
    });
    console.log("DEPT LIST:", resD.status, await resD.text());
  } catch(e) {
    console.log("FETCH ERROR:", e);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 8000); // give it 8 seconds to start
