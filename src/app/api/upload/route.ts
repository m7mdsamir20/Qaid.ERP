import { NextRequest, NextResponse } from "next/server";
import { withProtection } from '@/lib/apiHandler';
import { supabase } from '@/lib/supabase';
import path from 'path';

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
        
        // Sanitize filename
        let safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
        if (!safeName || safeName.startsWith('.')) {
            safeName = 'file-' + Math.random().toString(36).substring(2, 7) + (path.extname(file.name) || '.png');
        }
        
        const filename = `logo-${Date.now()}-${safeName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('company-logos')
            .upload(filename, bytes, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error("Supabase Storage Error:", uploadError);
            return NextResponse.json({ 
                success: false, 
                error: "فشل الرفع إلى Supabase. تأكد من إنشاء Bucket باسم 'company-logos' وجعله متاح للجميع (Public). الخطأ: " + uploadError.message 
            }, { status: 500 });
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('company-logos')
            .getPublicUrl(filename);

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (e: any) {
        console.error("Upload Error:", e);
        return NextResponse.json({ success: false, error: "فشل الرفع: " + (e.message || "خطأ غير معروف") }, { status: 500 });
    }
});
