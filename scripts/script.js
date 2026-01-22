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

// ==========================================
// SECURITY: ANTI DEVTOOLS (FULL PROTECTION)
// ==========================================
function securityAlert(msg) {
    Swal.fire({
        icon: 'error',
        title: 'Akses Dilarang!',
        text: msg,
        background: '#162238',
        color: '#fff',
        confirmButtonColor: '#22d3ee',
        timer: 3000,
        showClass: { popup: 'animate__animated animate__shakeX' }
    });
}

document.addEventListener('contextmenu', e => {
    e.preventDefault();
    securityAlert("Klik kanan dinonaktifkan demi keamanan. 🙏");
});

document.addEventListener('keydown', e => {
    const isInspect = (e.keyCode === 123) || 
                      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || 
                      (e.ctrlKey && e.keyCode === 85);
    
    const isMac = e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74);

    if (isInspect || isMac) {
        e.preventDefault();
        securityAlert("Akses pengembang (Inspect Element) dilarang! 🚫");
        return false;
    }
});

// ==========================================
// FEATURE: AUTO-CLEANUP (Hapus Jadwal Lewat)
// ==========================================
function jalankanAutoCleanup() {
    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0); 

    db.ref('schedules').once('value', snapshot => {
        snapshot.forEach(child => {
            const data = child.val();
            const tglJadwal = new Date(data.tanggal);
            tglJadwal.setHours(0, 0, 0, 0);

            if (tglJadwal < hariIni) {
                db.ref(`schedules/${child.key}`).remove();
            }
        });
    });
}
jalankanAutoCleanup();

// ==========================================
// TAB & CLOCK SYSTEM
// ==========================================
setInterval(() => {
    const now = new Date();
    document.getElementById('realtime-clock').innerText = now.toLocaleString('id-ID', { 
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
}, 1000);

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-tab-${tab}`).classList.add('active-tab');
}

// ==========================================
// MEMBER MANAGEMENT (Hapus & Tambah)
// ==========================================
function addMember() {
    const input = document.getElementById('member-name');
    if(!input.value) return;
    db.ref('members').push({ name: input.value }).then(() => {
        input.value = "";
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Anggota ditambahkan', background: '#162238', color: '#fff' });
    });
}

function hapusAnggota(id, nama) {
    Swal.fire({
        title: `Hapus ${nama}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        background: '#162238',
        color: '#fff'
    }).then((res) => { if (res.isConfirmed) db.ref(`members/${id}`).remove(); });
}

db.ref('members').on('value', snapshot => {
    const grid = document.getElementById('members-grid');
    const select = document.getElementById('select-member');
    grid.innerHTML = "";
    select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    
    snapshot.forEach(child => {
        const id = child.key;
        const data = child.val();
        grid.innerHTML += `
            <div class="bg-[#162238] p-4 rounded-xl border border-gray-700 text-center relative group animate__animated animate__fadeIn">
                <p class="text-sm font-medium text-white">${data.name}</p>
                <button onclick="hapusAnggota('${id}', '${data.name}')" class="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">🗑️</button>
            </div>`;
        select.innerHTML += `<option value="${data.name}">${data.name}</option>`;
    });
});

// ==========================================
// SCHEDULE MANAGEMENT
// ==========================================
function setFilter(type) {
    currentFilter = type;
    document.getElementById('filter-biasa').className = type === 'Biasa' ? 'px-4 py-1 rounded-md text-xs filter-active' : 'px-4 py-1 rounded-md text-xs text-gray-400';
    document.getElementById('filter-besar').className = type === 'Besar' ? 'px-4 py-1 rounded-md text-xs filter-active' : 'px-4 py-1 rounded-md text-xs text-gray-400';
    
    const containerJam = document.getElementById('container-jam');
    if (type === 'Besar') {
        containerJam.innerHTML = `<input type="text" id="input-jam" placeholder="Jam Manual" class="w-full bg-[#0b1426] border border-gray-600 p-2 rounded text-sm text-white outline-none">`;
    } else {
        containerJam.innerHTML = `
            <select id="input-jam" class="w-full bg-[#0b1426] border border-gray-600 p-2 rounded text-sm text-white outline-none">
                <optgroup label="Sabtu">
                    <option value="Sabtu 18.00">Sabtu 18.00</option>
                </optgroup>
                <optgroup label="Minggu">
                    <option value="Minggu 06.00">Minggu 06.00</option>
                    <option value="Minggu 08.00">Minggu 08.00</option>
                    <option value="Minggu 10.00">Minggu 10.00</option>
                    <option value="Minggu 18.00">Minggu 18.00</option>
                </optgroup>
            </select>`;
    }
    renderSchedules();
}

