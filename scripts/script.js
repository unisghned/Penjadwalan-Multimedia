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

// Clock & Tab
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
        containerJam.innerHTML = `<input type="text" id="input-jam" placeholder="Jam (Mis: 17.30)" class="w-full bg-[#0b1426] border border-gray-600 p-2 rounded text-sm text-white outline-none focus:border-cyan-500">`;
    } else {
        containerJam.innerHTML = `
            <select id="input-jam" class="w-full bg-[#0b1426] border border-gray-600 p-2 rounded text-sm text-white outline-none focus:border-cyan-500">
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

// Logika Anggota
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

// Logika Jadwal
function buatJadwal() {
    const tgl = document.getElementById('input-tgl').value;
    const jam = document.getElementById('input-jam').value;
    const ket = document.getElementById('input-nama-misa').value || "Misa";
    if(!tgl || !jam) return alert("Lengkapi data!");
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
                    petugasHtml += `<span class="bg-[#0b1426] border border-gray-700 px-3 py-1 rounded-full text-xs text-cyan-400 flex items-center gap-1">${data.petugas[k]} <button onclick="removePetugas('${id}','${k}')" class="text-red-500 font-bold">×</button></span>`;
                });
            }

            container.innerHTML += `
                <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex-1">
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase ${data.kategori==='Besar'?'bg-red-900 text-red-200':'bg-blue-900 text-blue-200'}">${data.kategori}</span>
                        <h4 class="text-lg font-bold text-white mt-1">${data.jam} <span class="text-gray-500 font-normal">| ${data.namaMisa}</span></h4>
                        <p class="text-xs text-gray-500 font-mono">${data.tanggal}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 flex-1 justify-start md:justify-center">${petugasHtml || '<span class="text-gray-700 italic text-sm">Belum ada petugas</span>'}</div>
                    <div class="flex items-center gap-3 min-w-[150px] justify-end">
                        <span class="text-xs font-mono text-gray-500">${count}/3</span>
                        ${count < 3 ? `<button onclick="openDaftar('${id}','${data.jam}')" class="bg-cyan-500 hover:bg-cyan-400 text-[#0b1426] px-4 py-2 rounded-lg text-xs font-bold transition">Daftar</button>` : `<button disabled class="bg-gray-800 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold">Full</button>`}
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

function hapusSatuJadwal(id) { if(confirm("Hapus jadwal ini?")) db.ref(`schedules/${id}`).remove(); }
function removePetugas(sId, pKey) { if(confirm("Batalkan tugas?")) db.ref(`schedules/${sId}/petugas/${pKey}`).remove(); }
function resetSemuaJadwal() { if (prompt("Ketik 'HAPUS' untuk konfirmasi:") === "HAPUS") db.ref('schedules').set(null); }

setFilter('Biasa');