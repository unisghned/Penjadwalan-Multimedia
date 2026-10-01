// --- 1. CONFIG FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC3R5kIDwXl2-Mvcu3Jv9UENLxGe5j2fUM",
    authDomain: "penjadwalan-multimedia.firebaseapp.com",
    databaseURL: "https://penjadwalan-multimedia-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "penjadwalan-multimedia",
    storageBucket: "penjadwalan-multimedia.firebasestorage.app",
    messagingSenderId: "494867708384",
    appId: "1:494867708384:web:143df1dd7fbab61551d385"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let currentFilter = 'Biasa';
let selectedScheduleId = null;
let membersCache = {};

// --- 2. TEMPLATES (The "Ghost" UI) ---
const UI_LOGIN = `
<main class="admin-shell login-shell">
    <nav class="admin-topbar">
        <a class="wordmark" href="index.html"><img class="brand-logo" src="assets/logo.png" alt=""> Multimedia Team</a>
    </nav>
    <header class="admin-hero">
        <p class="eyebrow">Saint Martinus · Ruang Tim</p>
        <h1>AREA <span>ADMIN</span></h1>
        <p>Masuk untuk mengelola jadwal dan anggota.</p>
    </header>
    <section class="login-card">
        <h2>Login Tim</h2>
        <p>Akses khusus untuk administrator multimedia.</p>
        <form onsubmit="event.preventDefault(); handleLogin();" class="login-form">
            <input type="email" id="auth-email" placeholder="Email" class="admin-input" required>
            <input type="password" id="auth-password" placeholder="Password" class="admin-input" required>
            <button type="submit" class="primary-button">MASUK</button>
            <button type="button" onclick="handleRegister()" class="login-register">Daftar Akun Baru</button>
        </form>
    </section>
</main>`;

const UI_APP = `
<main class="admin-shell">
    <nav class="admin-topbar">
        <a class="wordmark" href="index.html"><img class="brand-logo" src="assets/logo.png" alt=""> Multimedia Team</a>
        <div class="admin-topbar-actions">
            <div id="realtime-clock" class="admin-clock"></div>
            <button onclick="toggleTheme()" class="icon-button" aria-label="Ganti tema"><span id="theme-icon">☀</span></button>
            <button onclick="logout()" class="danger-button">KELUAR</button>
        </div>
    </nav>

    <header class="admin-hero">
        <p class="eyebrow">Saint Martinus · Ruang Tim</p>
        <h1>Jadwal <span>Multimedia</span></h1>
        <p>Atur pelayanan misa dan daftar anggota tim.</p>
    </header>

    <nav class="admin-tabs" aria-label="Bagian administrasi">
        <button onclick="switchTab('jadwal')" id="btn-tab-jadwal" class="tab-btn active-tab">JADWAL</button>
        <button onclick="switchTab('anggota')" id="btn-tab-anggota" class="tab-btn">ANGGOTA</button>
    </nav>

    <section id="tab-jadwal" class="tab-content">
        <div class="admin-panel">
            <div class="panel-heading">
                <div><h2>Tambah jadwal misa</h2><p>Lengkapi detail misa untuk menerbitkan jadwal.</p></div>
                <div class="filter-control" aria-label="Jenis misa">
                    <button onclick="setFilter('Biasa')" id="filter-biasa" class="filter-button is-active">BIASA</button>
                    <button onclick="setFilter('Besar')" id="filter-besar" class="filter-button">BESAR</button>
                </div>
            </div>
            <div class="schedule-form">
                <input type="date" id="input-tgl" class="admin-input" aria-label="Tanggal misa">
                <div id="container-jam"></div>
                <input type="text" id="input-nama-misa" placeholder="Nama misa" class="admin-input">
                <button onclick="buatJadwal()" class="primary-button">PUBLISH</button>
            </div>
        </div>
        <div id="schedule-list" class="schedule-list admin-schedule-list"></div>
    </section>

    <section id="tab-anggota" class="tab-content hidden">
        <div class="admin-panel member-panel">
            <div class="panel-heading"><div><h2>Daftar anggota</h2><p>Tambahkan nama yang bisa dipilih pada pendaftaran jadwal.</p></div></div>
            <div class="member-form">
                <input type="text" id="member-name" placeholder="Nama lengkap" class="admin-input">
                <button onclick="addMember()" class="primary-button">TAMBAH ANGGOTA</button>
            </div>
        </div>
        <div id="members-grid" class="members-grid"></div>
    </section>
</main>

<div id="modal-daftar" class="modal-backdrop hidden">
    <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Pilih petugas</h2>
        <p id="modal-info"></p>
        <select id="select-member" class="admin-select"></select>
        <div class="modal-actions">
            <button onclick="closeModal()" class="secondary-button">BATAL</button>
            <button id="confirm-daftar" class="primary-button">DAFTAR</button>
        </div>
    </section>
</div>`;

