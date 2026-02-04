import { prisma } from "../lib/prisma";

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
      },
    });
    
    console.log('📊 Používatelia v databáze:', users.length);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Heslo: ${user.password ? '✅ nastavené' : '❌ chýba'}`);
    });
  } catch (error) {
    console.error('Chyba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
