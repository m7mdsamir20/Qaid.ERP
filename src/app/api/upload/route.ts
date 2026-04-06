import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session) => {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "لم يتم العثور على ملف" }, { status: 400 });
        }

        // Check file size (e.g., 5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: "حجم الملف كبير جداً (الأقصى 5 ميجابايت)" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Better sanitization for non-latin filenames
        let safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        if (!safeName || safeName.startsWith('.')) {
            safeName = 'file-' + Math.random().toString(36).substring(2, 7) + (path.extname(file.name) || '.png');
        }
        
        const filename = `${Date.now()}-${safeName}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const filepath = path.join(uploadDir, filename);

        // Detailed error reporting for specialized environments
        try {
            // Ensure directory exists
            await mkdir(uploadDir, { recursive: true });
            await writeFile(filepath, buffer);
        } catch (dirError: any) {
            console.error("FileSystem Error:", dirError);
            if (dirError.code === 'EROFS' || process.env.VERCEL) {
                return NextResponse.json({ 
                    success: false, 
                    error: "بيئة الاستضافة (Vercel) تمنع حفظ الملفات محلياً. يرجى استخدام رابط خارجي للشعار أو تواصل مع الدعم الفني." 
                }, { status: 403 });
            }
            throw dirError;
        }

        return NextResponse.json({ success: true, url: `/uploads/${filename}` });
    } catch (e: any) {
        console.error("Upload Error:", e);
        return NextResponse.json({ success: false, error: "فشل الرفع: " + (e.message || "خطأ غير معروف") }, { status: 500 });
    }
});
