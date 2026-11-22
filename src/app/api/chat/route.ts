import { NextResponse, type NextRequest } from 'next/server';
import { getChatMessages, appendChatMessage, verifyChatAccess } from '@/lib/chat';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get('requestId')?.trim() ?? '';
  const asRole = req.nextUrl.searchParams.get('as') === 'guru' ? 'guru' : req.nextUrl.searchParams.get('as') === 'siswa' ? 'siswa' : undefined;
  if (!requestId) {
    return NextResponse.json({ error: 'requestId wajib diisi.' }, { status: 400 });
  }

  try {
    const access = await verifyChatAccess(requestId, asRole);
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }
    const messages = await getChatMessages(requestId);
    return NextResponse.json(
      { messages, status: access.requestStatus },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[GET /api/chat] Error:', err);
    return NextResponse.json({ error: 'Gagal memuat pesan.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { requestId?: string; message?: string; asRole?: 'siswa' | 'guru' };
    const requestId = String(body.requestId ?? '').trim();
    const message = String(body.message ?? '').trim().slice(0, 1000);
    const asRole = body.asRole === 'guru' ? 'guru' : body.asRole === 'siswa' ? 'siswa' : undefined;

    if (!requestId || !message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const access = await verifyChatAccess(requestId, asRole);
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const saved = await appendChatMessage({
      requestId,
      senderRole: access.role,
      senderName: access.senderName,
      message,
    });

    if (!saved) {
      return NextResponse.json({ error: 'Gagal menyimpan pesan.' }, { status: 500 });
    }

    return NextResponse.json({ message: saved });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengirim pesan.' }, { status: 500 });
  }
}
