import { NextRequest, NextResponse } from 'next/server';
import { withProtection } from '@/lib/apiHandler';
import fs from 'fs';
import path from 'path';

// Path to the SQLite database
const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

export const GET = withProtection(async (request, session) => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            return NextResponse.json({ error: "Database file not found" }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(DB_PATH);

        // Return the file as a download
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/x-sqlite3',
                'Content-Disposition': `attachment; filename="erp_backup_${new Date().toISOString().split('T')[0]}.db"`,
            },
        });
    } catch (e: any) {
        return NextResponse.json({ error: "Backup failed: " + e.message }, { status: 500 });
    }
}, { requireAdmin: true });

export const POST = withProtection(async (request, session) => {
    try {
        const formData = await request.formData();
        const file = formData.get('backup') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Basic validation: must be a sqlite file (simple check)
        if (!file.name.endsWith('.db')) {
            return NextResponse.json({ error: "Invalid file format. Please upload a .db file" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 1. Create a safety backup of current DB before overwriting
        const backupPath = DB_PATH + '.pre-restore.bak';
        if (fs.existsSync(DB_PATH)) {
            fs.copyFileSync(DB_PATH, backupPath);
        }

        // 2. Write the new DB file
        fs.writeFileSync(DB_PATH, buffer);

        return NextResponse.json({ success: true, message: "تم استرداد البيانات بنجاح. يرجى تحديث الصفحة." });
    } catch (e: any) {
        return NextResponse.json({ error: "Restore failed: " + e.message }, { status: 500 });
    }
}, { requireAdmin: true });
