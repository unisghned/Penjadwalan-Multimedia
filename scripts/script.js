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
function renderGuestSchedules() {
    db.ref('schedules').on('value', snap => {
        const list = document.getElementById('guest-schedule-list');
        if(!list) return;
        list.innerHTML = "";
        let visibleSchedules = 0;
        
        const hariIni = new Date();
        hariIni.setHours(0,0,0,0);

        snap.forEach(child => {
            const data = child.val();
            const tglJadwal = new Date(data.tanggal);
            tglJadwal.setHours(0,0,0,0);

            if(tglJadwal >= hariIni) {
                visibleSchedules++;
                const lim = data.kategori === 'Besar' ? 6 : 4;
                const count = data.petugas ? Object.keys(data.petugas).length : 0;
                const waktuSingkat = String(data.jam).replace(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s+/i, '');
                
                let petugasHtml = "";
                if(data.petugas) {
                    Object.keys(data.petugas).forEach(pKey => {
                        petugasHtml += `
                        <span class="roster-name">
                            ${data.petugas[pKey]}
                            <button onclick="removePetugas('${child.key}','${pKey}')" class="roster-remove" aria-label="Hapus ${data.petugas[pKey]}">×</button>
                        </span>`;
                    });
                }

                list.innerHTML += `
                <article class="schedule-card">
                    <div class="card-main">
                        <span class="service-type ${data.kategori === 'Besar' ? 'large' : ''}">${data.kategori}</span>
                        <h3 class="service-name">${data.namaMisa}</h3>
                        <p class="service-date">${formatScheduleDate(data.tanggal)}</p>
                    </div>
                    <div class="time-block">${waktuSingkat}</div>
                    <div class="card-bottom">
                        <div class="roster">
                            <p class="roster-label">Petugas Terdaftar</p>
                            <div class="roster-names">${petugasHtml || '<span class="roster-empty">Belum ada petugas</span>'}</div>
                        </div>
                        <div class="card-actions">
                            <span class="capacity ${count >= lim ? 'capacity-full' : ''}">${count}/${lim}</span>
                            <button onclick="openDaftarMandiri('${child.key}')" class="register-button" ${count>=lim?'disabled':''}>
                                ${count>=lim?'PENUH':'DAFTAR'}
                            </button>
                        </div>
                    </div>
                </article>`;
            }
        });

        document.getElementById('schedule-count').textContent = `${visibleSchedules} MISA`;
        if(visibleSchedules === 0) {
            list.innerHTML = '<p class="empty-state">Belum ada jadwal misa mendatang.</p>';
        }
    });
}

function formatScheduleDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if(Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
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

    let selectedMember = availableMembers[0];

    Swal.fire({
        title: 'Pilih Nama Anda',
        html: `
            <div class="member-picker">
                <label class="member-picker-label" for="member-picker-search">Cari nama anggota</label>
                <input id="member-picker-search" class="member-picker-search" type="search" placeholder="Ketik nama..." autocomplete="off">
                <div id="member-picker-list" class="member-picker-list" role="listbox" aria-label="Daftar anggota"></div>
                <p id="member-picker-selected" class="member-picker-selected"></p>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'DAFTAR',
        confirmButtonColor: '#0891b2',
        background: '#162238',
        color: '#fff',
        customClass: {
            popup: 'member-picker-popup',
            htmlContainer: 'member-picker-content',
            confirmButton: 'member-picker-confirm',
            cancelButton: 'member-picker-cancel'
        },
        didOpen: popup => {
            const search = popup.querySelector('#member-picker-search');
            const optionList = popup.querySelector('#member-picker-list');
            const selectedLabel = popup.querySelector('#member-picker-selected');

            function renderOptions(query = '') {
                const normalizedQuery = query.trim().toLowerCase();
                const matches = availableMembers
                    .map((name, index) => ({ name, index }))
                    .filter(member => member.name.toLowerCase().includes(normalizedQuery));

                optionList.innerHTML = matches.length
                    ? matches.map(member => `
                        <button type="button" class="member-picker-option ${member.name === selectedMember ? 'is-selected' : ''}"
                            role="option" aria-selected="${member.name === selectedMember}" data-member-index="${member.index}">
                            <span class="member-picker-avatar">${escapePickerHtml(member.name.trim().charAt(0).toUpperCase())}</span>
                            <span class="member-picker-name">${escapePickerHtml(member.name)}</span>
                            <span class="member-picker-check" aria-hidden="true">${member.name === selectedMember ? '✓' : ''}</span>
                        </button>`).join('')
                    : '<p class="member-picker-empty">Tidak ada nama yang cocok.</p>';

                selectedLabel.textContent = `Dipilih: ${selectedMember}`;
            }

            optionList.addEventListener('click', event => {
                const option = event.target.closest('[data-member-index]');
                if(!option) return;
                selectedMember = availableMembers[Number(option.dataset.memberIndex)];
                renderOptions(search.value);
            });
            search.addEventListener('input', () => renderOptions(search.value));
            renderOptions();
            search.focus();
        },
        preConfirm: () => {
            if(!selectedMember) {
                Swal.showValidationMessage('Pilih satu nama anggota terlebih dahulu.');
                return false;
            }
            return selectedMember;
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

function escapePickerHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
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

renderGuestSchedules();
