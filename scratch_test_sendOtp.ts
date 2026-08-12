import { AuthService } from './src/modules/auth/auth.service';
import { initializeRedis, getRedis } from './src/config/redis';
import { PrismaClient } from '@prisma/client';
import { env } from './src/config/env';

async function main() {
  console.log('Initializing Redis...');
  await initializeRedis();

  console.log('Sending OTP...');
  try {
    const result = await AuthService.sendOtp({ phone: '9852364101', role: 'CUSTOMER' as any });
    console.log('Result:', result);
  } catch (e) {
    console.error('Error in sendOtp:', e);
  }
  
  console.log('Cleaning up...');
  await getRedis().quit();
  process.exit(0);
}

main().catch(console.error);
