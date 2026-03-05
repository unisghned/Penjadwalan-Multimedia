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
let currentGuestFilter = 'Biasa';

// --- 5. HYPER SECURITY (TOTAL DEVTOOLS LOCKDOWN) ---

(function() {
    // 1. Blokir Event Keydown (Level 1)
    // Kita pakai capture: true supaya dieksekusi sebelum script lain
    window.addEventListener('keydown', function(e) {
        if (
            e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) || // I, J, C
            (e.ctrlKey && e.keyCode === 85) // Ctrl+U
        ) {
            e.preventDefault();
            e.stopPropagation();
            peringatanKeamanan();
        }
    }, true);

    // 2. DEBUGGER TRAP (Level 2 - Hardcore)
    // Begitu DevTools terbuka (lewat manapun), script ini akan bikin 
    // tab browser jadi "Freeze" atau sangat lambat bagi si pembobol.
    setInterval(function() {
        (function() {
            return false;
        })
        ["constructor"]("debugger")
        ["call"]();
    }, 50);

    // 3. ANTI-ELEMENT PICKER (Khusus Ctrl+Shift+C)
    // Kita hancurkan fungsi klik kanan dan pemilihan elemen
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    // 4. DETEKSI PERUBAHAN UKURAN (Jika DevTools Docked)
    window.onresize = function() {
        if ((window.outerHeight - window.innerHeight) > 200 || 
            (window.outerWidth - window.innerWidth) > 200) {
            window.location.reload(); 
        }
    };

    function peringatanKeamanan() {
        Swal.fire({
            icon: 'error',
            title: 'SISTEM TERKUNCI!',
            text: 'Dilarang keras mengakses fitur pengembang.',
            background: '#0b1426',
            color: '#fff',
            showConfirmButton: false,
            timer: 1500
        });
    }
})();

// Custom Menu untuk Refresh saja (Guest dilarang copy berlebihan)
const menuHTML = `
<div id="custom-menu" style="display: none;">
    <div onclick="location.reload()" class="menu-item">🔄 Refresh Halaman</div>
</div>`;
document.body.insertAdjacentHTML('beforeend', menuHTML);

document.addEventListener('contextmenu', e => {
    e.preventDefault();
    const m = document.getElementById('custom-menu');
    m.style.top = `${e.clientY}px`;
    m.style.left = `${e.clientX}px`;
    m.style.display = 'block'; // Pakai display block biar pasti muncul
    m.classList.remove('hidden');
});

document.addEventListener('click', () => {
    const m = document.getElementById('custom-menu');
    if(m) m.style.display = 'none'; // Sembunyiin lagi pas klik kiri
});

document.addEventListener('click', () => document.getElementById('custom-menu').classList.add('hidden'));

// --- 3. DATA RENDERING ---
function setGuestFilter(type) {
    currentGuestFilter = type;
    document.getElementById('f-biasa').classList.toggle('active', type === 'Biasa');
    document.getElementById('f-besar').classList.toggle('active', type === 'Besar');
    renderGuestSchedules();
}

function renderGuestSchedules() {
    db.ref('schedules').on('value', snap => {
        const list = document.getElementById('guest-schedule-list');
        if(!list) return;
        list.innerHTML = "";
        
        const hariIni = new Date();
        hariIni.setHours(0,0,0,0);

        snap.forEach(child => {
            const data = child.val();
            const tglJadwal = new Date(data.tanggal);
            tglJadwal.setHours(0,0,0,0);

            // Filter Kategori & Tanggal (Sudah lewat tidak tampil)
            if(data.kategori === currentGuestFilter && tglJadwal >= hariIni) {
                let petugasHtml = "";
                if(data.petugas) {
                    Object.values(data.petugas).forEach(p => {
                        petugasHtml += `<span class="bg-cyan-900/20 text-cyan-400 border border-cyan-900/50 px-4 py-1.5 rounded-full text-[11px] font-black">${p}</span>`;
                    });
                }

                list.innerHTML += `
                <div class="glass-card flex flex-col md:flex-row justify-between items-center gap-6 animate__animated animate__fadeInUp">
                    <div class="text-center md:text-left">
                        <span class="text-[8px] font-black px-2 py-0.5 rounded bg-cyan-600 text-white uppercase">${data.kategori}</span>
                        <h4 class="text-3xl font-black text-white mt-1">${data.jam}</h4>
                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${data.namaMisa} • ${data.tanggal}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 justify-center max-w-md">
                        ${petugasHtml || '<span class="text-slate-600 text-[10px] font-black uppercase tracking-widest">Belum Ada Petugas</span>'}
                    </div>
                </div>`;
            }
        });
    });
}

// Initial Run
setInterval(() => {
    const el = document.getElementById('realtime-clock');
    if(el) el.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

setGuestFilter('Biasa');