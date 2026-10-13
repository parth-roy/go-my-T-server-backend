import { PrismaClient, UserRole, BookingStatus, BookingMode, BidWindowStatus, VehicleType, BookingChannel } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  gujarat: { lat: 23.0225, lng: 72.5714 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  pune: { lat: 18.5204, lng: 73.8567 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  patna: { lat: 25.5941, lng: 85.1376 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  odhav: { lat: 22.9926, lng: 72.6593 },
  narol: { lat: 22.9723, lng: 72.5932 },
};

function resolveCoords(addressOrCity: string | null | undefined): { lat: number; lng: number } {
  const text = (addressOrCity || '').toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (text.includes(city)) return coords;
  }
  return { lat: 23.0225, lng: 72.5714 }; // Default to Ahmedabad / Gujarat if not matched
}

function mapVehicleType(v: string | null | undefined): VehicleType {
  const s = (v || '').toUpperCase();
  if (s.includes('32') || s.includes('CONTAINER') || s.includes('TRAILER')) return VehicleType.CONTAINER_32FT;
  if (s.includes('20')) return VehicleType.TRUCK_20FT;
  if (s.includes('19')) return VehicleType.TRUCK_19FT;
  if (s.includes('17')) return VehicleType.TRUCK_17FT;
  if (s.includes('14')) return VehicleType.TRUCK_14FT;
  if (s.includes('BOLERO')) return VehicleType.BOLERO_PICKUP;
  if (s.includes('DOST')) return VehicleType.ASHOK_LEYLAND_DOST;
  if (s.includes('JEETO')) return VehicleType.MAHINDRA_JEETO;
  if (s.includes('INTRA')) return VehicleType.TATA_INTRA;
  if (s.includes('ACE')) return VehicleType.TATA_ACE;
  if (s.includes('MINI')) return VehicleType.MINI_TRUCK;
  if (s.includes('THREE') || s.includes('AUTO') || s.includes('3 WHEEL')) return VehicleType.THREE_WHEELER;
  if (s.includes('BIKE')) return VehicleType.BIKE;
  return VehicleType.TATA_ACE;
}

async function main() {
  console.log('--- STARTING WHATSAPP LEADS BACKFILL TO BOOKINGS ---');
  const inquiries = await prisma.whatsAppInquiry.findMany();
  console.log(`Found ${inquiries.length} total WhatsApp inquiries.`);

  // Find default fallback user
  let defaultUser = await prisma.user.findFirst({
    where: { role: { in: [UserRole.CUSTOMER, UserRole.ADMIN] } },
  });
  if (!defaultUser) defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.error('No users found in database!');
    return;
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const inq of inquiries) {
    // 1. Check if booking already exists with this exact ID
    const existingById = await prisma.booking.findUnique({
      where: { id: inq.id },
      include: { bidWindow: true },
    });

    if (existingById) {
      if (!existingById.bidWindow) {
        await prisma.bidWindow.create({
          data: {
            bookingId: existingById.id,
            status: BidWindowStatus.OPEN,
            closesAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          },
        });
        console.log(`Opened missing BidWindow for Booking #${existingById.bookingNumber}`);
      } else if (
        existingById.bidWindow.status === BidWindowStatus.OPEN &&
        existingById.bidWindow.closesAt.getTime() <= Date.now()
      ) {
        await prisma.bidWindow.update({
          where: { id: existingById.bidWindow.id },
          data: { closesAt: new Date(Date.now() + 30 * 24 * 3600 * 1000) },
        });
        console.log(`Extended BidWindow for Booking #${existingById.bookingNumber}`);
      }
      skippedCount++;
      continue;
    }

    // 2. Find or create customer user for this inquiry
    let customerId = defaultUser.id;
    if (inq.phone && inq.phone.trim().length >= 10) {
      const cleanPhone = inq.phone.replace(/\D/g, '').slice(-10);
      let user = await prisma.user.findFirst({
        where: { phone: { contains: cleanPhone } },
      });
      if (user) {
        customerId = user.id;
      }
    }

    // 3. Generate unique bookingNumber
    let bookingNumber = inq.inquiryNumber;
    const existingByNo = await prisma.booking.findUnique({ where: { bookingNumber } });
    if (existingByNo) {
      bookingNumber = `BK-${inq.inquiryNumber}-${inq.id.slice(0, 4).toUpperCase()}`;
    }

    const pCoords = resolveCoords(inq.pickupCity || inq.city);
    const dCoords = resolveCoords(inq.dropCity || inq.city);
    const pickupAddress = inq.pickupCity || inq.city || 'Hub Location';
    const dropAddress = inq.dropCity || inq.city || 'Delivery Point';
    const vehicleType = mapVehicleType(inq.vehicleType);

    // 4. Create the Booking with ID = inq.id
    try {
      const booking = await prisma.booking.create({
        data: {
          id: inq.id, // EXACT SAME ID AS WHATSAPP INQUIRY!
          bookingNumber,
          customerId,
          pickupLat: pCoords.lat,
          pickupLng: pCoords.lng,
          pickupAddress,
          vehicleType,
          goodsType: inq.goodsType || 'General Cargo',
          goodsWeightKg: 1000,
          estimatedDistance: 18.5,
          totalFare: 2500,
          grandTotal: 2500,
          baseFare: 2000,
          status: BookingStatus.CONFIRMED,
          bookingMode: BookingMode.PRIVATE_BID,
          bookingChannel: BookingChannel.CUSTOMER_AUCTION,
          receiverName: inq.name || 'Verified Consignee',
          receiverPhone: inq.phone || '',
          stops: {
            create: [
              {
                sequence: 1,
                latitude: dCoords.lat,
                longitude: dCoords.lng,
                address: dropAddress,
                receiverName: inq.name || 'Verified Consignee',
                receiverPhone: inq.phone || '',
              },
            ],
          },
          bidWindow: {
            create: {
              status: BidWindowStatus.OPEN,
              closesAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days open window
            },
          },
        },
      });

      console.log(`Created backing Booking #${booking.bookingNumber} with ID ${booking.id} (${inq.name} - ${inq.phone})`);
      createdCount++;
    } catch (err: any) {
      console.error(`Failed to create booking for inq ${inq.id}:`, err.message);
    }
  }

  console.log(`--- FINISHED: ${createdCount} created with exact inquiry ID, ${skippedCount} already existed ---`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
