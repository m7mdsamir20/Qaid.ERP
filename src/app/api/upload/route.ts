import { NextRequest, NextResponse } from 'next/server';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';
import path from 'path';
import fs from 'fs/promises';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

export const POST = withProtection(async (request, session) => {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "لم يتم العثور على ملف" }, { status: 400 });
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({ success: false, error: "نوع الملف غير مسموح به. الأنواع المسموحة: JPG, PNG, WebP, GIF, SVG" }, { status: 400 });
        }

        // Validate file extension
        const ext = path.extname(file.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return NextResponse.json({ success: false, error: "امتداد الملف غير مسموح به" }, { status: 400 });
        }

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: "حجم الملف كبير جداً (الأقصى 5 ميجابايت)" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Build a safe filename using only the validated extension (no user-controlled name in the path)
        const filename = `logo-${Date.now()}${ext}`;

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
        return NextResponse.json({ success: false, error: safeErrorMsg(e, 'فشل الرفع') }, { status: 500 });
    }
});
