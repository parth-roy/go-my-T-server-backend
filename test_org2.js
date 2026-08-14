const axios = require('axios');
const API = 'https://api-test.gomytruck.com/api/v1';

async function runTests() {
  try {
    console.log('1. Authenticating...');
    await axios.post(API + '/auth/send-otp', { phone: '9000000002', role: 'CUSTOMER' });
    const authRes = await axios.post(API + '/auth/verify-otp', { phone: '9000000002', otp: '123456', role: 'CUSTOMER' });
    const token = authRes.data.data.accessToken;
    const headers = { Authorization: 'Bearer ' + token, 'x-organization-id': '631f488a-b898-41db-9bc6-a874e5f234a2' };

    console.log('2. Testing /organizations/me...');
    const orgsRes = await axios.get(API + '/organizations/me', { headers: { Authorization: 'Bearer ' + token } });
    console.log('/organizations/me:', orgsRes.data.data.length, 'orgs found');

    console.log('3. Testing Branch CRUD...');
    const bCreate = await axios.post(API + '/organizations/branches', { name: 'Test Branch ' + Date.now(), address: '123 Test St', city: 'Testville', state: 'TS', postalCode: '123456' }, { headers });
    const branchId = bCreate.data.data.id;
    console.log('Branch created:', branchId);
    
    console.log('4. Testing Department CRUD...');
    const dCreate = await axios.post(API + '/organizations/departments', { name: 'Test Dept ' + Date.now(), branchId }, { headers });
    const deptId = dCreate.data.data.id;
    console.log('Department created:', deptId);
    
    console.log('5. Testing Team CRUD...');
    const tCreate = await axios.post(API + '/organizations/teams', { name: 'Test Team ' + Date.now(), departmentId: deptId }, { headers });
    const teamId = tCreate.data.data.id;
    console.log('Team created:', teamId);

    console.log('6. Testing Designations...');
    const desCreate = await axios.post(API + '/organizations/designations', { title: 'Test Designation ' + Date.now(), level: 1 }, { headers });
    const desId = desCreate.data.data.id;
    console.log('Designation created:', desId);
    
    console.log('7. Testing Employment Types...');
    const empCreate = await axios.post(API + '/organizations/employment-types', { name: 'Full Time Test ' + Date.now(), code: 'FTT' + Date.now().toString().slice(-4) }, { headers });
    console.log('Employment Type created:', empCreate.data.data.id);
    
    console.log('8. Testing Members...');
    const membersRes = await axios.get(API + '/organizations/members', { headers });
    console.log('Members retrieved:', membersRes.data.data.length);

    console.log('9. Testing Invitations...');
    // We append random suffix to avoid unique constraint if we run this multiple times
    const invRes = await axios.post(API + '/organizations/invitations', { phone: '900000000' + Math.floor(Math.random() * 10), role: 'EMPLOYEE', branchId, departmentId: deptId }, { headers });
    console.log('Invitation sent:', invRes.data.data.id);
    
    console.log('10. Testing Settings...');
    const settingsRes = await axios.get(API + '/organizations/settings', { headers });
    console.log('Settings retrieved:', settingsRes.data.data.id);

    console.log('ALL TESTS PASSED SUCCESSFULLY');
  } catch (e) {
    console.error('TEST FAILED:', e.response ? e.response.status + ' ' + JSON.stringify(e.response.data) : e.message);
  }
}
runTests();
