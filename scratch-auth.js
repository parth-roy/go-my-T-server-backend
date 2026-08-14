const https = require('https');
const axios = require('axios');
async function run() {
  try {
    const api = 'https://api-test.gomytruck.com/api/v1';
    let res = await axios.post(api + '/auth/send-otp', { phone: '9000000002', role: 'CUSTOMER' });
    console.log('sendOtp:', res.data);
    res = await axios.post(api + '/auth/verify-otp', { phone: '9000000002', otp: '123456', role: 'CUSTOMER' });
    console.log('verifyOtp:', res.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
