import 'server-only';
import { randomUUID } from 'crypto';
import { admin } from './supabase-admin';
import { getStudent, getGuru, getAdmin } from './session';

export type ChatMessage = {
  id: string;
  request_id: string;
  sender_role: 'siswa' | 'guru';
  sender_name: string;
  message: string;
  created_at: string;
};

// Deteksi apakah tabel consult_messages sudah dibuat di Supabase; jika belum, fallback otomatis ke site_content
let _hasNativeTable: boolean | null = null;
const chatKey = (requestId: string) => `chat:${requestId}`;

export async function getChatMessages(requestId: string): Promise<ChatMessage[]> {
  if (!requestId) return [];
  const sb = admin();

  if (_hasNativeTable !== false) {
    try {
      const { data, error } = await sb
        .from('consult_messages')
        .select('id,request_id,sender_role,sender_name,message,created_at')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (!error) {
        _hasNativeTable = true;
        return (data ?? []) as ChatMessage[];
      }
      if (error.code === 'PGRST205' || error.code === '42P01') {
        _hasNativeTable = false;
      } else {
        console.error('[getChatMessages] Error consult_messages:', error.message);
      }
    } catch (err) {
      console.error('[getChatMessages] Unexpected error:', err);
    }
  }

  // Fallback penyimpanan JSON di site_content agar langsung jalan tanpa harus migrasi manual
  try {
    const { data, error } = await sb
      .from('site_content')
      .select('value')
      .eq('key', chatKey(requestId))
      .maybeSingle();
    if (error || !data?.value) return [];
    const parsed = JSON.parse(data.value);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch (err) {
    console.error('[getChatMessages] Fallback error:', err);
    return [];
  }
}

export async function appendChatMessage(input: {
  requestId: string;
  senderRole: 'siswa' | 'guru';
  senderName: string;
  message: string;
}): Promise<ChatMessage | null> {
  const cleanMsg = input.message.trim().slice(0, 1000);
  if (!input.requestId || !cleanMsg) return null;

  const sb = admin();
  const msgObj: ChatMessage = {
    id: randomUUID(),
    request_id: input.requestId,
    sender_role: input.senderRole,
    sender_name: input.senderName.trim().slice(0, 60) || (input.senderRole === 'guru' ? 'Guru BK' : 'Siswa'),
    message: cleanMsg,
    created_at: new Date().toISOString(),
  };

  if (_hasNativeTable !== false) {
    try {
      const { data, error } = await sb
        .from('consult_messages')
        .insert({
          request_id: msgObj.request_id,
          sender_role: msgObj.sender_role,
          sender_name: msgObj.sender_name,
          message: msgObj.message,
        })
        .select('id,request_id,sender_role,sender_name,message,created_at')
        .single();

      if (!error && data) {
        _hasNativeTable = true;
        return data as ChatMessage;
      }
      if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
        _hasNativeTable = false;
      } else if (error) {
        console.error('[appendChatMessage] Error consult_messages:', error.message);
      }
    } catch (err) {
      console.error('[appendChatMessage] Unexpected error:', err);
    }
  }

  // Fallback ke site_content
  try {
    const existing = await getChatMessages(input.requestId);
    const updated = [...existing.slice(-199), msgObj];
    const { error } = await sb.from('site_content').upsert({
      key: chatKey(input.requestId),
      value: JSON.stringify(updated),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[appendChatMessage] Fallback upsert error:', error.message);
      return null;
    }
    return msgObj;
  } catch (err) {
    console.error('[appendChatMessage] Fallback unexpected error:', err);
    return null;
  }
}

export async function verifyChatAccess(
  requestId: string,
  preferRole?: 'siswa' | 'guru'
): Promise<{
  allowed: boolean;
  role: 'siswa' | 'guru';
  senderName: string;
  requestStatus: string;
} | null> {
  if (!requestId) return null;
  try {
    const sb = admin();
    const { data: reqRow, error: reqErr } = await sb
      .from('consult_requests')
      .select('id,student_id,status')
      .eq('id', requestId)
      .maybeSingle();
    if (reqErr || !reqRow) return null;

    const { data: studentRow } = await sb
      .from('students')
      .select('id,nickname,school_code')
      .eq('id', reqRow.student_id)
      .maybeSingle();
    if (!studentRow) return null;

    // Jika diminta sebagai siswa (atau cek siswa terlebih dahulu bila preferRole !== 'guru')
    if (preferRole !== 'guru') {
      const s = await getStudent();
      if (s && s.id === studentRow.id) {
        return {
          allowed: true,
          role: 'siswa',
          senderName: s.nickname,
          requestStatus: reqRow.status,
        };
      }
    }

    // Cek apakah Guru BK pemilik kode sekolah siswa tersebut
    const g = await getGuru();
    if (g) {
      const { data: codeRow } = await sb
        .from('school_codes')
        .select('code')
        .eq('code', studentRow.school_code)
        .eq('owner_id', g.user_id)
        .maybeSingle();
      if (codeRow) {
        return {
          allowed: true,
          role: 'guru',
          senderName: g.name,
          requestStatus: reqRow.status,
        };
      }
    }

    // Cek apakah Super Admin
    const a = await getAdmin();
    if (a) {
      if (preferRole === 'siswa') {
        return {
          allowed: true,
          role: 'siswa',
          senderName: studentRow.nickname,
          requestStatus: reqRow.status,
        };
      }
      return {
        allowed: true,
        role: 'guru',
        senderName: `${a.name} (BK)`,
        requestStatus: reqRow.status,
      };
    }

    // Fallback cek siswa jika tadi preferRole === 'guru' tapi ternyata yang akses siswa
    const sFallback = await getStudent();
    if (sFallback && sFallback.id === studentRow.id) {
      return {
        allowed: true,
        role: 'siswa',
        senderName: sFallback.nickname,
        requestStatus: reqRow.status,
      };
    }

    return null;
  } catch (err) {
    console.error('[verifyChatAccess] Error:', err);
    return null;
  }
}
