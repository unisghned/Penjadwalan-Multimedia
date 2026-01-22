// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyC3R5kIDwXl2-Mvcu3Jv9UENLxGe5j2fUM",
  authDomain: "penjadwalan-multimedia.firebaseapp.com",
  databaseURL: "https://penjadwalan-multimedia-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "penjadwalan-multimedia",
  storageBucket: "penjadwalan-multimedia.firebasestorage.app",
  messagingSenderId: "494867708384",
  appId: "1:494867708384:web:143df1dd7fbab61551d385",
  measurementId: "G-H6Z5JWHZ9J"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentFilter = 'Biasa';
let selectedScheduleId = null;

// --- 1. THEME SYSTEM ---
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);
}

function applyTheme(theme) {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        html.classList.add('dark');
        icon.innerText = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.remove('dark');
        icon.innerText = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

function toggleTheme() {
    applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}
initTheme();

// --- 2. SECURITY ---
function securityAlert(msg) {
    const isDark = document.documentElement.classList.contains('dark');
    Swal.fire({
        icon: 'error', title: 'STOP!', text: msg,
        background: isDark ? '#162238' : '#ffffff',
        color: isDark ? '#fff' : '#1e293b',
        confirmButtonColor: '#0891b2'
    });
}
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if ((e.keyCode === 123) || (e.ctrlKey && e.shiftKey && [73, 67, 74].includes(e.keyCode)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        securityAlert("Akses dilarang!");
    }
});

// --- 3. AUTO-CLEANUP ---
function jalankanAutoCleanup() {
    const today = new Date();
    today.setHours(0,0,0,0);
    db.ref('schedules').once('value', snapshot => {
        snapshot.forEach(child => {
            if (new Date(child.val().tanggal) < today) db.ref(`schedules/${child.key}`).remove();
        });
    });
}
jalankanAutoCleanup();

// --- 4. ANGGOTA ---
function addMember() {
    const name = document.getElementById('member-name').value;
    if(!name) return;
    db.ref('members').push({ name }).then(() => { document.getElementById('member-name').value = ""; });
}

