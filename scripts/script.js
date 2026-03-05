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
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) || (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            peringatanKeamanan();
        }
    }, true);

    setInterval(function() {
        (function() { return false; })["constructor"]("debugger")["call"]();
    }, 50);

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    window.onresize = function() {
        if ((window.outerHeight - window.innerHeight) > 200 || (window.outerWidth - window.innerWidth) > 200) {
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

// --- 3. DATA RENDERING (LEBIH LEGA) ---
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

            if(data.kategori === currentGuestFilter && tglJadwal >= hariIni) {
                let petugasHtml = "";
                if(data.petugas) {
                    Object.values(data.petugas).forEach(p => {
                        // Tag petugas dengan padding lebih besar
                        petugasHtml += `<span class="bg-cyan-900/40 text-cyan-400 border border-cyan-800/50 px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest">${p}</span>`;
                    });
                }

                // GANTI STRUKTUR DI SINI: Tambahkan class padding tinggi (py-12 px-10)
                list.innerHTML += `
                <div class="bg-[#162238]/40 border border-slate-800/50 p-10 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 animate__animated animate__fadeInUp transition-all hover:border-cyan-500/30">
                    <div class="text-center md:text-left">
                        <span class="text-[9px] font-black px-3 py-1 rounded bg-cyan-600/20 text-cyan-500 uppercase tracking-[0.2em]">${data.kategori}</span>
                        <h4 class="text-5xl font-black text-white mt-4 tracking-tighter">${data.jam}</h4>
                        <p class="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">${data.namaMisa} <span class="mx-2 text-slate-800">•</span> ${data.tanggal}</p>
                    </div>
                    <div class="flex flex-wrap gap-4 justify-center md:justify-end max-w-md pt-6 md:pt-0 border-t md:border-t-0 border-slate-800/50 w-full md:w-auto">
                        ${petugasHtml || '<span class="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em] italic">Belum Ada Petugas</span>'}
                    </div>
                </div>`;
            }
        });
    });
}

setInterval(() => {
    const el = document.getElementById('realtime-clock');
    if(el) el.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

setGuestFilter('Biasa');
