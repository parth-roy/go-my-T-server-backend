import * as AuthService from './src/modules/auth/auth.service';

async function main() {
  try {
    const res = await AuthService.sendOtp({ phone: '9852364101', role: 'CUSTOMER' });
    console.log('Success:', res);
  } catch (e) {
    console.error('Error occurred:');
    console.error(e);
  }
}

main().catch(console.error);