function hapusAnggota(id, nama) {
    Swal.fire({
        title: `Hapus ${nama}?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
        background: document.documentElement.classList.contains('dark') ? '#162238' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#fff' : '#000'
    }).then(res => { if(res.isConfirmed) db.ref(`members/${id}`).remove(); });
}

db.ref('members').on('value', snap => {
    const grid = document.getElementById('members-grid'), select = document.getElementById('select-member');
    grid.innerHTML = ""; select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    snap.forEach(child => {
        const id = child.key, name = child.val().name;
        grid.innerHTML += `<div class="bg-white dark:bg-[#162238] p-5 rounded-3xl border border-slate-200 dark:border-slate-700 text-center relative group animate__animated animate__fadeIn shadow-sm"><p class="font-bold text-slate-800 dark:text-white">${name}</p><button onclick="hapusAnggota('${id}','${name}')" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button></div>`;
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
});

// --- 5. JADWAL (UPDATE LIMIT 3/5) ---
setInterval(() => {
    document.getElementById('realtime-clock').innerText = new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}, 1000);

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => x.classList.add('hidden'));
    document.getElementById(`tab-${t}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    document.getElementById(`btn-tab-${t}`).classList.add('active-tab');
}

function setFilter(type) {
    currentFilter = type;
    document.getElementById('filter-biasa').className = type === 'Biasa' ? 'flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all filter-active' : 'flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all text-slate-500';
    document.getElementById('filter-besar').className = type === 'Besar' ? 'flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all filter-active' : 'flex-1 px-6 py-2 rounded-xl text-xs font-black transition-all text-slate-500';
    const container = document.getElementById('container-jam');
    if(type === 'Besar') {
        container.innerHTML = `<input type="text" id="input-jam" placeholder="Jam Manual" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm outline-none focus:ring-2 ring-cyan-500 text-slate-900 dark:text-white transition-all">`;
    } else {
        container.innerHTML = `<select id="input-jam" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm outline-none focus:ring-2 ring-cyan-500 text-slate-900 dark:text-white transition-all"><optgroup label="SABTU"><option value="Sabtu 18.00">Sabtu 18.00</option></optgroup><optgroup label="MINGGU"><option value="Minggu 06.00">Minggu 06.00</option><option value="Minggu 08.00">Minggu 08.00</option><option value="Minggu 10.00">Minggu 10.00</option><option value="Minggu 18.00">Minggu 18.00</option></optgroup></select>`;
    }
    renderSchedules();
}

function buatJadwal() {
    const tgl = document.getElementById('input-tgl').value, jam = document.getElementById('input-jam').value, ket = document.getElementById('input-nama-misa').value || "MISA";
    if(!tgl || !jam) return securityAlert("Lengkapi data!");
    db.ref('schedules').push({ tanggal: tgl, jam, namaMisa: ket, kategori: currentFilter, petugas: {} });
}

function renderSchedules() {
    db.ref('schedules').on('value', snap => {
        const list = document.getElementById('schedule-list'); list.innerHTML = "";
        snap.forEach(child => {
            const data = child.val(); if(data.kategori !== currentFilter) return;
            const lim = data.kategori === 'Besar' ? 5 : 3;
            let count = data.petugas ? Object.keys(data.petugas).length : 0;
            let petugasHtml = "";
            if(data.petugas) {
                Object.keys(data.petugas).forEach(k => {
                    petugasHtml += `<span class="bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-[10px] text-cyan-700 dark:text-cyan-400 font-black animate__animated animate__fadeIn">${data.petugas[k]} <button onclick="removePetugas('${child.key}','${k}')" class="text-red-500 ml-1">×</button></span>`;
                });
            }
            list.innerHTML += `<div class="bg-white dark:bg-[#162238] p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-slate-200 dark:border-slate-700 animate__animated animate__fadeInUp transition-all">
                <div class="flex-1"><span class="text-[8px] font-black px-2 py-0.5 rounded bg-cyan-600 text-white uppercase tracking-tighter">${data.kategori}</span><h4 class="text-2xl font-black text-slate-800 dark:text-white mt-1 uppercase tracking-tighter">${data.jam}</h4><p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${data.namaMisa} • ${data.tanggal}</p></div>
                <div class="flex flex-wrap gap-2 flex-1 justify-center">${petugasHtml || '<span class="text-slate-300 dark:text-slate-600 italic text-[10px] font-black uppercase tracking-widest">NO AGENTS</span>'}</div>
                <div class="flex items-center gap-4 justify-end min-w-[160px]"><span class="text-xs font-black ${count>=lim?'text-red-500':'text-slate-300'} font-mono">${count}/${lim}</span><button onclick="openDaftar('${child.key}','${data.jam}')" class="bg-cyan-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-cyan-600/20 active:scale-95 transition-all ${count>=lim?'opacity-30':''}" ${count>=lim?'disabled':''}>${count>=lim?'FULL':'DAFTAR'}</button><button onclick="hapusSatuJadwal('${child.key}')" class="text-red-400">🗑️</button></div>
            </div>`;
        });
    });
}

function openDaftar(id, jam) { selectedScheduleId = id; document.getElementById('modal-info').innerText = jam; document.getElementById('modal-daftar').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }
document.getElementById('confirm-daftar').onclick = function() {
    const name = document.getElementById('select-member').value;
    if(name) db.ref(`schedules/${selectedScheduleId}/petugas`).push(name).then(closeModal);
}
function hapusSatuJadwal(id) { Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', background: document.documentElement.classList.contains('dark') ? '#162238' : '#fff' }).then(r => { if(r.isConfirmed) db.ref(`schedules/${id}`).remove(); }); }
function removePetugas(s, k) { db.ref(`schedules/${s}/petugas/${k}`).remove(); }

setFilter('Biasa');
