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

// --- SECURITY: ANTI DEVTOOLS & RIGHT CLICK (V2 - TOUGHER) ---
function securityAlert(msg) {
    Swal.fire({
        icon: 'error',
        title: 'Akses Dilarang!',
        text: msg,
        background: '#162238',
        color: '#fff',
        confirmButtonColor: '#22d3ee',
        timer: 2500,
        showClass: { popup: 'animate__animated animate__shakeX' }
    });
}

// 1. Matikan Klik Kanan
document.addEventListener('contextmenu', e => {
    e.preventDefault();
    securityAlert("Klik kanan dinonaktifkan demi keamanan. 🙏");
});

// 2. Matikan Semua Shortcut DevTools (Termasuk Ctrl+Shift+C)
document.addEventListener('keydown', e => {
    // F12
    const isF12 = e.keyCode === 123;
    // Ctrl+Shift+I (73), Ctrl+Shift+C (67), Ctrl+Shift+J (74)
    const isInspect = e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74);
    // Ctrl+U (View Source)
    const isViewSource = e.ctrlKey && e.keyCode === 85;
    // Cmd+Opt+I/C/J (Untuk Mac)
    const isMacDev = e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74);

    if (isF12 || isInspect || isViewSource || isMacDev) {
        e.preventDefault();
        e.stopPropagation();
        securityAlert("Jangan ya kak yaa! 🚫");
        return false;
    }
});

// --- CLOCK & TABS ---
setInterval(() => {
    document.getElementById('realtime-clock').innerText = new Date().toLocaleString('id-ID', { 
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
}, 1000);

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-tab-${tab}`).classList.add('active-tab');
}

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
                <optgroup label="Sabtu"><option value="Sabtu 18.00">Sabtu 18.00</option></optgroup>
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

// --- LOGIKA DATA (MEMBER & SCHEDULE) ---
function addMember() {
    const input = document.getElementById('member-name');
    if(input.value) db.ref('members').push({ name: input.value }).then(() => input.value = "");
}

db.ref('members').on('value', snapshot => {
    const grid = document.getElementById('members-grid');
    const select = document.getElementById('select-member');
    grid.innerHTML = "";
    select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    snapshot.forEach(child => {
        const data = child.val();
        grid.innerHTML += `<div class="bg-[#162238] p-4 rounded-xl border border-gray-700 text-center"><p class="text-sm font-medium">${data.name}</p></div>`;
        select.innerHTML += `<option value="${data.name}">${data.name}</option>`;
    });
});

function buatJadwal() {
    const tgl = document.getElementById('input-tgl').value;
    const jam = document.getElementById('input-jam').value;
    const ket = document.getElementById('input-nama-misa').value || "Misa";
    if(!tgl || !jam) return securityAlert("Lengkapi data!");
    db.ref('schedules').push({ tanggal: tgl, jam: jam, namaMisa: ket, kategori: currentFilter, petugas: {} });
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
            let count = 0;
            if (data.petugas) {
                Object.keys(data.petugas).forEach(k => {
                    count++;
                    petugasHtml += `<span class="bg-[#0b1426] border border-gray-700 px-3 py-1 rounded-full text-xs text-cyan-400 flex items-center gap-1">${data.petugas[k]} <button onclick="removePetugas('${id}','${k}')" class="text-red-500 font-bold ml-1">×</button></span>`;
                });
            }

            container.innerHTML += `
                <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex-1">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase ${data.kategori==='Besar'?'bg-red-900 text-red-200':'bg-blue-900 text-blue-200'}">${data.kategori}</span>
                        <h4 class="text-lg font-bold text-white mt-1">${data.jam}</h4>
                        <p class="text-xs text-gray-500 font-medium italic">${data.namaMisa} (${data.tanggal})</p>
                    </div>
                    <div class="flex flex-wrap gap-2 flex-1 justify-start md:justify-center">${petugasHtml || '<span class="text-gray-700 italic text-sm">Kosong</span>'}</div>
                    <div class="flex items-center gap-3 min-w-[150px] justify-end">
                        <span class="text-xs font-mono text-gray-500">${count}/3</span>
                        ${count < 3 ? `<button onclick="openDaftar('${id}','${data.jam}')" class="bg-cyan-500 hover:bg-cyan-400 text-[#0b1426] px-4 py-2 rounded-lg text-xs font-bold transition">DAFTAR</button>` : `<button disabled class="bg-gray-800 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">FULL</button>`}
                        <button onclick="hapusSatuJadwal('${id}')" class="text-red-500 hover:text-red-400 p-2">🗑️</button>
                    </div>
                </div>`;
        });
    });
}

function openDaftar(id, jam) { selectedScheduleId = id; document.getElementById('modal-info').innerText = `Misa Jam: ${jam}`; document.getElementById('modal-daftar').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }

document.getElementById('confirm-daftar').onclick = function() {
    const name = document.getElementById('select-member').value;
    if(name) db.ref(`schedules/${selectedScheduleId}/petugas`).push(name).then(() => closeModal());
}

function hapusSatuJadwal(id) {
    Swal.fire({
        title: 'Hapus?', icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', background: '#162238', color: '#fff'
    }).then(res => { if(res.isConfirmed) db.ref(`schedules/${id}`).remove(); });
}

function removePetugas(sId, pKey) {
    Swal.fire({
        title: 'Batal Tugas?', icon: 'question', showCancelButton: true,
        background: '#162238', color: '#fff'
    }).then(res => { if(res.isConfirmed) db.ref(`schedules/${sId}/petugas/${pKey}`).remove(); });
}

function resetSemuaJadwal() {
    Swal.fire({
        title: 'RESET DATA?', text: "Ketik 'HAPUS'", input: 'text',
        showCancelButton: true, background: '#162238', color: '#fff'
    }).then(res => { if(res.value === 'HAPUS') db.ref('schedules').set(null); });
}

setFilter('Biasa');
