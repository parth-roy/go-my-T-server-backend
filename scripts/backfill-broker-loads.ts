import { PrismaClient, UserRole, BookingStatus, BookingMode, BidWindowStatus } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  kolkata: { lat: 22.5726, lng: 88.3639 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  patna: { lat: 25.5941, lng: 85.1376 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
};

function resolveCoords(addressOrCity: string): { lat: number; lng: number } {
  const text = (addressOrCity || '').toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (text.includes(city)) return coords;
  }
  return { lat: 22.5726, lng: 88.3639 };
}

async function main() {
  console.log('--- STARTING BROKER LOAD BACKFILL & HEALTH CHECK ---');
  const brokerLoads = await prisma.brokerLoad.findMany();
  console.log(`Found ${brokerLoads.length} total broker loads in database.`);

  let customerUser = await prisma.user.findFirst({
    where: { role: { in: [UserRole.CUSTOMER, UserRole.ADMIN] } },
  });
  if (!customerUser) {
    customerUser = await prisma.user.findFirst();
  }
  if (!customerUser) {
    console.error('No users found in database!');
    return;
  }
  console.log(`Using default shipper user: ${customerUser.name || customerUser.phone} (${customerUser.id})`);

  let createdCount = 0;
  let healthyCount = 0;

  for (const load of brokerLoads) {
    let booking = load.sourceBookingId
      ? await prisma.booking.findUnique({
          where: { id: load.sourceBookingId },
          include: { bidWindow: true },
        })
      : null;

    if (booking) {
      if (!booking.bidWindow) {
        await prisma.bidWindow.create({
          data: {
            bookingId: booking.id,
            status: BidWindowStatus.OPEN,
            closesAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        });
        console.log(`Opened missing BidWindow for Booking #${booking.bookingNumber}`);
      } else if (
        booking.bidWindow.status === BidWindowStatus.OPEN &&
        booking.bidWindow.closesAt.getTime() <= Date.now()
      ) {
        await prisma.bidWindow.update({
          where: { id: booking.bidWindow.id },
          data: {
            closesAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        });
        console.log(`Extended expired BidWindow for Booking #${booking.bookingNumber}`);
      }
      healthyCount++;
      continue;
    }

    const pCoords = resolveCoords(load.pickupAddress || load.pickupCity);
    const dCoords = resolveCoords(load.dropAddress || load.dropCity);
    const fare = load.customerBudget || load.platformFinalPrice || 2500;
    const bookingNumber = 'BK-BL-' + load.id.slice(0, 8).toUpperCase();

    const auditLog = await prisma.brokerLoadAuditLog.findFirst({
      where: { loadId: load.id, action: 'LOAD_POSTED' },
      select: { actorId: true },
    });
    const effectiveUserId = auditLog?.actorId || customerUser.id;

    booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: effectiveUserId,
        pickupLat: pCoords.lat,
        pickupLng: pCoords.lng,
        pickupAddress: load.pickupAddress || load.pickupCity,
        vehicleType: load.vehicleType,
        goodsType: load.goodsType || 'General Goods',
        goodsWeightKg: load.goodsWeightKg,
        estimatedDistance: load.estimatedDistanceKm || 15,
        totalFare: fare,
        grandTotal: fare,
        baseFare: fare * 0.8,
        status: BookingStatus.CONFIRMED,
        bookingMode: BookingMode.PRIVATE_BID,
        bookingChannel: 'BROKER_DEMAND',
        bookingPersona: load.bookingPersona || 'INDIVIDUAL',
        truckCount: load.truckCount || 1,
        urgencyWindow: load.urgencyWindow || 'FLEXIBLE',
        slaExpiresAt: load.slaExpiresAt,
        stops: {
          create: [
            {
              sequence: 1,
              latitude: dCoords.lat,
              longitude: dCoords.lng,
              address: load.dropAddress || load.dropCity,
            },
          ],
        },
        bidWindow: {
          create: {
            status: BidWindowStatus.OPEN,
            closesAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        },
      },
      include: { bidWindow: true },
    });

    await prisma.brokerLoad.update({
      where: { id: load.id },
      data: { sourceBookingId: booking.id },
    });

    console.log(`Materialized backing Booking #${booking.bookingNumber} (${booking.id}) for BrokerLoad ${load.id}`);
    createdCount++;
  }

  console.log(`--- BACKFILL FINISHED: ${createdCount} created, ${healthyCount} already healthy ---`);
}

main()
  .catch((e) => {
    console.error('Backfill error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
