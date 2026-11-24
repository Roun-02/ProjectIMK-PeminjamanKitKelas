/* ==========================================================
   DATA.JS - Data contoh Peminjaman Kit Kelas FILKOM
   Berisi daftar ruangan dan riwayat awal untuk simulasi.
   Semua perubahan transaksi selama demo hanya ada di memori.
   ========================================================== */
/* ---------- 1. Daftar ruangan yang dapat dipilih ---------- */
const ROOMS = ['Ruang A', 'Ruang B', 'Ruang C'];

/* ---------- 2. Riwayat peminjaman awal untuk layar demo ---------- */
// "Dipinjam" berarti ruangan sedang dipakai; "Selesai" berarti sudah kembali.
const INITIAL_LOANS = [
  {
    room: 'Ruang B',
    who: 'Budi',
    out: '07.10',
    in: '-',
    status: 'Dipinjam'
  },
  {
    room: 'Ruang C',
    who: 'Ani',
    out: '07.12',
    in: '07.40',
    status: 'Selesai'
  },
  {
    room: 'Ruang D',
    who: 'Dewi',
    out: '07.20',
    in: '07.55',
    status: 'Selesai'
  },
  {
    room: 'Ruang C',
    who: 'Gladly',
    out: '06.50',
    in: '07.20',
    status: 'Selesai'
  }
];
