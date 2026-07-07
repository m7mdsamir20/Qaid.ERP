import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const superAdminEmail = 'admin@nizam.com';

    const existingAdmin = await prisma.user.findUnique({
        where: { email: superAdminEmail }
    });

    if (existingAdmin) {
        console.log('Super Admin already exists.');
        return;
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
        throw new Error('SEED_ADMIN_PASSWORD environment variable must be set before running seed.');
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Seed default company first
    const company = await prisma.company.upsert({
        where: { id: 'default-company-1' },
        update: {},
        create: {
            id: 'default-company-1',
            name: 'شركتي (الافتراضية)',
            email: 'info@company.com',
            currency: 'EGP',
            timezone: 'Africa/Cairo',
            calendarType: 'Gregorian',
            dateFormat: 'DD/MM/YYYY'
        }
    });

    console.log('Successfully configured default Company:', company.id);

    const superAdmin = await prisma.user.create({
        data: {
            name: 'مدير النظام الرئيسى',
            username: 'admin',
            phone: '01000000000',
            email: superAdminEmail,
            password: hashedPassword,
            role: 'superadmin',
            // No companyId required for superadmin based on our new schema
        }
    });

    console.log('Successfully created Super Admin:', superAdmin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
