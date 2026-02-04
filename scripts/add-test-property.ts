import { prisma } from '../lib/prisma';

async function main() {
  const property = await prisma.property.create({
    data: {
      slug: `test-byt-${Date.now()}`,
      external_id: `test-${Date.now()}`,
      source: "MANUAL",
      title: "3 izbový byt, 68 m², Bratislava - Staré Mesto",
      description: "Ponúkame na predaj priestranný 3-izbový byt v centre Bratislavy.",
      city: "Bratislava",
      district: "Staré Mesto",
      address: "Palisády 50, Bratislava",
      price: 250000,
      area_m2: 68,
      price_per_m2: 3676.47,
      is_negotiable: false,
      rooms: 3,
      floor: 4,
      condition: "POVODNY",
      energy_certificate: "C",
      listing_type: "PREDAJ",
      property_type: "BYT",
      photos: JSON.stringify([
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
      ]),
      thumbnail_url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      photo_count: 3,
      source_url: "https://example.com",
      is_distressed: false,
      days_on_market: 5,
      first_listed_at: new Date(),
      status: "ACTIVE",
    }
  });
  
  console.log('✅ Created test property:', property.id);
  console.log('🏠 Title:', property.title);
  console.log('📷 Photos:', property.photo_count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
