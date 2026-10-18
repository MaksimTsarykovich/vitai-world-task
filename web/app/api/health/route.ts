import { NextResponse } from 'next/server';
import { dbStatus } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Проверка для Docker healthcheck и мониторинга: приложение + доступ к базе.
export async function GET() {
  try {
    const { ok, schemaVersion } = await dbStatus();

    return NextResponse.json(
      { status: ok ? 'ok' : 'error', db: ok ? 'ok' : 'error', schema: schemaVersion },
      { status: ok ? 200 : 503 },
    );
  } catch (error) {
    console.error('[health] db check failed', error);
    return NextResponse.json({ status: 'error', db: 'error' }, { status: 503 });
  }
}
