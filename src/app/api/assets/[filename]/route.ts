
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @fileOverview Router per servire gli asset salvati nella cartella persistente 'data/assets'.
 * Risolve i problemi di visualizzazione su Raspberry Pi e Docker Standalone.
 */

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;

    // Percorso robusto verso la cartella data
    const baseDir = process.env.DATABASE_URL 
        ? path.dirname(process.env.DATABASE_URL.replace('file:', '')) 
        : path.join(process.cwd(), 'data');
    
    const filePath = path.join(baseDir, 'assets', filename);

    if (!fs.existsSync(filePath)) {
        // Fallback per file standard se non trovati in data (es. sfondi iniziali)
        const publicPath = path.join(process.cwd(), 'public', filename);
        if (fs.existsSync(publicPath)) {
            const fileBuffer = fs.readFileSync(publicPath);
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': getMimeType(filename),
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        }
        return new NextResponse('File non trovato', { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const mimeType = getMimeType(filename);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        return new NextResponse('Errore server', { status: 500 });
    }
}

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.svg':
            return 'image/svg+xml';
        case '.webp':
            return 'image/webp';
        default:
            return 'application/octet-stream';
    }
}
