import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if default user exists
  const existingUser = await prisma.user.findFirst({
    where: { email: 'default@localhost' },
  });

  if (!existingUser) {
    console.log('Creating default user...');
    const user = await prisma.user.create({
      data: {
        email: 'default@localhost',
        name: 'Default User',
        password: 'default-password-hash', // In production, use bcrypt
      },
    });
    console.log(`Created default user with id: ${user.id}`);
  } else {
    console.log(`Default user already exists with id: ${existingUser.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
