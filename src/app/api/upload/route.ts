import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session) => {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file found" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Sanitize filename to prevent directory traversal or spaces
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const filepath = path.join(uploadDir, filename);

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        await writeFile(filepath, buffer);

        // Return the explicit relative URL the website will natively render
        return NextResponse.json({ success: true, url: `/uploads/${filename}` });
    } catch (e: any) {
        console.error("Upload Error:", e);
        return NextResponse.json({ success: false, error: "Upload failed: " + (e.message || "Unknown error") }, { status: 500 });
    }
});
