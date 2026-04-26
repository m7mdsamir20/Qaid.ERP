import { NextRequest, NextResponse } from 'next/server';
import { withProtection } from '@/lib/apiHandler';
import path from 'path';
import fs from 'fs/promises';

export const POST = withProtection(async (request, session) => {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "لم يتم العثور على ملف" }, { status: 400 });
        }

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: "حجم الملف كبير جداً (الأقصى 5 ميجابايت)" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Sanitize filename
        let safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        if (!safeName || safeName.startsWith('.')) {
            safeName = 'file-' + Math.random().toString(36).substring(2, 7) + (path.extname(file.name) || '.png');
        }
        
        const filename = `logo-${Date.now()}-${safeName}`;

        // Ensure public/uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });

        // Save file locally
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        // Public URL
        const publicUrl = `/uploads/${filename}`;

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (e: any) {
        console.error("Upload Error:", e);
        return NextResponse.json({ success: false, error: "فشل الرفع: " + (e.message || "خطأ غير معروف") }, { status: 500 });
    }
});
