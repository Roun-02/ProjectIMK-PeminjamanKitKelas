/* ==========================================================
   SCRIPT.JS - Peminjaman Kit Kelas FILKOM
   Mengatur alur login demo, layar peminjam/petugas, pembuatan
   tiket QR simulasi, pencatatan transaksi, dan panel pengujian.
   Data ruangan dan data awal dimuat lebih dahulu dari data.js.
   ========================================================== */

      /* DAFTAR ISI
   1. Ikon, waktu, state aplikasi, helper (ikon, S, status) ... baris 20
   2. Pembuatan QR dan tiket (QR, timer 5 menit) ............... baris 145
   3. Layar login, beranda, pinjam, kembali .................... baris 339
   4. Layar pindai petugas dan riwayat ......................... baris 589
   5. Render ulang dan notifikasi (header, nav, modal, toast) .. baris 792
   6. Aksi tombol act() (login, pick, cancel, dll) ............. baris 957
   7. Verifikasi peminjaman dan pengembalian ................... baris 1076
   8. Panel uji dan reset data demo ............................ baris 1155
   9. Event panel uji, input, dan dialog ....................... baris 1304

/* ---------- 1. Ikon, waktu, state aplikasi, dan helper ---------- */
const $ = (selector) => document.querySelector(selector);

// Jalur ikon SVG disimpan terpusat agar markup ikon konsisten di setiap layar.
const P = {
  package: [
    [
      'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16',
      'V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0',
      'l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z'
    ].join(''),
    'M12 22V12',
    'M3.3 7 12 12l8.7-5'
  ],
  undo: [
    'M9 14 4 9l5-5',
    'M20 20v-7a4 4 0 0 0-4-4H4'
  ],
  scan: [
    'M3 7V5a2 2 0 0 1 2-2h2',
    'M17 3h2a2 2 0 0 1 2 2v2',
    'M21 17v2a2 2 0 0 1-2 2h-2',
    'M7 21H5a2 2 0 0 1-2-2v-2',
    'M7 12h10'
  ],
  list: [
    'M8 6h13',
    'M8 12h13',
    'M8 18h13',
    'M3 6h.01',
    'M3 12h.01',
    'M3 18h.01'
  ],
  down: ['m6 9 6 6 6-6'],
  up: ['m18 15-6-6-6 6'],
  check: ['M20 6 9 17l-5-5'],
  alert: [
    'm21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3',
    'M12 9v4',
    'M12 17h.01'
  ],
  info: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    'M12 16v-4',
    'M12 8h.01'
  ],
  x: [
    'M18 6 6 18',
    'm6 6 12 12'
  ],
  left: ['m15 18-6-6 6-6'],
  right: ['m9 18 6-6-6-6'],
  clock: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    'M12 6v6l4 2'
  ]
};

// Mengubah nama ikon menjadi elemen SVG yang dapat disisipkan ke tampilan.
const ic = (name) => `
  <svg class="i" viewBox="0 0 24 24" aria-hidden="true">
    ${P[name].map((path) => `<path d="${path}"/>`).join('')}
  </svg>
`;

// Mengambil waktu saat ini dengan format jam.menit.
const hm = () => {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}.${minutes}`;
};

// Mutable UI state. Data peminjaman awal diambil dari data.js.
const S = {
  user: null,
  role: null,
  screen: 'login',
  err: false,
  dd: false,
  modal: false,
  toast: '',
  scan: null,
  sc: false,
  q: '',
  f: 'Semua',
  sel: null,
  page: 1,
  qr: null,
  loans: JSON.parse(JSON.stringify(INITIAL_LOANS))
};

// Mengecek apakah ruangan sedang dipinjam atau belum dikembalikan.
const busy = (room) => S.loans.some(
  (loan) => loan.room === room && loan.status !== 'Selesai'
);

// Mengambil peminjaman aktif milik pengguna yang sedang masuk.
const mine = () => S.loans.find(
  (loan) => loan.who === S.user && loan.status === 'Dipinjam'
);

// Menghasilkan label visual sesuai status transaksi.
const st = (status) => {
  if (status === 'Dipinjam') {
    return `<span class="st w">${ic('clock')}Dipinjam</span>`;
  }

  if (status === 'Belum Kembali') {
    return `<span class="st b">${ic('alert')}Belum Kembali</span>`;
  }

  return `<span class="st o">${ic('check')}Selesai</span>`;
};

// Mengubah durasi dalam milidetik menjadi menit:detik.
const fmt = (milliseconds) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');

  return `${minutes}:${remainder}`;
};

/* ---------- 2. Pembuatan QR dan tampilan tiket ---------- */
// Membuat ilustrasi QR yang konsisten untuk kebutuhan tampilan prototipe.
function qrSvg(seed) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  const random = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash / 4294967296;
  };

  const finderPattern = (x, y) => `
    <rect x="${x}" y="${y}" width="7" height="7" fill="#0A1936"/>
    <rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/>
    <rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0A1936"/>
  `;

  let cells = '';

  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const inFinderArea = (
        (x < 8 && y < 8)
        || (x > 12 && y < 8)
        || (x < 8 && y > 12)
      );

      if (!inFinderArea && random() > 0.5) {
        cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#0A1936"/>`;
      }
    }
  }

  return `
    <svg
      viewBox="0 0 21 21"
      width="100%"
      height="100%"
      shape-rendering="crispEdges"
      role="img"
      aria-label="QR Code"
    >
      ${cells}
      ${finderPattern(0, 0)}
      ${finderPattern(14, 0)}
      ${finderPattern(0, 14)}
    </svg>
  `;
}

