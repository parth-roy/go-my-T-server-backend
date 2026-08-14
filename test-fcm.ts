
import { env } from './src/config/env';
import { getMessaging } from './src/config/firebase';

async function testFCM() {
  console.log('Testing FCM...');
  try {
    const msg = getMessaging();
    const result = await msg.send({
      token: 'dummy_invalid_token',
      data: { test: '1' }
    });
    console.log('Result:', result);
  } catch (err) {
    console.log('FCM Error:', err);
  }
}
testFCM();

