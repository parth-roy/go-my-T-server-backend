import axios from 'axios';
const API = 'https://api-test.gomytruck.com/api/v1';

async function testPhase3() {
  console.log('--- PHASE 3: SECONDARY MARKETPLACE SMOKE TEST ---');
  try {
    // 1. Customer Login
    let res = await axios.post(API + '/auth/send-otp', { phone: '9000000002', role: 'CUSTOMER' });
    console.log('Customer Send OTP:', res.data);
    
    // In test environment, OTP might be 123456 or we might need to get it from DB. 
    // Wait, user said "Do NOT assume OTP=123456 unless the TEST backend explicitly proves that behavior"
    // Let's check the OTP in DB.
  } catch (e) {
    console.log('Error:', e.response?.data || e.message);
  }
}
testPhase3();
