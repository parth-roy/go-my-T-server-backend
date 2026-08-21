import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL
});

async function run() {
  const leads = await prisma.formDriverLead.findMany({
    where: { phone: { in: ['9810884376', '9810189145', '8444058001'] } } 
  });

  console.log(leads.map(l => ({ phone: l.phone, city: l.city, state: l.state, givenState: l.givenState })));
}

run().finally(() => prisma.$disconnect());
