

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

// --- 2. TEMPLATES (The "Ghost" UI) ---
const UI_LOGIN = `
<div class="fixed inset-0 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-[#162238] p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full animate__animated animate__zoomIn">
        <div class="text-center mb-8">
            <div class="text-4xl mb-2">🎥</div>
            <h2 class="text-2xl font-black dark:text-white uppercase tracking-tighter">Login Tim</h2>
        </div>
        <form onsubmit="event.preventDefault(); handleLogin();" class="space-y-4">
            <input type="email" id="auth-email" placeholder="Email" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-4 rounded-2xl outline-none focus:ring-2 ring-cyan-500 dark:text-white text-sm" required>
            <input type="password" id="auth-password" placeholder="Password" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-4 rounded-2xl outline-none focus:ring-2 ring-cyan-500 dark:text-white text-sm" required>
            <button type="submit" class="w-full bg-cyan-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-cyan-500 shadow-lg">MASUK</button>
            <button type="button" onclick="handleRegister()" class="w-full text-slate-400 font-bold text-[10px] uppercase mt-2 tracking-widest">Daftar Akun Baru</button>
        </form>
    </div>
</div>`;

const UI_APP = `
    <nav class="bg-white dark:bg-[#162238] border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-50 shadow-md">
        <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">🎥 <span class="text-cyan-500">Multimedia</span></h1>
            <div class="flex items-center gap-4">
                <button onclick="logout()" class="text-[10px] font-black text-red-500 uppercase">Keluar</button>
                <button onclick="toggleTheme()" class="p-2.5 rounded-2xl bg-slate-100 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-700"><span id="theme-icon">☀️</span></button>
                <div id="realtime-clock" class="text-xs font-mono font-bold text-cyan-600"></div>
            </div>
        </div>
    </nav>
    <div class="container mx-auto p-4 max-w-5xl animate__animated animate__fadeIn">
        <div class="flex justify-center gap-4 mb-8 border-b border-slate-200 dark:border-slate-800">
            <button onclick="switchTab('jadwal')" id="btn-tab-jadwal" class="tab-btn active-tab">📅 JADWAL</button>
            <button onclick="switchTab('anggota')" id="btn-tab-anggota" class="tab-btn">👥 ANGGOTA</button>
        </div>
        <section id="tab-jadwal" class="tab-content space-y-6">
            <div class="bg-white dark:bg-[#162238] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <h3 class="font-black text-cyan-400 text-sm uppercase">Input Jadwal</h3>
                    <div class="flex bg-slate-100 dark:bg-[#0b1426] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                        <button onclick="setFilter('Biasa')" id="filter-biasa" class="flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all filter-active">BIASA</button>
                        <button onclick="setFilter('Besar')" id="filter-besar" class="flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all text-slate-500">BESAR</button>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="date" id="input-tgl" class="bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm dark:text-white outline-none">
                    <div id="container-jam"></div>
                    <input type="text" id="input-nama-misa" placeholder="Nama Misa" class="bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm dark:text-white outline-none">
                    <button onclick="buatJadwal()" class="bg-cyan-600 text-white font-black rounded-2xl shadow-lg py-3">PUBLISH</button>
                </div>
            </div>
            <div id="schedule-list" class="space-y-4"></div>
        </section>
        <section id="tab-anggota" class="tab-content hidden animate__animated animate__fadeIn">
            <div class="bg-white dark:bg-[#162238] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl mb-6">
                <div class="flex flex-col md:flex-row gap-4">
                    <input type="text" id="member-name" placeholder="Nama Lengkap" class="flex-1 bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl outline-none dark:text-white text-sm">
                    <button onclick="addMember()" class="bg-cyan-600 text-white px-10 py-3 font-black rounded-2xl shadow-lg">SIMPAN</button>
                </div>
            </div>
            <div id="members-grid" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>
        </section>
    </div>
    <div id="modal-daftar" class="fixed inset-0 bg-slate-900/60 dark:bg-black/80 hidden flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
        <div class="bg-white dark:bg-[#162238] p-8 rounded-[2.5rem] max-w-sm w-full animate__animated animate__bounceIn">
            <h3 class="text-2xl font-black mb-1 dark:text-white text-center">PILIH PETUGAS</h3>
            <p id="modal-info" class="text-[10px] text-cyan-600 font-bold mb-6 text-center uppercase"></p>
            <select id="select-member" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-4 rounded-2xl mb-8 dark:text-white outline-none"></select>
            <div class="flex gap-4">
                <button onclick="closeModal()" class="flex-1 text-slate-400 font-black text-xs uppercase">Batal</button>
                <button id="confirm-daftar" class="flex-[2] bg-cyan-600 text-white py-4 rounded-2xl font-black shadow-lg text-xs uppercase">Daftar</button>
            </div>
        </div>
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

    biasaBtn.className = type === 'Biasa' ? 'flex-1 px-6 py-2 rounded-xl text-xs font-black filter-active transition-all' : 'flex-1 px-6 py-2 rounded-xl text-xs font-black text-slate-500 transition-all';
    besarBtn.className = type === 'Besar' ? 'flex-1 px-6 py-2 rounded-xl text-xs font-black filter-active transition-all' : 'flex-1 px-6 py-2 rounded-xl text-xs font-black text-slate-500 transition-all';
    
    const container = document.getElementById('container-jam');
    container.innerHTML = type === 'Besar' ? 
        `<input type="text" id="input-jam" placeholder="Contoh: 17.00" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm dark:text-white outline-none">` :
        `<select id="input-jam" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm dark:text-white outline-none">
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
        snap.forEach(child => {
            const data = child.val(); if(data.kategori !== currentFilter) return;
            const lim = data.kategori === 'Besar' ? 5 : 3;
            const count = data.petugas ? Object.keys(data.petugas).length : 0;
            let petugasHtml = "";
            if(data.petugas) {
                Object.keys(data.petugas).forEach(k => {
                    petugasHtml += `<span class="bg-slate-100 dark:bg-[#0b1426] border dark:border-slate-700 px-3 py-1.5 rounded-full text-[10px] text-cyan-600 font-black">
                        ${data.petugas[k]} <button onclick="removePetugas('${child.key}','${k}')" class="text-red-500 ml-1">×</button>
                    </span>`;
                });
            }
            list.innerHTML += `
            <div class="bg-white dark:bg-[#162238] p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-slate-200 dark:border-slate-700 animate__animated animate__fadeInUp">
                <div class="flex-1"><span class="text-[8px] font-black px-2 py-0.5 rounded bg-cyan-600 text-white uppercase">${data.kategori}</span><h4 class="text-2xl font-black dark:text-white mt-1">${data.jam}</h4><p class="text-[10px] text-slate-400 font-bold uppercase">${data.namaMisa} • ${data.tanggal}</p></div>
                <div class="flex flex-wrap gap-2 flex-1 justify-center">${petugasHtml || '<span class="text-slate-300 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest text-center">Empty</span>'}</div>
                <div class="flex items-center gap-4 justify-end min-w-[160px]"><span class="text-xs font-black ${count>=lim?'text-red-500':'text-slate-300'} font-mono">${count}/${lim}</span><button onclick="openDaftar('${child.key}','${data.jam}')" class="bg-cyan-600 text-white px-8 py-3 rounded-2xl text-xs font-black ${count>=lim?'opacity-30 cursor-not-allowed':''}" ${count>=lim?'disabled':''}>${count>=lim?'FULL':'DAFTAR'}</button><button onclick="hapusSatuJadwal('${child.key}')" class="text-red-400">🗑️</button></div>
            </div>`;
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
        grid.innerHTML = ""; select.innerHTML = '<option value="">-- Pilih Nama --</option>';
        snap.forEach(child => {
            const id = child.key, name = child.val().name;
            grid.innerHTML += `<div class="bg-white dark:bg-[#162238] p-5 rounded-3xl border border-slate-200 dark:border-slate-700 text-center relative group"><p class="font-bold dark:text-white text-sm">${name}</p><button onclick="db.ref('members/${id}').remove()" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100">🗑️</button></div>`;
            select.innerHTML += `<option value="${name}">${name}</option>`;
        });
    });
}

function addMember() {
    const n = document.getElementById('member-name').value;
    if(n) db.ref('members').push({ name: n }).then(() => { document.getElementById('member-name').value = ""; });
}

function openDaftar(id, jam) { selectedScheduleId = id; document.getElementById('modal-info').innerText = jam; document.getElementById('modal-daftar').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }
document.addEventListener('click', e => {
    if(e.target.id === 'confirm-daftar') {
        const name = document.getElementById('select-member').value;
        if(name) db.ref(`schedules/${selectedScheduleId}/petugas`).push(name).then(closeModal);
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
