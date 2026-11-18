export const CLASSES = ['X', 'XI', 'XII'] as const;

export const BARRIER = {
  tidak: { short: 'Tidak, akan melanjutkan strategi', long: 'Tidak, aku akan melanjutkan strategi ini' },
  sedikit: { short: 'Sedikit, akan menyesuaikan', long: 'Sedikit, aku akan mencoba menyesuaikan' },
  ya: { short: 'Ya, ingin bicara dengan guru BK', long: 'Ya, aku ingin berbicara dengan guru BK' },
} as const;
export type BarrierKey = keyof typeof BARRIER;
export const isBarrier = (v: unknown): v is BarrierKey => typeof v === 'string' && v in BARRIER;

export const SCHED: ReadonlyArray<readonly [string, number]> = [
  ['Belajar awal', 0],
  ['Ulang ke-1', 1],
  ['Ulang ke-2', 3],
  ['Ulang ke-3', 7],
  ['Ulang ke-4', 14],
];

export const HABITS_HELP = [
  { id: 'h1', label: 'Menulis jadwal belajar' },
  { id: 'h2', label: 'Belajar sedikit-sedikit setiap hari' },
  { id: 'h3', label: 'Menjelaskan ulang materi dengan kata sendiri' },
  { id: 'h4', label: 'Mengerjakan soal latihan tanpa melihat catatan' },
  { id: 'h5', label: 'Bertanya saat bingung' },
];
export const HABITS_HINDER = [
  { id: 'x1', label: 'Menunda sampai ujian sudah dekat' },
  { id: 'x2', label: 'Hanya membaca ulang catatan' },
  { id: 'x3', label: 'Belajar sambil membuka media sosial' },
  { id: 'x4', label: 'Belajar sekaligus semalaman' },
  { id: 'x5', label: 'Belajar lama tanpa istirahat' },
];
export const HABIT_IDS = [...HABITS_HELP, ...HABITS_HINDER].map((h) => h.id);

export const STRATEGIES = [
  { id: 'recall', label: 'Latihan mengingat kembali', desc: 'Tutup catatan, lalu jawab soal atau jelaskan dengan kata sendiri.' },
  { id: 'spaced', label: 'Belajar terdistribusi (jadwal ulang)', desc: 'Bagi sesi dengan jeda: ulang pada hari ke-1, ke-3, ke-7, dan ke-14.' },
  { id: 'summary', label: 'Meringkas dengan kata sendiri', desc: 'Tulis ulang inti materi tanpa menyalin kalimat buku.' },
  { id: 'sq3r', label: 'SQ3R', desc: 'Survey, Question, Read, Recite, Review. Bukti terbatas pada pemahaman bacaan.' },
  { id: 'cornell', label: 'Catatan Cornell', desc: 'Bagi halaman: catatan, kata kunci/pertanyaan, dan ringkasan. Bukti terbatas pada pemahaman bacaan.' },
];
export const STRATEGY_IDS = STRATEGIES.map((s) => s.id);

export const QUIZ = [
  {
    q: 'Mana yang termasuk latihan mengingat kembali?',
    o: ['Membaca ulang catatan', 'Menjawab soal tanpa melihat catatan', 'Menandai kalimat penting dengan stabilo'],
    a: 1,
    ok: 'Tepat. Menjawab tanpa melihat catatan melatih otak mengambil kembali informasi.',
    no: 'Belum tepat. Membaca ulang dan menandai teks tidak melatih pengambilan informasi. Baca kembali penjelasan di atas, lalu coba lagi.',
  },
  {
    q: 'Kamu punya waktu 2 jam untuk satu materi. Cara belajar yang lebih terdistribusi adalah…',
    o: ['Belajar 2 jam sekaligus malam sebelum ujian', 'Belajar 30 menit, lalu mengulang pada hari ke-1, ke-3, dan ke-7', 'Belajar hanya saat merasa termotivasi'],
    a: 1,
    ok: 'Tepat. Jeda antarsesi membantu informasi bertahan lebih lama.',
    no: 'Belum tepat. Belajar terdistribusi berarti membagi sesi dengan jeda. Lihat kembali menu Atur Waktu, lalu coba lagi.',
  },
  {
    q: 'Setelah satu minggu mencoba strategi dan hasilnya belum sesuai harapan, langkah yang baik adalah…',
    o: ['Menyimpulkan bahwa dirimu tidak mampu', 'Merefleksikan kendala, menyesuaikan strategi, dan bila perlu menemui guru BK', 'Berhenti belajar'],
    a: 1,
    ok: 'Tepat. Hasil yang belum sesuai adalah bahan untuk menyesuaikan strategi, bukan penilaian atas dirimu.',
    no: 'Belum tepat. Hasil yang belum sesuai bukan tanda kamu tidak mampu. Coba pikirkan langkah yang memperbaiki cara belajarnya.',
  },
];

// Aturan pemicu sederhana dan transparan; daftar kata ditetapkan bersama guru BK.
export const CRISIS = /bunuh diri|mengakhiri hidup|ingin mati|pengen mati|menyakiti diri|melukai diri|putus asa/i;

export const STATUSES = ['Baru', 'Dijadwalkan', 'Selesai'] as const;

export const FLASH: { ok: Record<string, string>; err: Record<string, string> } = {
  ok: {
    kebiasaan: 'Pilihan kebiasaanmu tersimpan.',
    tujuan: 'Tujuan tersimpan. Hanya kamu yang bisa membacanya.',
    jadwal: 'Jadwal ulang dibuat.',
    strategi: 'Pilihan strategimu tersimpan.',
    fokus: 'Rencana fokus tersimpan.',
    refleksi: 'Refleksi tersimpan. Hanya kamu yang bisa membacanya.',
    support: 'Refleksi tersimpan. Baca pesan di bawah ya.',
    share: 'Pengaturan berbagi diperbarui.',
    konsul: 'Permintaan jadwal dibuat. Guru BK yang akan menindaklanjuti.',
    hapus: 'Semua datamu sudah dihapus.',
    keluar: 'Kamu sudah keluar dari perangkat ini.',
  },
  err: {
    agree: 'Centang persetujuan dulu.',
    tujuan: 'Tulis dulu tujuanmu.',
    tanggal: 'Pilih tanggal belajar pertama dulu.',
    kosong: 'Tulis dulu satu catatan.',
    barrier: 'Pilih salah satu jawaban tentang hambatan belajarmu.',
    slot: 'Pilih satu jadwal dulu.',
    ada: 'Kamu masih punya permintaan jadwal yang belum selesai.',
    umum: 'Terjadi kesalahan. Coba lagi.',
  },
};
