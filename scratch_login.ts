import axios from 'axios';

const API_BASE = 'https://api-test.gomytruck.com/api/v1';

export async function getTestClient(phone = '+919999999999') {
  // 1. Initiate Login
  const initRes = await axios.post(`${API_BASE}/auth/login`, {
    phoneNumber: phone,
    role: 'CUSTOMER'
  });
  
  if (!initRes.data.success) {
    throw new Error('Login failed: ' + JSON.stringify(initRes.data));
  }
  
  // 2. Verify OTP (mock OTP if test user, or maybe it is returned? usually fixed like 123456 or 000000 for test users)
  // Let's assume 123456 for test environments or we check the DB for the OTP
  let otp = '123456'; 
  
  const verifyRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
    phoneNumber: phone,
    otp: otp,
    role: 'CUSTOMER'
  }).catch(e => e.response);
  
  if (verifyRes.data && verifyRes.data.success) {
    const token = verifyRes.data.data.accessToken;
    const client = axios.create({
      baseURL: API_BASE,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return { client, token, user: verifyRes.data.data.user };
  }
  
  throw new Error('OTP verification failed: ' + JSON.stringify(verifyRes?.data || verifyRes));
}
