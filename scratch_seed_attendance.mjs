import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmohjkq670001t1zqmn59hnom';
    
    // 1. Get or Create Main Work Schedule
    let schedule = await prisma.workSchedule.findFirst({
        where: { companyId }
    });
    
    if (!schedule) {
        console.log("Creating main work schedule...");
        schedule = await prisma.workSchedule.create({
            data: {
                name: "الدوام الرسمي (الجمعة إجازة)",
                checkInTime: "08:00",
                checkOutTime: "17:00",
                workDays: JSON.stringify(["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"]), // Friday off
                lateToleranceMinutes: 15,
                overtimeStartAfter: 60,
                companyId
            }
        });
        console.log(`Work schedule created with ID: ${schedule.id}`);
    } else {
        console.log(`Using existing work schedule with ID: ${schedule.id}`);
    }
    
    // 2. Link all employees to the schedule
    console.log("Linking employees to work schedule...");
    const employees = await prisma.employee.findMany({
        where: { companyId }
    });
    
    for (const emp of employees) {
        await prisma.employee.update({
            where: { id: emp.id },
            data: { workScheduleId: schedule.id }
        });
    }
    console.log(`Linked ${employees.length} employees to schedule.`);
    
    // 3. Generate attendance for June 2026
    console.log("Generating attendance records for June 2026...");
    const daysInJune = 30;
    const year = 2026;
    const month = 5; // June is 0-indexed 5
    
    // Clear any existing attendance for June 2026 for this company
    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, month, 30, 23, 59, 59));
    
    await prisma.attendanceRecord.deleteMany({
        where: {
            companyId,
            date: { gte: startDate, lte: endDate }
        }
    });
    
    for (let day = 1; day <= daysInJune; day++) {
        const date = new Date(Date.UTC(year, month, day));
        const dayOfWeek = date.getUTCDay(); // 5 = Friday
        
        if (dayOfWeek === 5) {
            // Friday is day off, skip generating attendance records
            continue;
        }
        
        for (const emp of employees) {
            const rand = Math.random();
            let status = 'present';
            let checkIn = null;
            let checkOut = null;
            let workHours = 0;
            let lateMinutes = 0;
            let overtimeHours = 0;
            
            if (rand < 0.70) {
                // Present (On Time)
                status = 'present';
                const checkInHour = 7;
                const checkInMin = 45 + Math.floor(Math.random() * 30); // 7:45 - 8:15
                checkIn = new Date(Date.UTC(year, month, day, checkInHour, checkInMin, 0));
                
                const checkOutHour = 17;
                const checkOutMin = Math.floor(Math.random() * 15); // 17:00 - 17:15
                checkOut = new Date(Date.UTC(year, month, day, checkOutHour, checkOutMin, 0));
                
                workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            } else if (rand < 0.92) {
                // Present (Late)
                status = 'late';
                const checkInHour = 8;
                const checkInMin = 16 + Math.floor(Math.random() * 60); // 8:16 - 9:15
                checkIn = new Date(Date.UTC(year, month, day, checkInHour, checkInMin, 0));
                
                // Calculate late minutes relative to 08:00
                lateMinutes = (checkInHour - 8) * 60 + checkInMin;
                
                const checkOutHour = 17;
                const checkOutMin = Math.floor(Math.random() * 15); // 17:00 - 17:15
                checkOut = new Date(Date.UTC(year, month, day, checkOutHour, checkOutMin, 0));
                
                workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
            } else {
                // Present (With Overtime)
                status = 'present';
                const checkInHour = 7;
                const checkInMin = 50 + Math.floor(Math.random() * 15); // 7:50 - 8:05
                checkIn = new Date(Date.UTC(year, month, day, checkInHour, checkInMin, 0));
                
                const checkOutHour = 18 + Math.floor(Math.random() * 2); // 18:00 - 19:30
                const checkOutMin = Math.floor(Math.random() * 30);
                checkOut = new Date(Date.UTC(year, month, day, checkOutHour, checkOutMin, 0));
                
                workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
                
                // Overtime relative to 17:00 (since they checked out after 18:00)
                const targetCheckOut = new Date(Date.UTC(year, month, day, 17, 0, 0));
                overtimeHours = (checkOut.getTime() - targetCheckOut.getTime()) / (1000 * 60 * 60);
            }
            
            await prisma.attendanceRecord.create({
                data: {
                    employeeId: emp.id,
                    date,
                    checkIn,
                    checkOut,
                    status,
                    workHours,
                    lateMinutes,
                    overtimeHours,
                    companyId
                }
            });
        }
    }
    
    console.log("Finished seeding June 2026 attendance!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
