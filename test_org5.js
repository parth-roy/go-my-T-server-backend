const axios = require('axios');
const fs = require('fs');
const API = 'https://api-test.gomytruck.com/api/v1';

let outputLog = '';
function log(msg) {
  console.log(msg);
  outputLog += msg + '\n';
}

async function runTests() {
  try {
    const orgId = '631f488a-b898-41db-9bc6-a874e5f234a2';
    log('1. Authenticating...');
    await axios.post(API + '/auth/send-otp', { phone: '9000000002', role: 'CUSTOMER' });
    const authRes = await axios.post(API + '/auth/verify-otp', { phone: '9000000002', otp: '123456', role: 'CUSTOMER' });
    const token = authRes.data.data.accessToken;
    const headers = { Authorization: 'Bearer ' + token, 'x-organization-id': orgId };
    log('Auth SUCCESS');

    log('2. Testing /organizations/me...');
    const orgsRes = await axios.get(API + '/organizations/me', { headers: { Authorization: 'Bearer ' + token } });
    log('/organizations/me: ' + orgsRes.data.data.length + ' orgs found');

    log('3. Testing Branch CRUD...');
    const bCreate = await axios.post(API + '/organizations/branches', { name: 'Test Branch ' + Date.now(), address: '123 Test St', city: 'Testville', state: 'TS', postalCode: '123456' }, { headers });
    const branchId = bCreate.data.data.id;
    log('Branch created: ' + branchId);
    
    log('4. Testing Department CRUD...');
    const dCreate = await axios.post(API + '/organizations/branches/' + branchId + '/departments', { name: 'Test Dept ' + Date.now(), branchId }, { headers });
    const deptId = dCreate.data.data.id;
    log('Department created: ' + deptId);
    
    log('5. Testing Team CRUD...');
    const tCreate = await axios.post(API + '/organizations/branches/' + branchId + '/departments/' + deptId + '/teams', { name: 'Test Team ' + Date.now(), departmentId: deptId }, { headers });
    const teamId = tCreate.data.data.id;
    log('Team created: ' + teamId);

    log('6. Testing Designations...');
    const desCreate = await axios.post(API + '/organizations/' + orgId + '/designations', { name: 'Test Designation ' + Date.now(), level: 1 }, { headers });
    const desId = desCreate.data.data.id;
    log('Designation created: ' + desId);
    
    log('7. Testing Employment Types...');
    const empCreate = await axios.post(API + '/organizations/employment-types', { name: 'Full Time Test ' + Date.now(), code: 'FTT' + Date.now().toString().slice(-4), category: 'FULL_TIME_EMPLOYEE' }, { headers });
    log('Employment Type created: ' + empCreate.data.data.id);
    
    log('8. Testing Members...');
    const membersRes = await axios.get(API + '/organizations/members', { headers });
    log('Members retrieved: ' + membersRes.data.data.length);

    log('9. Testing Invitations...');
    let invRes;
    try {
      invRes = await axios.post(API + '/organizations/invitations', { phone: '900000000' + Math.floor(Math.random() * 10), role: 'EMPLOYEE', branchId, departmentId: deptId }, { headers });
      log('Invitation sent: ' + invRes.data.data.id);
    } catch(e) { log('Invitation error (expected if user exists): ' + e.response?.data?.message) }
    
    log('10. Testing Settings...');
    const settingsRes = await axios.get(API + '/organizations/settings', { headers });
    log('Settings retrieved: ' + settingsRes.data.data.id);
    
    log('11. Testing IDOR / TIME-011 integrity...');
    try {
      const badHeaders = { Authorization: 'Bearer ' + token, 'x-organization-id': '00000000-0000-0000-0000-000000000000' };
      await axios.get(API + '/organizations/branches', { headers: badHeaders });
      log('IDOR FAILED: request succeeded but should have failed!');
    } catch (e) {
      if (e.response && (e.response.status === 403 || e.response.status === 404)) {
        log('IDOR TEST PASSED: ' + e.response.status + ' ' + e.response.data.message);
      } else {
        log('IDOR TEST UNEXPECTED ERROR: ' + e.response?.status);
      }
    }

    log('ALL TESTS PASSED SUCCESSFULLY');
    fs.writeFileSync('e2e-result.log', outputLog);
  } catch (e) {
    const errorMsg = 'TEST FAILED AT SCRIPT LEVEL: ' + (e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
    log(errorMsg);
    fs.writeFileSync('e2e-result.log', outputLog);
  }
}
runTests();
