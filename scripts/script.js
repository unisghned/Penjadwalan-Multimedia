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
let availableMembers = [];

// Synchronization Anggota dari database
db.ref('members').on('value', snap => {
    availableMembers = [];
    snap.forEach(child => {
        availableMembers.push(child.val().name);
    });
});

// --- 2. HYPER SECURITY ---
(function() {
    window.addEventListener('keydown', function(e) {
        if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) || (e.ctrlKey && e.keyCode === 85)) {
            e.preventDefault();
            e.stopPropagation();
            peringatanKeamanan();
        }
    }, true);

    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    function peringatanKeamanan() {
        Swal.fire({
            icon: 'error',
            title: 'SISTEM TERKUNCI!',
            text: 'Dilarang keras mengakses fitur pengembang.',
            background: '#162238',
            color: '#fff',
            showConfirmButton: false,
            timer: 1500
        });
    }
})();

// --- 3. LOGIKA TAMPILAN JADWAL UNTUK PUBLIK ---
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
                const lim = data.kategori === 'Besar' ? 6 : 4;
                const count = data.petugas ? Object.keys(data.petugas).length : 0;
                
                let petugasHtml = "";
                if(data.petugas) {
                    Object.keys(data.petugas).forEach(pKey => {
                        petugasHtml += `
                        <span class="bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 px-4 py-2 rounded-full text-[11px] font-black tracking-wider flex items-center gap-2">
                            ${data.petugas[pKey]}
                            <button onclick="removePetugas('${child.key}','${pKey}')" class="text-red-400 hover:text-red-300 font-bold ml-1 text-sm">×</button>
                        </span>`;
                    });
                }

                list.innerHTML += `
                <div class="bg-[#162238]/60 border border-slate-800 p-8 md:p-10 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 animate__animated animate__fadeInUp transition-all hover:border-cyan-500/30 shadow-xl">
                    <div class="text-center md:text-left">
                        <span class="text-[9px] font-black px-3 py-1 rounded bg-cyan-600/20 text-cyan-500 uppercase tracking-[0.2em]">${data.kategori}</span>
                        <h4 class="text-4xl font-black text-white mt-3 tracking-tighter">${data.jam}</h4>
                        <p class="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">${data.namaMisa} <span class="mx-2 text-slate-800">•</span> ${data.tanggal}</p>
                    </div>
                    
                    <div class="flex flex-wrap gap-3 justify-center md:justify-end max-w-md w-full">
                        ${petugasHtml || '<span class="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] italic">Belum Ada Petugas</span>'}
                    </div>

                    <div class="flex items-center gap-4 justify-end min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/60 w-full md:w-auto">
                        <span class="text-xs font-black ${count>=lim?'text-red-500':'text-slate-400'} font-mono">${count}/${lim}</span>
                        <button onclick="openDaftarMandiri('${child.key}')" class="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${count>=lim?'opacity-30 cursor-not-allowed':''}" ${count>=lim?'disabled':''}>
                            ${count>=lim?'FULL':'DAFTAR'}
                        </button>
                    </div>
                </div>`;
            }
        });
    });
}

// Modal Pilih Nama Anggota
function openDaftarMandiri(sKey) {
    if (availableMembers.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Belum Ada Anggota',
            text: 'Minta admin menambahkan daftar nama anggota terlebih dahulu.',
            background: '#162238',
            color: '#fff'
        });
        return;
    }

    let optionsHtml = availableMembers.map(m => `<option value="${m}">${m}</option>`).join('');

    Swal.fire({
        title: 'Pilih Nama Anda',
        html: `<select id="swal-select-member" class="w-full bg-[#0b1426] border border-slate-600 p-3 rounded-2xl text-white text-sm outline-none">${optionsHtml}</select>`,
        showCancelButton: true,
        confirmButtonText: 'DAFTAR',
        confirmButtonColor: '#0891b2',
        background: '#162238',
        color: '#fff',
        preConfirm: () => {
            return document.getElementById('swal-select-member').value;
        }
    }).then((res) => {
        if(res.isConfirmed && res.value) {
            const name = res.value.trim();
            const assignmentsRef = db.ref(`schedules/${sKey}/petugas`);
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
                if(!result.committed) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Nama Sudah Terdaftar',
                        text: 'Nama ini sudah ada di jadwal tersebut.',
                        background: '#162238',
                        color: '#fff'
                    });
                }
            }).catch(error => Swal.fire('Gagal', error.message, 'error'));
        }
    });
}

function removePetugas(sKey, pKey) {
    Swal.fire({
        title: 'Hapus Tugas?',
        text: 'Apakah Anda yakin ingin menghapus nama dari jadwal ini?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Batal',
        confirmButtonText: 'Ya, Hapus',
        background: '#162238',
        color: '#fff'
    }).then(res => {
        if(res.isConfirmed) {
            db.ref(`schedules/${sKey}/petugas/${pKey}`).remove();
        }
    });
}

setInterval(() => {
    const el = document.getElementById('realtime-clock');
    if(el) el.innerText = new Date().toLocaleTimeString('id-ID');
}, 1000);

setGuestFilter('Biasa');