function buatJadwal() {
    const tgl = document.getElementById('input-tgl').value;
    const jam = document.getElementById('input-jam').value;
    const ket = document.getElementById('input-nama-misa').value || "Misa";
    if(!tgl || !jam) return securityAlert("Lengkapi tanggal dan jam!");

    db.ref('schedules').push({ tanggal: tgl, jam: jam, namaMisa: ket, kategori: currentFilter, petugas: {} })
      .then(() => Swal.fire({ icon: 'success', title: 'Published!', background: '#162238', color: '#fff' }));
}

function renderSchedules() {
    db.ref('schedules').on('value', snapshot => {
        const container = document.getElementById('schedule-list');
        container.innerHTML = "";
        
        snapshot.forEach(child => {
            const id = child.key;
            const data = child.val();
            if (data.kategori !== currentFilter) return;

            let petugasHtml = "";
            let count = data.petugas ? Object.keys(data.petugas).length : 0;
            if (data.petugas) {
                Object.keys(data.petugas).forEach(k => {
                    petugasHtml += `
                        <span class="bg-[#0b1426] border border-gray-700 px-3 py-1 rounded-full text-[11px] text-cyan-400">
                            ${data.petugas[k]} 
                            <button onclick="removePetugas('${id}','${k}')" class="text-red-500 font-bold ml-1">×</button>
                        </span>`;
                });
            }

            container.innerHTML += `
                <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate__animated animate__fadeIn">
                    <div class="flex-1">
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded uppercase ${data.kategori==='Besar'?'bg-red-900':'bg-blue-900'}">${data.kategori}</span>
                        <h4 class="text-lg font-bold text-white mt-1">${data.jam}</h4>
                        <p class="text-xs text-gray-500">${data.namaMisa} | ${data.tanggal}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 flex-1 justify-center">${petugasHtml || '<span class="text-gray-700 italic text-xs uppercase tracking-widest">Kosong</span>'}</div>
                    <div class="flex items-center gap-3 justify-end min-w-[150px]">
                        <span class="text-xs font-mono text-gray-500">${count}/3</span>
                        <button onclick="openDaftar('${id}','${data.jam}')" class="bg-cyan-500 text-[#0b1426] px-4 py-2 rounded-lg text-xs font-bold" ${count>=3?'disabled':''}>${count>=3?'FULL':'DAFTAR'}</button>
                        <button onclick="hapusSatuJadwal('${id}')" class="text-red-500 p-1">🗑️</button>
                    </div>
                </div>`;
        });
    });
}

function openDaftar(id, jam) {
    selectedScheduleId = id;
    document.getElementById('modal-info').innerText = `Misa Jam: ${jam}`;
    document.getElementById('modal-daftar').classList.remove('hidden');
}

function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }

document.getElementById('confirm-daftar').onclick = function() {
    const name = document.getElementById('select-member').value;
    if(!name) return;
    db.ref(`schedules/${selectedScheduleId}/petugas`).push(name).then(() => {
        closeModal();
        Swal.fire({ icon: 'success', title: 'Berhasil', background: '#162238', color: '#fff', timer: 1000 });
    });
}

function hapusSatuJadwal(id) {
    Swal.fire({ title: 'Hapus?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', background: '#162238', color: '#fff' })
    .then(res => { if (res.isConfirmed) db.ref(`schedules/${id}`).remove(); });
}

function removePetugas(sId, pKey) {
    Swal.fire({ title: 'Batalkan Tugas?', icon: 'question', showCancelButton: true, background: '#162238', color: '#fff' })
    .then(res => { if (res.isConfirmed) db.ref(`schedules/${sId}/petugas/${pKey}`).remove(); });
}

function resetSemuaJadwal() {
    Swal.fire({ title: 'RESET SEMUA?', text: "Ketik 'HAPUS'", input: 'text', showCancelButton: true, background: '#162238', color: '#fff' })
    .then(res => { if (res.value === 'HAPUS') db.ref('schedules').set(null); });
}

setFilter('Biasa');
