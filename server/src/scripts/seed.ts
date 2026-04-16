import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = 'default123'; // 开发环境默认密码
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

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
        password: hashedPassword,
      },
    });
    console.log(`Created default user with id: ${user.id}`);
    console.log(`Email: default@localhost`);
    console.log(`Password: ${defaultPassword}`);
  } else {
    console.log(`Default user already exists with id: ${existingUser.id}`);
    console.log(`Email: default@localhost`);
    console.log(`Password: ${defaultPassword}`);
    // 如果密码不是 bcrypt hash，更新它
    if (!existingUser.password.startsWith('$2')) {
      console.log('Updating password to bcrypt hash...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword },
      });
      console.log('Password updated successfully');
    }
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