// Menampilkan tiket sesuai jenis transaksi pinjam atau pengembalian.
function qrPanel(type) {
  const qr = S.qr;

  if (!qr || qr.type !== type) {
    return '';
  }

  const title = type === 'borrow'
    ? 'QR Code Peminjaman'
    : 'QR Code Pengembalian';

  let body;

  if (qr.state === 'loading') {
    body = `
      <div class="info" style="justify-content:center;align-items:center">
        <span class="spin"></span>Memuat QR…
      </div>
    `;
  } else if (qr.state === 'error') {
    body = `
      <div class="err" role="alert">
        ${ic('alert')}
        <span>Gagal memuat QR, coba lagi</span>
      </div>
      <button class="btn" data-a="newqr" data-v="${type}">
        Buat QR Baru
      </button>
    `;
  } else if (qr.state === 'used') {
    const message = type === 'borrow'
      ? `Dipinjam, ambil pouch di loker ${qr.room}`
      : 'Pengembalian tercatat';

    body = `<div class="res ok">${ic('check')}${message}</div>`;
  } else {
    const expired = qr.state === 'expired';
    const validity = expired
      ? 'Berlaku: 00:00'
      : `Berlaku: ${fmt(qr.exp - Date.now())}`;
    const ticketTitle = type === 'borrow'
      ? 'Tiket peminjaman'
      : 'Tiket pengembalian';
    const expiredOverlay = expired
      ? '<div class="ov">QR kedaluwarsa</div>'
      : '';
    const changeRoomButton = type === 'borrow'
      ? '<button class="btn sm gray" data-a="change">Ganti Ruangan</button>'
      : '';

    body = `
      <div class="tk">
        <div class="tk-top">
          <div class="qr ${expired ? 'dim' : ''}">
            ${qrSvg(qr.room + qr.t)}
            ${expiredOverlay}
          </div>
        </div>
        <div class="tk-cut"></div>
        <div class="tk-stub">
          <div>
            <div class="cap">${ticketTitle}</div>
            <div class="code">${qr.room}</div>
            <div class="sm t2">${qr.who}</div>
          </div>
          <div class="tm mono" id="tm">${validity}</div>
        </div>
      </div>
      <div class="row">
        <button class="btn sm" data-a="newqr" data-v="${type}">
          Buat QR Baru
        </button>
        ${changeRoomButton}
      </div>
      <button class="btn q" data-a="demo">
        Simulasi: petugas memindai QR ini
      </button>
    `;
  }

  return `
    <section class="blk">
      <h2>${title}</h2>
      ${body}
    </section>
  `;
}

// Membuat tiket dengan masa berlaku lima menit setelah proses demo selesai.
function mkQR(type, room) {
  S.qr = {
    type,
    room,
    state: 'loading',
    t: Date.now(),
    who: S.user || 'Gladly'
  };

  render();

  setTimeout(() => {
    if (!S.qr || S.qr.state !== 'loading') {
      return;
    }

    if (S.fail) {
      S.qr.state = 'error';
      S.fail = false;
    } else {
      S.qr.state = 'active';
      S.qr.exp = Date.now() + 300000;
    }

    render();
  }, 700);
}

// Memperbarui hitung mundur dan menandai tiket kedaluwarsa saat waktunya habis.
setInterval(() => {
  const qr = S.qr;

  if (!qr || qr.state !== 'active') {
    return;
  }

  const remaining = qr.exp - Date.now();

  if (remaining <= 0) {
    qr.state = 'expired';
    render();
    return;
  }

  const timer = $('#tm');

  if (timer) {
    timer.textContent = `Berlaku: ${fmt(remaining)}`;
  }
}, 1000);