// --- 3. CORE AUTH LOGIC ---
auth.onAuthStateChanged(user => {
    const root = document.getElementById('app-root');
    const shield = document.getElementById('shield-overlay');

    if (user && user.emailVerified) {
        root.innerHTML = UI_APP;
        initAppModules();
    } else {
        root.innerHTML = UI_LOGIN;
        if (user && !user.emailVerified) {
            Swal.fire('Email Belum Diverifikasi!', 'Cek email kamu.', 'warning');
            auth.signOut();
        }
    }
    setTimeout(() => shield.classList.add('hidden'), 800);
});

function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    auth.signInWithEmailAndPassword(email, password).catch(err => Swal.fire('Error', 'Gagal Masuk!', 'error'));
}

function handleRegister() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    auth.createUserWithEmailAndPassword(email, password).then(res => {
        res.user.sendEmailVerification();
        Swal.fire('Sukses!', 'Cek EMAIL untuk verifikasi!', 'success');
        auth.signOut();
    }).catch(err => Swal.fire('Gagal', err.message, 'error'));
}

function logout() { auth.signOut().then(() => location.reload()); }

// --- 4. DATA & FEATURE LOGIC ---
function initAppModules() {
    initTheme();
    setFilter('Biasa');
    initClock();
    initMembersListener();
    
    // Global Keypress for Enter
    document.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const el = document.activeElement;
            if (el.id === 'input-nama-misa') buatJadwal();
            if (el.id === 'member-name') addMember();
        }
    });
}

function setFilter(type) {
    currentFilter = type;
    const biasaBtn = document.getElementById('filter-biasa');
    const besarBtn = document.getElementById('filter-besar');
    if(!biasaBtn) return;

    biasaBtn.classList.toggle('is-active', type === 'Biasa');
    besarBtn.classList.toggle('is-active', type === 'Besar');
    
    const container = document.getElementById('container-jam');
    container.innerHTML = type === 'Besar' ? 
        `<input type="text" id="input-jam" placeholder="Contoh: 17.00" class="admin-input">` :
        `<select id="input-jam" class="admin-select">
            <option value="Jumat 18.00">Jumat 18.00</option>
            <option value="Sabtu 18.00">Sabtu 18.00</option>
            <option value="Minggu 06.00">Minggu 06.00</option>
            <option value="Minggu 08.00">Minggu 08.00</option>
            <option value="Minggu 10.00">Minggu 10.00</option>
            <option value="Minggu 18.00">Minggu 18.00</option>
        </select>`;
    renderSchedules();
}

function renderSchedules() {
    db.ref('schedules').on('value', snap => {
        const list = document.getElementById('schedule-list');
        if(!list) return;
        list.innerHTML = "";
        
        // Ambil tanggal hari ini (set jam ke 00:00 biar akurat)
        const hariIni = new Date();
        hariIni.setHours(0, 0, 0, 0);

        snap.forEach(child => {
            const data = child.val(); 
            if(data.kategori !== currentFilter) return;

            // LOGIC FILTER TANGGAL:
            // Ubah string tanggal dari Firebase (YYYY-MM-DD) jadi objek Date
            const tglJadwal = new Date(data.tanggal);
            tglJadwal.setHours(0, 0, 0, 0);

            // Jika tanggal jadwal lebih kecil (lama) dari hari ini, jangan di-render
            if (tglJadwal < hariIni) return;

            const lim = data.kategori === 'Besar' ? 6 : 4;
            const count = data.petugas ? Object.keys(data.petugas).length : 0;
            let petugasHtml = "";
            
            if(data.petugas) {
                Object.keys(data.petugas).forEach(k => {
                    petugasHtml += `<span class="roster-name">
                        ${escapeHtml(data.petugas[k])}
                        <button onclick="editPetugas('${child.key}','${k}')" class="btn-edit-petugas" aria-label="Edit ${escapeHtml(data.petugas[k])}" title="Edit nama">EDIT</button>
                        <button onclick="removePetugas('${child.key}','${k}')" class="btn-remove-petugas" aria-label="Hapus ${escapeHtml(data.petugas[k])}" title="Hapus nama">×</button>
                    </span>`;
                });
            }

            list.innerHTML += `
            <article class="schedule-card">
                <div class="card-main">
                    <span class="service-type ${data.kategori === 'Besar' ? 'large' : ''}">${escapeHtml(data.kategori)}</span>
                    <h3 class="service-name">${escapeHtml(data.namaMisa)}</h3>
                    <p class="service-date">${escapeHtml(data.tanggal)}</p>
                </div>
                <div class="time-block">${escapeHtml(data.jam)}</div>
                <div class="card-bottom">
                    <div class="roster">
                        <p class="roster-label">Petugas Terdaftar</p>
                        <div class="roster-names">${petugasHtml || '<span class="roster-empty">Belum ada petugas</span>'}</div>
                    </div>
                    <div class="card-actions schedule-admin-actions">
                        <span class="capacity ${count >= lim ? 'capacity-full' : ''}">${count}/${lim}</span>
                        <button onclick="openDaftar('${child.key}','${escapeHtml(data.jam)}')" class="register-button" ${count>=lim?'disabled':''}>${count>=lim?'PENUH':'DAFTAR'}</button>
                        <button onclick="hapusSatuJadwal('${child.key}')" class="danger-button delete-schedule" aria-label="Hapus jadwal" title="Hapus jadwal">HAPUS</button>
                    </div>
                </div>
            </article>`;
        });
    });
}

