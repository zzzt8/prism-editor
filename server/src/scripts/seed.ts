import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if any ProductTemplate exists
  const existingTemplates = await prisma.productTemplate.findMany({
    take: 1,
  });

  if (existingTemplates.length === 0) {
    console.log('Creating default ProductTemplate...');
    const template = await prisma.productTemplate.create({
      data: {
        name: 'Default Product Template',
        description: 'A default product template for image composition',
        version: '1.0.0',
        content: JSON.stringify({
          inputs: [],
          assets: [],
          designParams: [],
          preview: {
            flow: null,
            bindings: [],
          },
          production: {
            flow: null,
            bindings: [],
          },
        }),
      },
    });
    console.log(`Created default ProductTemplate with id: ${template.id}`);
  } else {
    console.log(`ProductTemplate already exists with id: ${existingTemplates[0].id}`);
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