/* ---------- 3. Template layar login, beranda, pinjam, dan kembali ---------- */
const vLogin = () => `
  <main>
    <div class="blk">
      <h1>Peminjaman Kit Kelas</h1>
      <p class="t2">
        Masuk dengan akun SSO untuk meminjam atau mengembalikan Kit Kelas FILKOM
      </p>
    </div>

    <section class="card">
      <h2>Akun SSO FilkomApps</h2>
      <div>
        <label for="u">Akun SSO</label>
        <input id="u" value="gladly" autocomplete="off">
        <div class="help">
          Demo: ketik “petugas” untuk masuk sebagai Pak Sugeng (Pramu)
        </div>
      </div>
      <div>
        <label for="p">Kata sandi</label>
        <input id="p" type="password" value="demo123">
      </div>
      ${S.err ? `
        <div class="err" role="alert">
          ${ic('alert')}
          <span>Login gagal: periksa akun SSO Anda</span>
        </div>
      ` : ''}
      <button class="btn" data-a="login">Masuk dengan SSO FilkomApps</button>
    </section>
  </main>
`;

const card = (icon, title, description, buttonText, destination, primary) => `
  <section class="card">
    <div class="hd">
      <div class="ic">${ic(icon)}</div>
      <div>
        <h3>${title}</h3>
        <div class="cap">${description}</div>
      </div>
    </div>
    <button
      class="btn ${primary ? '' : 'out'}"
      data-a="go"
      data-v="${destination}"
    >
      ${buttonText}
    </button>
  </section>
`;

const vHome = () => {
  const isBorrower = S.role === 'peminjam';
  const recentLoans = (
    isBorrower
      ? S.loans.filter((loan) => loan.who === S.user)
      : S.loans
  ).slice(-2).reverse();

  const serviceCards = isBorrower
    ? card(
      'package',
      'Pinjam Kit Kelas',
      'Pilih ruangan, lalu tampilkan QR Code',
      'Mulai Pinjam',
      'pinjam',
      1
    ) + card(
      'undo',
      'Kembalikan Kit Kelas',
      'Tampilkan QR Code pengembalian',
      'Mulai Kembalikan',
      'kembali',
      0
    )
    : card(
      'scan',
      'Pindai QR Code',
      'Verifikasi peminjaman dan pengembalian',
      'Mulai Pindai',
      'pindai',
      1
    ) + card(
      'list',
      'Riwayat Peminjaman',
      'Siapa meminjam ruangan mana dan kapan',
      'Lihat Riwayat',
      'riwayat',
      0
    );

  const activityTitle = isBorrower
    ? 'Status Terakhir'
    : 'Aktivitas Terakhir';
  const emptyMessage = '<div class="cap">Belum ada aktivitas</div>';

  return `
    <main>
      <h2>${isBorrower ? 'Layanan Kit Kelas' : 'Verifikasi dan rekap'}</h2>
      ${serviceCards}
      <aside class="blk">
        <h3>${activityTitle}</h3>
        <div>
          ${recentLoans.map((loan) => `
            <div class="li">
              <span>
                ${loan.room}${isBorrower ? '' : ` · ${loan.who}`}
              </span>
              ${st(loan.status)}
            </div>
          `).join('') || emptyMessage}
        </div>
      </aside>
    </main>
  `;
};

