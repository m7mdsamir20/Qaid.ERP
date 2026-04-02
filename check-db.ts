
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.findFirst()
  console.log('Company Logo in DB:', company?.logo)
  process.exit(0)
}

main()
