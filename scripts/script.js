// --- CONFIG FIREBASE ---
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


// --- SECURITY SYSTEM: ANTI DEVTOOLS & SHORTCUT ---
(function() {
    // 1. Blokir Klik Kanan
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2. Blokir Shortcut Keyboard (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    document.addEventListener('keydown', e => {
        if (
            e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
            (e.ctrlKey && e.keyCode === 85) // Ctrl+U (View Source)
        ) {
            e.preventDefault();
            securityAlert("Akses Developer Tool Dilarang!");
            return false;
        }
    });

    // 3. Deteksi Inspect Element lewat Resize (Opsional tapi ampuh)
    let devtoolsOpen = false;
    const threshold = 160;
    setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                // Kamu bisa arahkan ke halaman kosong atau logout paksa
                // logout(); 
                console.log("%cSTOP!", "color:red;font-family:system-ui;font-size:3rem;-webkit-text-stroke: 1px black;font-weight:bold");
            }
            devtoolsOpen = true;
        } else {
            devtoolsOpen = false;
        }
    }, 500);
})();


// --- 1. AUTH SYSTEM (Email, Password & Verify) ---
function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        if (!user.emailVerified) {
            Swal.fire({
                title: 'Email Belum Diverifikasi!',
                text: 'Silakan cek email kamu dan klik link verifikasi.',
                icon: 'warning',
                confirmButtonText: 'Kirim Ulang Link'
            }).then((res) => { if(res.isConfirmed) user.sendEmailVerification(); });
            auth.signOut();
        }
    })
    .catch(err => Swal.fire('Error', 'Email/Password salah!', 'error'));
}

function handleRegister() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    auth.createUserWithEmailAndPassword(email, password)
    .then((res) => {
        res.user.sendEmailVerification();
        Swal.fire('Berhasil!', 'Akun dibuat. Cek EMAIL kamu untuk verifikasi sebelum login.', 'success');
        auth.signOut();
    })
    .catch(err => Swal.fire('Gagal', err.message, 'error'));
}

function logout() { auth.signOut(); }

auth.onAuthStateChanged(user => {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    if (user && user.emailVerified) {
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        renderSchedules();
    } else {
        loginScreen.classList.remove('hidden');
        appContent.classList.add('hidden');
    }
});

// --- 2. THEME & CLOCK ---
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', saved === 'dark');
}
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').innerText = isDark ? '☀️' : '🌙';
}
initTheme();
setInterval(() => {
    document.getElementById('realtime-clock').innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

// --- 3. JADWAL LOGIC (Max 5 Misa Besar) ---
function setFilter(type) {
    currentFilter = type;
    document.getElementById('filter-biasa').className = type === 'Biasa' ? 'flex-1 px-6 py-2 rounded-xl text-xs font-black filter-active transition-all' : 'flex-1 px-6 py-2 rounded-xl text-xs font-black text-slate-500 transition-all';
    document.getElementById('filter-besar').className = type === 'Besar' ? 'flex-1 px-6 py-2 rounded-xl text-xs font-black filter-active transition-all' : 'flex-1 px-6 py-2 rounded-xl text-xs font-black text-slate-500 transition-all';
    
    const container = document.getElementById('container-jam');
    if(type === 'Besar') {
        container.innerHTML = `<input type="text" id="input-jam" placeholder="Jam (Contoh: 17.00)" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm dark:text-white outline-none">`;
    } else {
        container.innerHTML = `<select id="input-jam" class="w-full bg-slate-50 dark:bg-[#0b1426] border border-slate-200 dark:border-slate-600 p-3 rounded-2xl text-sm dark:text-white outline-none">
            <option value="Sabtu 18.00">Sabtu 18.00</option>
            <option value="Minggu 06.00">Minggu 06.00</option>
            <option value="Minggu 08.00">Minggu 08.00</option>
            <option value="Minggu 10.00">Minggu 10.00</option>
            <option value="Minggu 18.00">Minggu 18.00</option>
        </select>`;
    }
    renderSchedules();
}

function renderSchedules() {
    db.ref('schedules').on('value', snap => {
        const list = document.getElementById('schedule-list');
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
            list.innerHTML += `<div class="bg-white dark:bg-[#162238] p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border dark:border-slate-700 animate__animated animate__fadeInUp">
                <div class="flex-1"><span class="text-[8px] font-black px-2 py-0.5 rounded bg-cyan-600 text-white uppercase">${data.kategori}</span><h4 class="text-2xl font-black dark:text-white mt-1">${data.jam}</h4><p class="text-[10px] text-slate-400 font-bold uppercase">${data.namaMisa} • ${data.tanggal}</p></div>
                <div class="flex flex-wrap gap-2 flex-1 justify-center">${petugasHtml || '<span class="text-slate-300 dark:text-slate-600 text-[10px] font-black uppercase">KOSONG</span>'}</div>
                <div class="flex items-center gap-4 justify-end min-w-[160px]"><span class="text-xs font-black ${count>=lim?'text-red-500':'text-slate-300'} font-mono">${count}/${lim}</span><button onclick="openDaftar('${child.key}','${data.jam}')" class="bg-cyan-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg ${count>=lim?'opacity-30 cursor-not-allowed':''}" ${count>=lim?'disabled':''}>${count>=lim?'FULL':'DAFTAR'}</button><button onclick="hapusSatuJadwal('${child.key}')" class="text-red-400">🗑️</button></div>
            </div>`;
        });
    });
}

// --- LOGIKA LAINNYA ---
function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => x.classList.add('hidden'));
    document.getElementById(`tab-${t}`).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    document.getElementById(`btn-tab-${t}`).classList.add('active-tab');
}
function buatJadwal() {
    const tgl = document.getElementById('input-tgl').value, jam = document.getElementById('input-jam').value, ket = document.getElementById('input-nama-misa').value || "MISA";
    if(!tgl || !jam) return Swal.fire('Info', 'Lengkapi data!', 'warning');
    db.ref('schedules').push({ tanggal: tgl, jam, namaMisa: ket, kategori: currentFilter, petugas: {} });
}
function addMember() {
    const n = document.getElementById('member-name').value;
    if(n) db.ref('members').push({ name: n }).then(() => { document.getElementById('member-name').value = ""; });
}
db.ref('members').on('value', snap => {
    const grid = document.getElementById('members-grid'), select = document.getElementById('select-member');
    grid.innerHTML = ""; select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    snap.forEach(child => {
        const id = child.key, name = child.val().name;
        grid.innerHTML += `<div class="bg-white dark:bg-[#162238] p-5 rounded-3xl border dark:border-slate-700 text-center relative group"><p class="font-bold dark:text-white">${name}</p><button onclick="db.ref('members/${id}').remove()" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button></div>`;
        select.innerHTML += `<option value="${name}">${name}</option>`;
    });
});
function openDaftar(id, jam) { selectedScheduleId = id; document.getElementById('modal-info').innerText = jam; document.getElementById('modal-daftar').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }
document.getElementById('confirm-daftar').onclick = function() {
    const name = document.getElementById('select-member').value;
    if(name) db.ref(`schedules/${selectedScheduleId}/petugas`).push(name).then(closeModal);
}
function removePetugas(s, k) { db.ref(`schedules/${s}/petugas/${k}`).remove(); }
function hapusSatuJadwal(id) { Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(r => { if(r.isConfirmed) db.ref(`schedules/${id}`).remove(); }); }

setFilter('Biasa');
