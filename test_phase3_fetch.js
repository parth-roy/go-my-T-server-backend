const API = 'https://api-test.gomytruck.com/api/v1';

async function testPhase3() {
  console.log('--- PHASE 3: SECONDARY MARKETPLACE SMOKE TEST ---');
  try {
    const res = await fetch(API + '/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9000000002', role: 'CUSTOMER' })
    });
    const data = await res.json();
    console.log('Customer Send OTP Status:', res.status);
    console.log('Customer Send OTP Data:', data);
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testPhase3();
