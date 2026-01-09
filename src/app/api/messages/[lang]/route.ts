import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
  try {
    const { lang } = await params;

    // Validate language parameter
    if (!['de', 'en'].includes(lang)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    // Read the translation file
    const filePath = path.join(process.cwd(), 'messages', `${lang}.json`);
    const fileContent = await readFile(filePath, 'utf-8');
    const translations = JSON.parse(fileContent);

    return NextResponse.json(translations);
  } catch {
    return NextResponse.json({ error: 'Failed to load translations' }, { status: 500 });
  }
}
