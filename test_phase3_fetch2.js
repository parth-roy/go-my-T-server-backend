const API = 'https://api-test.gomytruck.com/api/v1';

async function testPhase3() {
  try {
    const res = await fetch(API + '/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9000000002', otp: '123456' })
    });
    const data = await res.json();
    console.log('Customer Verify OTP Status:', res.status);
    
    if (res.status === 200) {
      const token = data.data.accessToken;
      
      // Let's create a booking
      const bReq = await fetch(API + '/bookings/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
            vehicleType: 'TATA_ACE',
            serviceType: 'CITY',
            bookingMode: 'PRIVATE_BID'
        })
      });
      console.log('Draft Booking Status:', bReq.status);
      console.log(await bReq.json());
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}
testPhase3();