function vPinjam() {
  const activeLoan = mine();
  const hasBorrowQr = S.qr && S.qr.type === 'borrow';
  const selectedRoom = hasBorrowQr ? S.qr.room : '';
  const activeLoanMessage = activeLoan && !hasBorrowQr
    ? `
      <div class="info">
        ${ic('info')}
        <span>
          Anda sedang meminjam ${activeLoan.room}.
          Kembalikan dulu sebelum meminjam lagi
        </span>
      </div>
      <button class="btn out" data-a="go" data-v="kembali">
        Ke menu Kembali
      </button>
    `
    : `
      <div>
        <label>Ruangan Kit Kelas</label>
        <button class="dd-btn" data-a="dd" aria-expanded="${S.dd}">
          ${selectedRoom || 'Pilih ruangan'}
          ${ic(S.dd ? 'up' : 'down')}
        </button>
        ${S.dd ? `
          <div class="dd-list" role="listbox">
            ${ROOMS.map((room) => {
              const isBusy = busy(room);
              const roomStatus = isBusy
                ? `<span class="st w">${ic('clock')}Sedang Dipinjam</span>`
                : selectedRoom === room
                  ? `<span style="color:var(--blue)">${ic('check')}</span>`
                  : '';

              return `
                <button
                  data-a="pick"
                  data-v="${room}"
                  ${isBusy ? 'disabled' : ''}
                >
                  ${room}
                  ${roomStatus}
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}
        <div class="help">
          Ruangan yang sedang dipinjam tidak bisa dipilih
        </div>
      </div>
    `;

  return `
    <main>
      <section class="blk">
        <h2>Pilih Ruangan</h2>
        ${activeLoanMessage}
      </section>
      ${qrPanel('borrow')}
      <aside class="info">
        ${ic('info')}
        <span>
          Tunjukkan QR Code kepada petugas, lalu ambil pouch Kit Kelas
          di loker sesuai ruangan
        </span>
      </aside>
    </main>
  `;
}

function vKembali() {
  const activeLoan = mine();
  const hasReturnQr = S.qr && S.qr.type === 'return';
  const completedLoans = S.loans
    .filter((loan) => loan.who === S.user && loan.status === 'Selesai')
    .reverse();

  const activeLoanContent = activeLoan
    ? `
      <div class="li">
        <b class="mono">${activeLoan.room} · ${activeLoan.out}</b>
        ${st('Dipinjam')}
      </div>
      <button
        class="btn"
        data-a="return"
        ${hasReturnQr && S.qr.state === 'loading' ? 'disabled' : ''}
      >
        Kembalikan
      </button>
    `
    : `
      <div class="info">
        ${ic('info')}
        <span>Tidak ada barang yang perlu dikembalikan</span>
      </div>
      <button class="btn out" data-a="go" data-v="home">
        Ke Beranda
      </button>
    `;

  const loanHistory = completedLoans.map((loan) => `
    <div class="li">
      <span>${loan.room}</span>
      ${st('Selesai')}
    </div>
  `).join('') || '<div class="cap">Belum ada riwayat</div>';

  return `
    <main>
      <section class="blk">
        <h2>Peminjaman Aktif</h2>
        ${activeLoanContent}
      </section>
      ${qrPanel('return')}
      <section class="blk">
        <h2>Riwayat Saya</h2>
        <div>${loanHistory}</div>
      </section>
      <aside class="info">
        ${ic('info')}
        <span>
          Taruh pouch di loker ruangan atau serahkan ke petugas setelah QR Code
          dipindai
        </span>
      </aside>
    </main>
  `;
}

/* ---------- 4. Template pemindaian petugas dan riwayat ---------- */
function vPindai() {
  const scan = S.scan;
  const recentLoans = S.loans.slice(-3).reverse();

  let verificationContent;

  if (!scan) {
    verificationContent = '<div class="cap">Belum ada pemindaian</div>';
  } else if (!scan.ok) {
    verificationContent = `
      <div class="res no">${ic('alert')}TIDAK VALID</div>
      <div class="cap">Penyebab: ${scan.why}</div>
    `;
  } else {
    const timeLabel = scan.kind === 'borrow' ? 'Jam ambil' : 'Jam kembali';
    const returnAction = scan.kind === 'return'
      ? scan.loan.status === 'Belum Kembali'
        ? `<div class="res no">${ic('alert')}Ditandai Belum Kembali</div>`
        : `
          <button class="btn out" data-a="missing">
            Pouch tidak ada di loker: tandai Belum Kembali
          </button>
        `
      : '';

    verificationContent = `
      <div class="res ok">${ic('check')}VALID</div>
      <div class="kv">
        <span class="cap">Peminjam</span>
        <b>${scan.who}</b>
        <span class="cap">Ruangan</span>
        <b class="mono">${scan.room}</b>
        <span class="cap">${timeLabel}</span>
        <b class="mono">${scan.time}</b>
      </div>
      ${returnAction}
    `;
  }

  const scanButton = (label) => `
    <button class="btn" data-a="scan" ${S.sc ? 'disabled' : ''}>
      ${label}
    </button>
  `;

  return `
    <main>
      <section class="card">
        <h2>Pemindai QR Code</h2>
        <div class="cam ${S.sc ? 'go' : ''}">
          ${S.sc ? 'Memindai…' : 'tampilan kamera'}
        </div>
        <div class="cap">
          Arahkan kamera ke QR Code peminjaman atau pengembalian
        </div>
        ${scan ? '' : scanButton('Mulai Pindai (simulasi)')}
      </section>
      <section class="blk">
        <h2>Hasil Verifikasi</h2>
        ${verificationContent}
        ${scan ? scanButton('Pindai Lagi') : ''}
      </section>
      <aside class="blk">
        <h2>Rekap Hari Ini</h2>
        <div>
          ${recentLoans.map((loan) => `
            <div class="li">
              <span>${loan.room} · ${loan.who}</span>
              ${st(loan.status)}
            </div>
          `).join('')}
        </div>
      </aside>
    </main>
  `;
}

function vRiwayat() {
  const query = S.q.toLowerCase();
  const rows = S.loans.filter((loan) => (
    (S.f === 'Semua' || loan.status === S.f)
    && (loan.room + loan.who).toLowerCase().includes(query)
  ));
  const selectedLoan = S.sel != null ? S.loans[S.sel] : null;
  const previousLoans = selectedLoan
    ? S.loans.filter(
      (loan) => loan.room === selectedLoan.room && loan !== selectedLoan
    )
    : [];
  const filters = ['Semua', 'Dipinjam', 'Selesai', 'Belum Kembali'];

  const tableContent = rows.length
    ? `
      <div class="tw">
        <table>
          <tr>
            <th>Ruangan</th>
            <th>Peminjam</th>
            <th>Ambil</th>
            <th>Kembali</th>
            <th>Status</th>
          </tr>
          ${rows.map((loan) => {
            const index = S.loans.indexOf(loan);
            const selectedClass = S.sel === index ? 'sel' : '';

            return `
              <tr
                class="rw ${selectedClass}"
                data-a="row"
                data-v="${index}"
              >
                <td><span class="tag">${loan.room}</span></td>
                <td>${loan.who}</td>
                <td class="mono">${loan.out}</td>
                <td class="mono">${loan.in}</td>
                <td>${st(loan.status)}</td>
              </tr>
            `;
          }).join('')}
        </table>
      </div>
    `
    : `
      <div class="info">
        ${ic('info')}
        <span>
          Data tidak ditemukan. Ubah kata kunci atau hapus filter
        </span>
      </div>
    `;

  const selectedLoanDetails = selectedLoan
    ? `
      <div class="mono">
        <b>${selectedLoan.room}: ${selectedLoan.who}, ambil ${selectedLoan.out}</b>
      </div>
      ${st(selectedLoan.status)}
      <div class="cap">
        Riwayat sebelumnya:
        ${previousLoans.map((loan) => (
    `${loan.who} (${loan.status})`
  )).join(', ') || '-'}
      </div>
    `
    : '<div class="cap">Pilih satu baris untuk melihat detailnya</div>';

  const pagination = ['left', 1, 2, 3, 'right'].map((page) => {
    const label = typeof page === 'number' ? page : ic(page);
    const selectedClass = page === S.page ? 'on' : '';

    return `
      <button
        class="${selectedClass}"
        data-a="page"
        data-v="${page}"
        aria-label="Halaman ${page}"
      >
        ${label}
      </button>
    `;
  }).join('');

  return `
    <main>
      <section class="blk">
        <h2>Cari dan Filter</h2>
        <div>
          <label for="q">Cari Ruangan atau Peminjam</label>
          <input id="q" value="${S.q}" autocomplete="off">
          <div class="help">
            Ketik nama ruangan atau peminjam, contoh: Ruang A atau Gladly
          </div>
        </div>
        <div class="seg">
          ${filters.map((filter) => `
            <button
              class="${S.f === filter ? 'on' : ''}"
              data-a="filter"
              data-v="${filter}"
            >
              ${filter}
            </button>
          `).join('')}
        </div>
      </section>

      <section class="blk">
        <h2>Tabel Riwayat</h2>
        ${tableContent}
      </section>

      <aside class="blk">
        <h2>Peminjam Terakhir</h2>
        ${selectedLoanDetails}
      </aside>

      <div class="pg">${pagination}</div>
    </main>
  `;
}

/* ---------- 5. Render ulang tampilan dan notifikasi ---------- */
// Merender ulang layar aktif tanpa mengubah posisi scroll atau fokus pencarian.
function render() {
  const app = $('#app');
  const previousScrollTop = ($('.scr') || {}).scrollTop || 0;
  const activeElementId = document.activeElement
    ? document.activeElement.id
    : '';
  const queryCursor = activeElementId === 'q'
    ? $('#q').selectionStart
    : 0;

  const isLogin = S.screen === 'login';
  const isBorrower = S.role === 'peminjam';
  const tabs = isBorrower
    ? [
      ['home', 'Beranda'],
      ['pinjam', 'Pinjam'],
      ['kembali', 'Kembali']
    ]
    : [
      ['home', 'Beranda'],
      ['pindai', 'Pindai dan Rekap'],
      ['riwayat', 'Riwayat']
    ];
  const screenTemplates = {
    login: vLogin,
    home: vHome,
    pinjam: vPinjam,
    kembali: vKembali,
    pindai: vPindai,
    riwayat: vRiwayat
  };
  const screen = screenTemplates[S.screen]();
  const footer = S.screen === 'pindai'
    ? `
      <footer class="cnt">
        Dipinjam: ${S.loans.filter((loan) => loan.status === 'Dipinjam').length}
        | Selesai: ${S.loans.filter((loan) => loan.status === 'Selesai').length}
      </footer>
    `
    : `
      <footer>
        <a href="#">Bantuan</a> | <a href="#">Kontak Pramu</a>
      </footer>
    `;
  const header = isLogin
    ? `
      <header>
        <div class="lg">
          <span class="mark">F</span>
          Peminjaman Kit Kelas FILKOM
        </div>
      </header>
    `
    : `
      <header>
        <span>${S.user} (${isBorrower ? 'Peminjam' : 'Petugas'})</span>
        <button
          class="btn sm q"
          style="width:auto"
          data-a="${S.screen === 'home' ? 'logout' : 'go'}"
          data-v="home"
        >
          ${S.screen === 'home' ? 'Keluar' : 'Beranda'}
        </button>
      </header>
      <nav aria-label="Menu utama">
        ${tabs.map(([screenName, label]) => `
          <button
            class="${S.screen === screenName ? 'on' : ''}"
            data-a="go"
            data-v="${screenName}"
          >
            ${label}
          </button>
        `).join('')}
      </nav>
    `;
  const cancelButton = (
    S.screen === 'pinjam'
    && S.qr
    && S.qr.type === 'borrow'
    && S.qr.state !== 'used'
  )
    ? `
      <div style="padding:0 16px 24px">
        <button class="btn gray" data-a="cancel" id="bt">Batal</button>
      </div>
    `
    : '';
  const modal = S.modal
    ? `
      <div class="ov-bg" data-a="close" data-bg="1">
        <div class="modal" role="dialog" aria-modal="true">
          <button class="x" data-a="close" aria-label="Tutup">
            ${ic('x')}
          </button>
          <div class="ib">${ic('alert')}</div>
          <h2>
            Batalkan peminjaman Kit Kelas ${S.qr ? S.qr.room : ''}?
          </h2>
          <p class="sm">
            QR Code Peminjaman ${S.qr ? S.qr.room : ''} akan dinonaktifkan
            dan pouch Kit Kelas tidak bisa diambil. Anda harus memulai
            peminjaman dari awal.
          </p>
          <div class="row" style="margin-top:12px">
            <button class="btn gray" id="kb" data-a="close">
              Kembali Meminjam
            </button>
            <button class="btn danger" data-a="confirm">
              Ya, Batalkan Peminjaman
            </button>
          </div>
        </div>
      </div>
    `
    : '';
  const toast = S.toast
    ? `<div class="toast" role="status">${S.toast}</div>`
    : '';

  app.innerHTML = `
    <div class="scr">
      ${header}
      ${screen}
      ${cancelButton}
      ${footer}
    </div>
    ${modal}
    ${toast}
  `;

  if (S.modal) {
    const modalButton = $('#kb');
    if (modalButton) {
      modalButton.focus();
    }
  } else if (activeElementId === 'q') {
    const searchInput = $('#q');

    searchInput.focus();
    searchInput.setSelectionRange(queryCursor, queryCursor);
  }

  const scrollContainer = $('.scr');
  if (scrollContainer) {
    scrollContainer.scrollTop = previousScrollTop;
  }

  lab();
}

function toast(message) {
  S.toast = message;
  render();

  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    S.toast = '';
    render();
  }, 2400);
}

/* ---------- 6. Aksi pengguna dan navigasi antar layar ---------- */
// Memproses aksi tombol; satu handler dipakai ulang setelah elemen layar dirender.
function act(action, value) {
  if (action === 'login') {
    const username = $('#u').value.trim();
    const password = $('#p').value;

    if (!username || !password) {
      S.err = true;
      render();
      return;
    }

    S.err = false;
    S.role = username.toLowerCase() === 'petugas'
      ? 'petugas'
      : 'peminjam';
    S.user = S.role === 'petugas'
      ? 'Pak Sugeng'
      : username[0].toUpperCase() + username.slice(1);
    S.screen = 'home';
    S.scan = null;
    render();
  } else if (action === 'logout') {
    S.screen = 'login';
    S.user = null;
    S.role = null;
    render();
  } else if (action === 'go') {
    if (
      S.screen === 'pinjam'
      && S.qr
      && S.qr.type === 'borrow'
      && value !== 'pinjam'
      && S.qr.state !== 'used'
    ) {
      S.qr = null;
    }

    S.dd = false;
    S.screen = value;
    render();
    $('.scr').scrollTop = 0;
  } else if (action === 'dd') {
    S.dd = !S.dd;
    render();
  } else if (action === 'pick') {
    S.dd = false;
    mkQR('borrow', value);
  } else if (action === 'newqr') {
    mkQR(value, S.qr.room);
  } else if (action === 'change') {
    S.qr = null;
    S.dd = true;
    render();
  } else if (action === 'cancel') {
    S.modal = true;
    render();
  } else if (action === 'close') {
    S.modal = false;
    render();
    const cancelButton = $('#bt');

    if (cancelButton) {
      cancelButton.focus();
    }
  } else if (action === 'confirm') {
    S.modal = false;
    S.qr = null;
    toast('Peminjaman dibatalkan');
  } else if (action === 'return') {
    mkQR('return', mine().room);
  } else if (action === 'demo') {
    toast(
      'Pemindaian dilakukan petugas: ketuk Keluar, '
      + 'masuk dengan akun “petugas”, lalu pindai'
    );
  } else if (action === 'scan') {
    S.sc = true;
    render();

    setTimeout(() => {
      S.sc = false;
      S.scan = verify(S.qr);
      render();
    }, 900);
  } else if (action === 'missing') {
    S.scan.loan.status = 'Belum Kembali';
    S.scan.loan.in = '-';
    render();
  } else if (action === 'filter') {
    S.f = value;
    render();
  } else if (action === 'row') {
    S.sel = Number(value);
    render();
  } else if (action === 'page') {
    if (!Number.isNaN(Number(value))) {
      S.page = Number(value);
    }
    render();
  }
}

// Delegasi menjaga tombol tetap berfungsi meskipun render() mengganti elemen layar.
document.addEventListener('click', (event) => {
  const element = event.target.closest('[data-a]');

  if (!element) {
    return;
  }

  if (element.dataset.bg && event.target !== element) {
    return;
  }

  act(element.dataset.a, element.dataset.v);
});

/* ---------- 7. Verifikasi peminjaman dan pengembalian ---------- */
const LOG = [];
const INIT = JSON.stringify(S.loans);
const wait = (milliseconds) => new Promise(
  (resolve) => setTimeout(resolve, milliseconds)
);

const cnt = () => [
  S.loans.filter((loan) => loan.status === 'Dipinjam').length,
  S.loans.filter((loan) => loan.status === 'Selesai').length
];

// Memvalidasi QR simulasi dan menerapkan transaksi ke data peminjaman sementara.
function verify(qr) {
  let result;

  if (!qr || qr.state !== 'active') {
    const reason = qr && qr.state === 'expired'
      ? 'QR kedaluwarsa, minta peminjam memuat ulang'
      : 'tidak ada QR aktif yang ditampilkan peminjam';

    result = { ok: false, why: reason };
  } else if (qr.exp < Date.now()) {
    qr.state = 'expired';
    result = {
      ok: false,
      why: 'QR kedaluwarsa, minta peminjam memuat ulang'
    };
  } else if (qr.type === 'borrow') {
    if (busy(qr.room)) {
      result = { ok: false, why: 'ruangan sedang dipinjam' };
    } else {
      S.loans.push({
        room: qr.room,
        who: qr.who,
        out: hm(),
        in: '-',
        status: 'Dipinjam'
      });

      qr.state = 'used';
      result = {
        ok: true,
        kind: 'borrow',
        who: qr.who,
        room: qr.room,
        time: hm()
      };
    }
  } else {
    const loan = S.loans.find(
      (item) => item.room === qr.room
        && item.who === qr.who
        && item.status === 'Dipinjam'
    );

    if (!loan) {
      result = {
        ok: false,
        why: 'tidak ada peminjaman aktif untuk ruangan ini'
      };
    } else {
      loan.status = 'Selesai';
      loan.in = hm();
      qr.state = 'used';
      result = {
        ok: true,
        kind: 'return',
        who: qr.who,
        room: qr.room,
        time: hm(),
        loan
      };
    }
  }

  return result;
}

/* ---------- 8. Panel skenario uji dan reset data demo ---------- */
// Menjalankan skenario demo berulang untuk memeriksa hasil pemindaian utama.
async function scn(number) {
  let name;
  let expected;
  let actual;
  let passed;
  let result;

  const room = ROOMS.find((item) => !busy(item)) || 'Ruang A';
  const makeQr = (type, selectedRoom, who, state) => ({
    type,
    room: selectedRoom,
    state: state || 'active',
    exp: Date.now() + 300000,
    t: Date.now(),
    who
  });

  if (number === 1) {
    name = 'QR peminjaman valid';
    expected = 'VALID, rekap Dipinjam +1';
    const borrowedBefore = cnt()[0];

    S.qr = makeQr('borrow', room, 'Gladly');
    result = verify(S.qr);
    S.scan = result;
    actual = `${result.ok ? '✓ VALID' : 'TIDAK VALID'}, Dipinjam `
      + `${borrowedBefore} → ${cnt()[0]}`;
    passed = result.ok && cnt()[0] === borrowedBefore + 1;
  } else if (number === 2) {
    name = 'QR pengembalian valid';
    expected = 'VALID, rekap Selesai +1';

    let loan = S.loans.find((item) => item.status === 'Dipinjam');

    if (!loan) {
      loan = {
        room,
        who: 'Gladly',
        out: hm(),
        in: '-',
        status: 'Dipinjam'
      };
      S.loans.push(loan);
    }

    const completedBefore = cnt()[1];
    S.qr = makeQr('return', loan.room, loan.who);
    result = verify(S.qr);
    S.scan = result;
    actual = `${result.ok ? '✓ VALID' : 'TIDAK VALID'}, Selesai `
      + `${completedBefore} → ${cnt()[1]}`;
    passed = result.ok && cnt()[1] === completedBefore + 1;
  } else if (number === 3) {
    name = 'QR kedaluwarsa';
    expected = 'TIDAK VALID, data tidak berubah';
    const countsBefore = cnt().join();

    S.qr = makeQr('borrow', room, 'Gladly', 'expired');
    result = verify(S.qr);
    S.scan = result;
    actual = `${result.ok ? '✓ VALID' : `TIDAK VALID: ${result.why}`}, data `
      + `${cnt().join() === countsBefore ? 'tidak berubah' : 'berubah'}`;
    passed = !result.ok && cnt().join() === countsBefore;
  } else {
    name = 'Gagal memuat QR';
    expected = 'Pesan “Gagal memuat QR, coba lagi” tampil';
    S.fail = true;
    mkQR('borrow', room);
    await wait(850);

    passed = S.qr.state === 'error';
    actual = passed
      ? 'Pesan error tampil dengan tombol Buat QR Baru'
      : 'QR tetap termuat';
  }

  LOG.unshift({
    name,
    exp: expected,
    act: actual,
    pass: passed
  });
  render();
}

function reset() {
  S.loans = JSON.parse(INIT);
  S.qr = null;
  S.scan = null;
  S.fail = false;
  LOG.length = 0;
  render();
}

// Menampilkan tombol uji untuk menjalankan skenario tanpa perlu berpindah layar.
function lab() {
  const panel = $('#lab');

  if (!panel) {
    return;
  }

  const [borrowedCount, completedCount] = cnt();
  const scenarioButton = (value, label) => `
    <button
      class="btn out"
      style="justify-content:flex-start"
      data-l="${value}"
    >
      ${label}
    </button>
  `;

  panel.innerHTML = `
    <section class="card">
      <div>
        <h2>Uji coba skenario</h2>
        <div class="cap">
          Panel pengujian di luar aplikasi. Hasil juga tampil di layar Pindai
          petugas
        </div>
      </div>
      <div class="row">
        <div class="li">
          <span class="cap">Dipinjam</span>
          <b class="mono">${borrowedCount}</b>
        </div>
        <div class="li">
          <span class="cap">Selesai</span>
          <b class="mono">${completedCount}</b>
        </div>
      </div>
      ${scenarioButton(1, '1. QR peminjaman valid')}
      ${scenarioButton(2, '2. QR pengembalian valid')}
      ${scenarioButton(3, '3. QR kedaluwarsa')}
      ${scenarioButton(4, '4. Gagal memuat QR')}
      <div class="row">
        <button class="btn" data-l="all">Jalankan semua</button>
        <button class="btn gray" data-l="reset">Reset data</button>
      </div>
      <button class="btn q" data-l="open">
        Buka layar Pindai petugas
      </button>
    </section>
  `;
}

/* ---------- 9. Event panel uji, input pencarian,
   dan aksesibilitas dialog ---------- */
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-l]');

  if (!button) {
    return;
  }

  const value = button.dataset.l;

  if (value === 'all') {
    (async () => {
      reset();

      for (const scenario of [1, 2, 3, 4]) {
        await scn(scenario);
      }
    })();
  } else if (value === 'reset') {
    reset();
  } else if (value === 'open') {
    S.role = 'petugas';
    S.user = 'Pak Sugeng';
    S.screen = 'pindai';
    render();
    $('#app').scrollIntoView({ block: 'center' });
  } else {
    scn(Number(value));
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'q') {
    S.q = event.target.value;
    render();
  }
});

document.addEventListener('keydown', (event) => {
  if (!S.modal) {
    return;
  }

  if (event.key === 'Escape') {
    S.modal = false;
    render();

    const cancelButton = $('#bt');
    if (cancelButton) {
      cancelButton.focus();
    }
  } else if (event.key === 'Tab') {
    const focusableButtons = [
      ...document.querySelectorAll('.modal button')
    ];
    const currentIndex = focusableButtons.indexOf(document.activeElement);

    event.preventDefault();

    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (
      currentIndex + direction + focusableButtons.length
    ) % focusableButtons.length;

    focusableButtons[nextIndex].focus();
  }
});

// Tampilkan layar login sebagai titik awal ketika halaman pertama kali dibuka.
render();