function buatJadwal() {
    const tgl = document.getElementById('input-tgl').value, jam = document.getElementById('input-jam').value, ket = document.getElementById('input-nama-misa').value || "MISA";
    if(!tgl || !jam) return Swal.fire('Info', 'Lengkapi data!', 'warning');
    db.ref('schedules').push({ tanggal: tgl, jam, namaMisa: ket, kategori: currentFilter, petugas: {} });
    document.getElementById('input-nama-misa').value = "";
}

function initMembersListener() {
    db.ref('members').on('value', snap => {
        const grid = document.getElementById('members-grid'), select = document.getElementById('select-member');
        if(!grid) return;
        membersCache = {};
        grid.innerHTML = "";
        select.innerHTML = '<option value="">-- Pilih Nama --</option>';
        snap.forEach(child => {
            const id = child.key, name = child.val().name;
            membersCache[id] = name;
            const safeName = escapeHtml(name);
            grid.innerHTML += `<article class="member-card"><p class="member-name">${safeName}</p><div class="member-actions"><button onclick="editMember('${id}')" class="icon-button" aria-label="Edit nama ${safeName}" title="Edit nama">EDIT</button><button onclick="db.ref('members/${id}').remove()" class="icon-button" aria-label="Hapus ${safeName}" title="Hapus anggota">HAPUS</button></div></article>`;
            select.innerHTML += `<option value="${safeName}">${safeName}</option>`;
        });
        if(snap.numChildren() === 0) grid.innerHTML = '<p class="member-empty">Belum ada anggota. Tambahkan nama untuk mulai.</p>';
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function addMember() {
    const input = document.getElementById('member-name');
    const name = input.value.trim();
    if(!name) return;
    const duplicate = Object.values(membersCache).some(existingName => existingName.trim().toLowerCase() === name.toLowerCase());
    if(duplicate) return Swal.fire('Nama Sudah Ada', 'Gunakan nama yang berbeda untuk setiap anggota.', 'info');
    db.ref('members').push({ name }).then(() => { input.value = ""; });
}

function editMember(id) {
    const currentName = membersCache[id];
    if(!currentName) return;

    Swal.fire({
        title: 'Edit Nama Anggota',
        input: 'text',
        inputValue: currentName,
        showCancelButton: true,
        confirmButtonText: 'SIMPAN',
        cancelButtonText: 'BATAL',
        confirmButtonColor: '#29c7d9',
        background: '#172740',
        color: '#eef4fa',
        inputValidator: value => {
            const name = value.trim();
            if(!name) return 'Nama tidak boleh kosong.';
            const duplicate = Object.entries(membersCache).some(([memberId, existingName]) =>
                memberId !== id && existingName.trim().toLowerCase() === name.toLowerCase()
            );
            if(duplicate) return 'Nama tersebut sudah digunakan.';
        }
    }).then(result => {
        if(!result.isConfirmed) return;
        const newName = result.value.trim();
        if(newName === currentName) return;

        db.ref('schedules').once('value').then(snap => {
            const updates = { [`members/${id}/name`]: newName };
            snap.forEach(schedule => {
                schedule.child('petugas').forEach(assignment => {
                    const assignedName = assignment.val();
                    if(typeof assignedName === 'string' && assignedName.trim().toLowerCase() === currentName.trim().toLowerCase()) {
                        updates[`schedules/${schedule.key}/petugas/${assignment.key}`] = newName;
                    }
                });
            });
            return db.ref().update(updates);
        }).then(() => Swal.fire('Nama Diperbarui', 'Nama anggota dan daftar petugas terkait sudah diperbarui.', 'success'))
          .catch(error => Swal.fire('Gagal', error.message, 'error'));
    });
}

function openDaftar(id, jam) { selectedScheduleId = id; document.getElementById('modal-info').innerText = jam; document.getElementById('modal-daftar').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }

function editPetugas(scheduleId, assignmentId) {
    const assignmentRef = db.ref(`schedules/${scheduleId}/petugas/${assignmentId}`);
    assignmentRef.once('value').then(snapshot => {
        const currentName = snapshot.val();
        if(typeof currentName !== 'string') return;

        return Swal.fire({
            title: 'Edit Nama Petugas',
            input: 'text',
            inputValue: currentName,
            showCancelButton: true,
            confirmButtonText: 'SIMPAN',
            cancelButtonText: 'BATAL',
            confirmButtonColor: '#29c7d9',
            background: '#172740',
            color: '#eef4fa',
            inputValidator: value => {
                if(!value.trim()) return 'Nama tidak boleh kosong.';
            }
        }).then(result => {
            if(!result.isConfirmed) return;
            const newName = result.value.trim();
            return db.ref(`schedules/${scheduleId}/petugas`).transaction(assignments => {
                const currentAssignments = assignments || {};
                const duplicate = Object.entries(currentAssignments).some(([key, assignedName]) =>
                    key !== assignmentId && String(assignedName).trim().toLowerCase() === newName.toLowerCase()
                );
                if(duplicate) return;
                currentAssignments[assignmentId] = newName;
                return currentAssignments;
            }).then(transaction => {
                if(!transaction.committed) {
                    return Swal.fire('Nama Sudah Terdaftar', 'Nama ini sudah ada di jadwal tersebut.', 'info');
                }
            });
        });
    }).catch(error => Swal.fire('Gagal', error.message, 'error'));
}

document.addEventListener('click', e => {
    if(e.target.id === 'confirm-daftar') {
        const name = document.getElementById('select-member').value.trim();
        if(!name) return;

        const assignmentsRef = db.ref(`schedules/${selectedScheduleId}/petugas`);
        const assignmentKey = assignmentsRef.push().key;
        assignmentsRef.transaction(assignments => {
            const currentAssignments = assignments || {};
            const normalizedName = name.toLowerCase();
            const alreadyAssigned = Object.values(currentAssignments).some(assignedName =>
                String(assignedName).trim().toLowerCase() === normalizedName
            );

            if(alreadyAssigned) return;
            return { ...currentAssignments, [assignmentKey]: name };
        }).then(result => {
            if(result.committed) {
                closeModal();
            } else {
                Swal.fire('Nama Sudah Terdaftar', 'Nama ini sudah ada di jadwal tersebut.', 'info');
            }
        }).catch(error => Swal.fire('Gagal', error.message, 'error'));
    }
});

function removePetugas(s, k) { db.ref(`schedules/${s}/petugas/${k}`).remove(); }
function hapusSatuJadwal(id) { Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(r => { if(r.isConfirmed) db.ref(`schedules/${id}`).remove(); }); }

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => x.classList.add('hidden'));
    document.getElementById(`tab-${t}`).classList.remove('hidden');
    document.getElementById('btn-tab-jadwal').classList.remove('active-tab');
    document.getElementById('btn-tab-anggota').classList.remove('active-tab');
    document.getElementById(`btn-tab-${t}`).classList.add('active-tab');
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', saved === 'dark');
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}

function initClock() {
    setInterval(() => {
        const el = document.getElementById('realtime-clock');
        if(el) el.innerText = new Date().toLocaleTimeString('id-ID');
    }, 1000);
}

// --- FUNGSI RESET KHUSUS JADWAL (ORANG-ORANG AMAN) ---
function resetDataFirebase() {
    // 1. Pastiin ref-nya cuma ke folder 'jadwal_misa' atau 'jadwal'
    // JANGAN ke root database!
    const jadwalRef = ref(db, 'jadwal_misa'); // <--- SESUAIIN NAMA FOLDER JADWAL LO

    set(jadwalRef, {
        // Kita reset isinya jadi template kosong atau null
        // Misal lo punya 7 hari, kita balikin ke default
        "Senin": { nama: "", tugas: "" },
        "Selasa": { nama: "", tugas: "" },
        "Rabu": { nama: "", tugas: "" },
        "Kamis": { nama: "", tugas: "" },
        "Jumat": { nama: "", tugas: "" },
        "Sabtu": { nama: "", tugas: "" },
        "Minggu": { nama: "", tugas: "" }
    }).then(() => {
        Swal.fire('Jadwal Direset!', 'Data orang-orang tetep aman kok, tenang aja.', 'success');
    }).catch((error) => {
        Swal.fire('Gagal!', 'Ada error pas reset: ' + error.message, 'error');
    });
}

// --- 5. FINAL SECURITY & CUSTOM MENU ---

// Fungsi buat munculin alert yang pasti jalan
function peringatanKeamanan() {
    Swal.fire({
        icon: 'warning',
        title: 'AKSES DIBATASI!',
        text: 'Shortcut DevTools dimatikan untuk keamanan tim.',
        background: '#162238',
        color: '#fff',
        confirmButtonColor: '#0891b2',
        timer: 3000
    });
}

// --- 5. FINAL SECURITY & CUSTOM MENU (OPTIMIZED) ---
let kantongAjaib = ""; 
let elemenTargetTerakhir = null;

// 1. Integrasi Security Alert
function peringatanKeamanan() {
    Swal.fire({
        icon: 'warning',
        title: 'AKSES DIBATASI!',
        text: 'Shortcut DevTools dimatikan untuk keamanan tim.',
        background: '#162238',
        color: '#fff',
        confirmButtonColor: '#0891b2',
        timer: 2000,
        showConfirmButton: false
    });
}

document.onkeydown = function(e) {
    if (e.keyCode == 123 || 
        (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) || 
        (e.ctrlKey && e.keyCode == 85)) {
        peringatanKeamanan();
        return false;
    }
};

// 2. Custom Menu Setup
const menuHTML = `
<div id="custom-menu" class="hidden fixed bg-white dark:bg-[#162238] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl py-2 z-[9999] min-w-[150px]">
    <div id="menu-copy" class="px-4 py-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 cursor-pointer text-sm font-bold dark:text-white flex items-center gap-2">📋 Copy</div>
    <div id="menu-paste" class="px-4 py-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 cursor-pointer text-sm font-bold dark:text-white flex items-center gap-2">📥 Paste</div>
    <div class="border-b border-slate-100 dark:border-slate-700 my-1"></div>
    <div id="menu-refresh" class="px-4 py-2 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 cursor-pointer text-sm font-bold text-cyan-500 flex items-center gap-2">🔄 Refresh</div>
</div>`;
document.body.insertAdjacentHTML('beforeend', menuHTML);
const cMenu = document.getElementById('custom-menu');

// 3. Mouse Logic (Target & ContextMenu)
document.addEventListener('mousedown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) elemenTargetTerakhir = e.target;
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) elemenTargetTerakhir = e.target;
    
    const seleksi = window.getSelection().toString();
    if (seleksi) kantongAjaib = seleksi;

    cMenu.style.top = `${e.clientY}px`;
    cMenu.style.left = `${e.clientX}px`;
    cMenu.classList.remove('hidden');
});

// 4. Button Actions
document.getElementById('menu-copy').onclick = function() {
    if (kantongAjaib) {
        navigator.clipboard.writeText(kantongAjaib).catch(() => {
            const t = document.createElement("textarea");
            t.value = kantongAjaib; document.body.appendChild(t);
            t.select(); document.execCommand('copy'); document.body.removeChild(t);
        });
        showToast('Tersalin!', 'success');
    }
    cMenu.classList.add('hidden');
};

document.getElementById('menu-paste').onclick = function() {
    if (elemenTargetTerakhir && kantongAjaib) {
        const input = elemenTargetTerakhir;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = input.value.slice(0, start) + kantongAjaib + input.value.slice(end);
        input.focus();
        input.setSelectionRange(start + kantongAjaib.length, start + kantongAjaib.length);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        showToast('Ditempel!', 'success');
    }
    cMenu.classList.add('hidden');
};

document.getElementById('menu-refresh').onclick = () => location.reload();
document.addEventListener('click', () => cMenu.classList.add('hidden'));
