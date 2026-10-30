firebase.initializeApp(window.firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let currentFilter = 'Biasa';
let selectedScheduleId = null;
let membersCache = {};
let schedulesCache = {};
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalendarDate = null;

// --- 2. TEMPLATES (The "Ghost" UI) ---
const UI_LOGIN = `
<main class="admin-shell login-shell">
    <nav class="admin-topbar">
        <a class="wordmark" href="index.html"><img class="brand-logo" src="assets/logo.png" alt=""> Multimedia Team</a>
    </nav>
    <header class="admin-hero">
        <p class="eyebrow">Saint Martinus · Ruang Tim</p>
        <h1>AREA <span>ADMIN</span></h1>
        <p>Masuk untuk mengelola jadwal dan anggota.</p>
    </header>
    <section class="login-card">
        <h2>Login Tim</h2>
        <p>Akses khusus untuk administrator multimedia.</p>
        <form onsubmit="event.preventDefault(); handleLogin();" class="login-form">
            <input type="email" id="auth-email" placeholder="Email" class="admin-input" required>
            <input type="password" id="auth-password" placeholder="Password" class="admin-input" required>
            <button type="submit" class="primary-button">MASUK</button>
            <button type="button" onclick="handleAnonymousLogin()" class="secondary-button anonymous-login">MASUK ANONIM</button>
            <button type="button" onclick="handleRegister()" class="login-register">Daftar Akun Baru</button>
        </form>
    </section>
</main>`;

const UI_APP = `
<main class="admin-shell">
    <nav class="admin-topbar">
        <a class="wordmark" href="index.html"><img class="brand-logo" src="assets/logo.png" alt=""> Multimedia Team</a>
        <div class="admin-topbar-actions">
            <div id="realtime-clock" class="admin-clock"></div>
            <button onclick="toggleTheme()" class="icon-button" aria-label="Ganti tema"><span id="theme-icon">☀</span></button>
            <button onclick="logout()" class="danger-button">KELUAR</button>
        </div>
    </nav>

    <header class="admin-hero">
        <p class="eyebrow">Saint Martinus · Ruang Tim</p>
        <h1>Jadwal <span>Multimedia</span></h1>
        <p>Atur pelayanan misa dan daftar anggota tim.</p>
    </header>

    <nav class="admin-tabs" aria-label="Bagian administrasi">
        <button onclick="switchTab('jadwal')" id="btn-tab-jadwal" class="tab-btn active-tab">JADWAL</button>
        <button onclick="switchTab('tayang')" id="btn-tab-tayang" class="tab-btn">TAYANG TERJADWAL <span id="scheduled-count" class="tab-count">0</span></button>
        <button onclick="switchTab('anggota')" id="btn-tab-anggota" class="tab-btn">ANGGOTA</button>
    </nav>

    <section id="tab-jadwal" class="tab-content">
        <div class="admin-panel">
            <div class="panel-heading">
                <div><h2>Jadwal misa</h2><p>Kelola jadwal dan pendaftaran petugas.</p></div>
            </div>
            <div class="dashboard-summary" id="dashboard-summary">
                <article class="summary-card"><span>Jadwal mendatang</span><strong id="summary-upcoming">0</strong></article>
                <article class="summary-card"><span>Menunggu penayangan</span><strong id="summary-scheduled">0</strong></article>
                <article class="summary-card summary-needs-staff">
                    <span>Masih butuh petugas (&lt;50% kuota)</span>
                    <strong id="summary-needs-staff">0</strong>
                    <div id="summary-needs-staff-details" class="summary-details"></div>
                </article>
                <article class="summary-card"><span>Kuota penuh</span><strong id="summary-full">0</strong></article>
            </div>
            <div class="schedule-panel-actions">
                <div class="filter-control" aria-label="Jenis misa yang ditampilkan">
                    <button onclick="setFilter('Biasa')" id="filter-biasa" class="filter-button is-active">BIASA</button>
                    <button onclick="setFilter('Besar')" id="filter-besar" class="filter-button">BESAR</button>
                </div>
                <button onclick="buatJadwal()" class="primary-button">+ TAMBAH MISA</button>
            </div>
        </div>
        <section id="schedule-calendar" class="schedule-calendar" aria-label="Kalender jadwal misa"></section>
        <section class="schedule-agenda">
            <div class="agenda-heading">
                <div><h2 id="agenda-title">Daftar misa mendatang</h2><p id="agenda-description">Pilih misa di bawah untuk menambah petugas, mengedit, atau mengelola jadwal.</p></div>
                <button id="agenda-show-all" onclick="showAllUpcomingSchedules()" class="secondary-button hidden">TAMPILKAN SEMUA</button>
            </div>
            <div id="schedule-agenda-list" class="schedule-list admin-schedule-list"></div>
        </section>
    </section>

    <section id="tab-tayang" class="tab-content hidden">
        <div class="admin-panel">
            <div class="panel-heading">
                <div><h2>Penayangan misa terjadwal</h2><p>Jadwal di sini tidak bercampur dengan daftar misa langsung. Anda bisa menampilkannya lebih awal kapan saja.</p></div>
            </div>
        </div>
        <div id="scheduled-schedule-list" class="schedule-list admin-schedule-list"></div>
    </section>

    <section id="tab-anggota" class="tab-content hidden">
        <div class="admin-panel member-panel">
            <div class="panel-heading"><div><h2>Daftar anggota</h2><p>Tambahkan nama yang bisa dipilih pada pendaftaran jadwal.</p></div></div>
            <div class="member-form">
                <input type="text" id="member-name" placeholder="Nama lengkap" class="admin-input">
                <button onclick="addMember()" class="primary-button">TAMBAH ANGGOTA</button>
            </div>
        </div>
        <div id="members-grid" class="members-grid"></div>
    </section>
</main>

<div id="modal-daftar" class="modal-backdrop hidden">
    <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">Pilih petugas</h2>
        <p id="modal-info"></p>
        <select id="select-member" class="admin-select"></select>
        <div class="modal-actions">
            <button onclick="closeModal()" class="secondary-button">BATAL</button>
            <button id="confirm-daftar" class="primary-button">DAFTAR</button>
        </div>
    </section>
</div>`;

// --- 3. CORE AUTH LOGIC ---
auth.onAuthStateChanged(user => {
    const root = document.getElementById('app-root');
    const shield = document.getElementById('shield-overlay');

    if (user && (user.isAnonymous || user.emailVerified)) {
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

function getLocalDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function handleAnonymousLogin() {
    auth.signInAnonymously().catch(error => {
        const message = error.code === 'auth/operation-not-allowed'
            ? 'Login anonim belum diaktifkan di Firebase Authentication.'
            : error.message;
        Swal.fire('Gagal Masuk Anonim', message, 'error');
    });
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
    initSchedulesListener();
    setFilter('Biasa');
    initClock();
    initMembersListener();
    
    // Global Keypress for Enter
    document.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            const el = document.activeElement;
            if (el.id === 'member-name') addMember();
        }
    });
}

function setFilter(type) {
    currentFilter = type;
    const biasaBtn = document.getElementById('filter-biasa');
    const besarBtn = document.getElementById('filter-besar');
    if(!biasaBtn) return;

    biasaBtn.classList.toggle('is-active', type === 'Biasa');
    besarBtn.classList.toggle('is-active', type === 'Besar');
    
    const container = document.getElementById('container-jam');
    if(container) renderJamInput(type);
    const maxPetugasInput = document.getElementById('input-max-petugas');
    if(maxPetugasInput) maxPetugasInput.value = type === 'Besar' ? 6 : 4;
    refreshScheduleViews();
}

function renderJamInput(type, initialValue = '') {
    const container = document.getElementById('container-jam');
    if(!container) return;
    const regularTimes = ['Jumat 18.00', 'Sabtu 18.00', 'Minggu 06.00', 'Minggu 08.00', 'Minggu 10.00', 'Minggu 18.00'];
    const isCustomTime = initialValue && !regularTimes.includes(initialValue);
    container.innerHTML = type === 'Besar' ?
        `<input type="text" id="input-jam" placeholder="Contoh: 17.00" value="${escapeHtml(initialValue)}" class="admin-input">` :
        `<select id="input-jam" class="admin-select">
            ${regularTimes.map(time => `<option value="${time}" ${initialValue === time ? 'selected' : ''}>${time}</option>`).join('')}
            <option value="custom" ${isCustomTime ? 'selected' : ''}>Jam lainnya (isi sendiri)</option>
        </select>
        <input type="text" id="input-jam-custom" placeholder="Contoh: Rabu 18.00" aria-label="Masukkan hari dan jam misa" value="${isCustomTime ? escapeHtml(initialValue) : ''}" class="admin-input ${isCustomTime ? '' : 'hidden'}">`;
    if(type === 'Biasa') {
        const jamSelect = document.getElementById('input-jam');
        const jamCustom = document.getElementById('input-jam-custom');
        jamSelect.addEventListener('change', () => {
            jamCustom.classList.toggle('hidden', jamSelect.value !== 'custom');
            if(jamSelect.value === 'custom') jamCustom.focus();
        });
    }
}

function getJamInput() {
    const jamInput = document.getElementById('input-jam');
    if(currentFilter === 'Biasa' && jamInput.value === 'custom') {
        return document.getElementById('input-jam-custom').value.trim();
    }
    return jamInput.value.trim();
}

function initSchedulesListener() {
    db.ref('schedules').on('value', snap => {
        schedulesCache = {};
        snap.forEach(child => {
            schedulesCache[child.key] = child.val();
        });
        renderScheduledSchedules();
        renderDashboardSummary();
        renderCalendar();
        renderScheduleAgenda();
        renderMembers();
    }, error => Swal.fire('Gagal Memuat Jadwal', error.message, 'error'));
}

function getUpcomingSchedules(includeScheduled = false) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Object.entries(schedulesCache).filter(([, schedule]) => {
        const date = parseScheduleDate(schedule.tanggal);
        return date && date >= today && (includeScheduled || schedule.visibility !== 'scheduled');
    }).sort(([, first], [, second]) =>
        `${first.tanggal} ${first.jam || ''}`.localeCompare(`${second.tanggal} ${second.jam || ''}`)
    );
}

function renderDashboardSummary() {
    const upcoming = getUpcomingSchedules(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visibleSchedules = upcoming.filter(([, schedule]) => {
        const publishDate = getSchedulePublishDate(schedule);
        return schedule.visibility !== 'scheduled' || schedule.manualPublished === true || (publishDate && publishDate <= today);
    });
    const waiting = upcoming.filter(([, schedule]) => schedule.visibility === 'scheduled' && schedule.manualPublished !== true &&
        (!getSchedulePublishDate(schedule) || getSchedulePublishDate(schedule) > today));
    const needsStaff = visibleSchedules.filter(([, schedule]) => {
        const limit = getScheduleMaxPetugas(schedule);
        return Object.keys(schedule.petugas || {}).length / limit < 0.5;
    });
    const full = visibleSchedules.filter(([, schedule]) =>
        Object.keys(schedule.petugas || {}).length >= getScheduleMaxPetugas(schedule)
    );
    document.getElementById('summary-upcoming').textContent = visibleSchedules.length;
    document.getElementById('summary-scheduled').textContent = waiting.length;
    document.getElementById('summary-needs-staff').textContent = needsStaff.length;
    document.getElementById('summary-full').textContent = full.length;
    document.getElementById('summary-needs-staff-details').innerHTML = needsStaff.length
        ? needsStaff.map(([, schedule]) => {
            const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parseScheduleDate(schedule.tanggal));
            const time = String(schedule.jam || '').replace(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s+/i, '');
            const assigned = Object.keys(schedule.petugas || {}).length;
            return `<span>${escapeHtml(weekday)} ${escapeHtml(time)} <small>${assigned}/${getScheduleMaxPetugas(schedule)} petugas</small></span>`;
        }).join('')
        : '<span>Semua jadwal sudah mencapai 50% kuota.</span>';
}

function refreshScheduleViews() {
    renderCalendar();
    renderScheduleAgenda();
}

function renderScheduleCard(id, data) {
    const limit = getScheduleMaxPetugas(data);
    const count = Object.keys(data.petugas || {}).length;
    const roster = Object.entries(data.petugas || {}).map(([assignmentId, name]) =>
        `<span class="roster-name">
            ${escapeHtml(name)}
            <button onclick="editPetugas('${id}','${assignmentId}')" class="btn-edit-petugas" aria-label="Edit ${escapeHtml(name)}" title="Edit nama">EDIT</button>
            <button onclick="removePetugas('${id}','${assignmentId}')" class="btn-remove-petugas" aria-label="Hapus ${escapeHtml(name)}" title="Hapus nama">×</button>
        </span>`
    ).join('');
    return `<article class="schedule-card">
        <div class="card-main">
            <span class="service-type ${data.kategori === 'Besar' ? 'large' : ''}">${escapeHtml(data.kategori || '')}</span>
            <h3 class="service-name">${escapeHtml(data.namaMisa || 'MISA')}</h3>
            <p class="service-date">${formatScheduleDate(data.tanggal)}</p>
            <p class="schedule-visibility">${escapeHtml(data.jam || '')} · ${data.visibility === 'scheduled' ? 'Penayangan terjadwal' : 'Tampil langsung'}</p>
        </div>
        <div class="time-block">${escapeHtml(data.jam || '')}</div>
        <div class="card-bottom">
            <div class="roster">
                <p class="roster-label">Petugas Terdaftar</p>
                <div class="roster-names">${roster || '<span class="roster-empty">Belum ada petugas</span>'}</div>
            </div>
            <div class="card-actions schedule-admin-actions">
                <span class="capacity ${count >= limit ? 'capacity-full' : ''}">${count}/${limit}</span>
                <button onclick="openDaftar('${id}','${escapeHtml(data.jam || '')}')" class="register-button" ${count >= limit ? 'disabled' : ''}>${count >= limit ? 'PENUH' : 'TAMBAH PETUGAS'}</button>
                <button onclick="editSchedule('${id}')" class="icon-button" aria-label="Edit info misa" title="Edit info misa">EDIT INFO</button>
                <button onclick="duplicateSchedule('${id}')" class="icon-button duplicate-button" aria-label="Duplikasi jadwal misa" title="Duplikasi jadwal">⧉</button>
                <button onclick="hapusSatuJadwal('${id}')" class="danger-button delete-schedule" aria-label="Hapus jadwal" title="Hapus jadwal">HAPUS</button>
            </div>
        </div>
    </article>`;
}

function togglePublishDaysField() {
    const visibility = document.getElementById('input-visibility').value;
    document.getElementById('publish-days-field').classList.toggle('hidden', visibility !== 'scheduled');
}

function parseScheduleDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if(!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1]) &&
        date.getMonth() === Number(match[2]) - 1 &&
        date.getDate() === Number(match[3]) ? date : null;
}

function getSchedulePublishDate(schedule) {
    const misaDate = parseScheduleDate(schedule.tanggal);
    if(!misaDate || schedule.visibility !== 'scheduled') return misaDate;

    const daysBefore = Number(schedule.publishDaysBefore);
    if(!Number.isInteger(daysBefore) || daysBefore < 1 || daysBefore > 365) return null;
    misaDate.setDate(misaDate.getDate() - daysBefore);
    return misaDate;
}

function getScheduleMaxPetugas(schedule) {
    const maxPetugas = Number(schedule.maxPetugas);
    return Number.isInteger(maxPetugas) && maxPetugas > 0
        ? maxPetugas
        : schedule.kategori === 'Besar' ? 6 : 4;
}

function formatScheduleDate(value) {
    const date = value instanceof Date ? value : parseScheduleDate(value);
    if(!date) return String(value || '');
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
}

function getScheduleConflicts(schedule, excludedId = '') {
    const normalizeTime = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
    return Object.entries(schedulesCache).filter(([id, existing]) =>
        id !== excludedId &&
        existing.tanggal === schedule.tanggal &&
        normalizeTime(existing.jam) === normalizeTime(schedule.jam)
    );
}

function confirmScheduleConflicts(schedule, excludedId = '') {
    const conflicts = getScheduleConflicts(schedule, excludedId);
    if(conflicts.length === 0) return Promise.resolve(true);
    const conflictList = conflicts.map(([, item]) =>
        `${escapeHtml(item.namaMisa || 'MISA')} (${escapeHtml(item.kategori || '')})`
    ).join('<br>');
    return Swal.fire({
        icon: 'warning',
        title: 'Jadwal Misa Bentrok',
        html: `Tanggal dan jam yang sama sudah dipakai oleh:<br><strong>${conflictList}</strong><br><br>Apakah Anda tetap ingin melanjutkan?`,
        showCancelButton: true,
        confirmButtonText: 'TETAP SIMPAN',
        cancelButtonText: 'PERIKSA LAGI',
        confirmButtonColor: '#d88a32',
        background: '#172740',
        color: '#eef4fa'
    }).then(result => result.isConfirmed);
}

function duplicateSchedule(scheduleId) {
    const schedule = schedulesCache[scheduleId];
    if(!schedule) return Swal.fire('Jadwal Tidak Ditemukan', 'Jadwal ini mungkin sudah dihapus.', 'warning');
    currentFilter = schedule.kategori === 'Besar' ? 'Besar' : 'Biasa';
    setFilter(currentFilter);
    return buatJadwal({ ...schedule, tanggal: '', petugas: {}, manualPublished: null });
}

function renderScheduledSchedules() {
    const list = document.getElementById('scheduled-schedule-list');
    const countLabel = document.getElementById('scheduled-count');
    if(!list || !countLabel) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const schedules = Object.entries(schedulesCache).filter(([, data]) => {
        const misaDate = parseScheduleDate(data.tanggal);
        return data.visibility === 'scheduled' && misaDate && misaDate >= today;
    }).sort(([, a], [, b]) => `${a.tanggal} ${a.jam || ''}`.localeCompare(`${b.tanggal} ${b.jam || ''}`));
    countLabel.textContent = schedules.length;
    list.innerHTML = schedules.map(([id, data]) => {
        const publishDate = getSchedulePublishDate(data);
        const isManual = data.manualPublished === true;
        const isAutomatic = publishDate && publishDate <= today;
        const status = isManual ? 'Ditampilkan lebih awal secara manual' :
            isAutomatic ? 'Sudah tayang sesuai jadwal otomatis' :
                `Mulai tayang ${publishDate ? formatScheduleDate(getLocalDateKey(publishDate)) : '—'}`;
        const assignedCount = Object.keys(data.petugas || {}).length;
        const limit = getScheduleMaxPetugas(data);
        const action = isManual
            ? `<button onclick="setManualScheduleVisibility('${id}', false)" class="secondary-button">KEMBALIKAN KE JADWAL H-</button>`
            : isAutomatic ? '<button class="secondary-button" disabled>SUDAH TAYANG</button>' :
                `<button onclick="setManualScheduleVisibility('${id}', true)" class="primary-button">TAMPILKAN SEKARANG</button>`;
        return `<article class="schedule-card">
            <div class="card-main">
                <span class="service-type ${data.kategori === 'Besar' ? 'large' : ''}">${escapeHtml(data.kategori || '')}</span>
                <h3 class="service-name">${escapeHtml(data.namaMisa || 'MISA')}</h3>
                <p class="service-date">${formatScheduleDate(data.tanggal)} · ${escapeHtml(data.jam || '')}</p>
                <p class="schedule-visibility">${escapeHtml(status)}</p>
            </div>
            <div class="scheduled-actions">
                <span class="capacity ${assignedCount >= limit ? 'capacity-full' : ''}">${assignedCount}/${limit} PETUGAS</span>
                ${action}
                <button onclick="editSchedule('${id}')" class="icon-button">EDIT INFO</button>
                <button onclick="duplicateSchedule('${id}')" class="icon-button duplicate-button" aria-label="Duplikasi jadwal misa" title="Duplikasi jadwal">⧉</button>
                <button onclick="hapusSatuJadwal('${id}')" class="danger-button delete-schedule">HAPUS</button>
            </div>
        </article>`;
    }).join('') || '<p class="empty-state">Belum ada misa yang dijadwalkan untuk tayang nanti.</p>';
}

function renderCalendar() {
    const calendar = document.getElementById('schedule-calendar');
    if(!calendar) return;
    const schedules = getUpcomingSchedules().filter(([, schedule]) => schedule.kategori === currentFilter);
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const offset = (monthStart.getDay() + 6) % 7;
    const monthLength = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const eventCounts = schedules.reduce((counts, [, schedule]) => {
        counts[schedule.tanggal] = (counts[schedule.tanggal] || 0) + 1;
        return counts;
    }, {});
    const dayCells = Array.from({ length: 42 }, (_, index) => {
        const dayNumber = index - offset + 1;
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNumber);
        const dateKey = getLocalDateKey(date);
        const inMonth = dayNumber >= 1 && dayNumber <= monthLength;
        const eventCount = eventCounts[dateKey] || 0;
        return `<button class="calendar-day ${inMonth ? '' : 'outside-month'} ${selectedCalendarDate === dateKey ? 'selected-day' : ''} ${eventCount ? 'has-events' : ''}" onclick="selectCalendarDate('${dateKey}')"><span>${date.getDate()}</span>${eventCount ? `<small>${eventCount} misa</small>` : ''}</button>`;
    }).join('');
    calendar.innerHTML = `<div class="calendar-heading">
            <button onclick="changeCalendarMonth(-1)" class="secondary-button" aria-label="Bulan sebelumnya">‹</button>
            <h2>${calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h2>
            <button onclick="changeCalendarMonth(1)" class="secondary-button" aria-label="Bulan berikutnya">›</button>
        </div>
        <div class="calendar-grid calendar-weekdays">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="calendar-grid">${dayCells}</div>`;
}

function renderScheduleAgenda() {
    const list = document.getElementById('schedule-agenda-list');
    const title = document.getElementById('agenda-title');
    const description = document.getElementById('agenda-description');
    const showAllButton = document.getElementById('agenda-show-all');
    if(!list || !title || !description || !showAllButton) return;

    const schedules = getUpcomingSchedules().filter(([, schedule]) =>
        schedule.kategori === currentFilter &&
        (!selectedCalendarDate || schedule.tanggal === selectedCalendarDate)
    );
    if(selectedCalendarDate) {
        title.textContent = `Misa ${formatScheduleDate(selectedCalendarDate)}`;
        description.textContent = 'Kelola petugas dan informasi misa pada tanggal ini.';
        showAllButton.classList.remove('hidden');
    } else {
        title.textContent = 'Daftar misa mendatang';
        description.textContent = 'Pilih misa di bawah untuk menambah petugas, mengedit, atau mengelola jadwal.';
        showAllButton.classList.add('hidden');
    }
    list.innerHTML = schedules.map(([id, schedule]) => renderScheduleCard(id, schedule)).join('') ||
        `<p class="empty-state">${selectedCalendarDate ? 'Tidak ada misa untuk jenis ini pada tanggal yang dipilih.' : 'Belum ada misa mendatang untuk jenis ini.'}</p>`;
}

function showAllUpcomingSchedules() {
    selectedCalendarDate = null;
    renderCalendar();
    renderScheduleAgenda();
}

function changeCalendarMonth(offset) {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    renderCalendar();
}

function selectCalendarDate(date) {
    selectedCalendarDate = date;
    const selectedMonth = parseScheduleDate(date);
    calendarMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    renderCalendar();
    renderScheduleAgenda();
    document.querySelector('.schedule-agenda').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setManualScheduleVisibility(scheduleId, isVisible) {
    const update = isVisible ? true : null;
    const message = isVisible
        ? 'Jadwal ini akan langsung terlihat di halaman utama.'
        : 'Jadwal kembali mengikuti tanggal tayang H- yang ditentukan.';
    return db.ref(`schedules/${scheduleId}/manualPublished`).set(update)
        .then(() => Swal.fire(isVisible ? 'Jadwal Ditampilkan' : 'Penayangan Diatur Ulang', message, 'success'))
        .catch(error => Swal.fire('Gagal Memperbarui Penayangan', error.message, 'error'));
}

function buatJadwal(prefill = {}) {
    const category = prefill.kategori || currentFilter;
    const initialVisibility = prefill.visibility === 'scheduled' ? 'scheduled' : 'immediate';
    return Swal.fire({
        title: 'Tambah Jadwal Misa',
        html: `
            <div class="schedule-edit-form schedule-create-form">
                <label for="input-tgl">Tanggal misa</label>
                <input type="date" id="input-tgl" value="${escapeHtml(prefill.tanggal || '')}" class="admin-input">
                <label for="input-jam">Jam misa</label>
                <div id="container-jam"></div>
                <label for="input-nama-misa">Nama misa</label>
                <input type="text" id="input-nama-misa" value="${escapeHtml(prefill.namaMisa || '')}" placeholder="Contoh: Misa Minggu" class="admin-input">
                <label for="input-max-petugas">Maksimal petugas (orang)</label>
                <input type="number" id="input-max-petugas" min="1" step="1" value="${getScheduleMaxPetugas({ kategori: category, maxPetugas: prefill.maxPetugas })}" class="admin-input">
                <label for="input-visibility">Penayangan jadwal</label>
                <select id="input-visibility" class="admin-select">
                    <option value="immediate" ${initialVisibility === 'immediate' ? 'selected' : ''}>Langsung tampil</option>
                    <option value="scheduled" ${initialVisibility === 'scheduled' ? 'selected' : ''}>Jadwalkan untuk nanti</option>
                </select>
                <div id="publish-days-field" class="${initialVisibility === 'scheduled' ? '' : 'hidden'}">
                    <label for="input-publish-days">Tampilkan H-berapa?</label>
                    <input type="number" id="input-publish-days" min="1" max="365" step="1" value="${Number(prefill.publishDaysBefore) || 6}" class="admin-input">
                </div>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'PUBLISH',
        cancelButtonText: 'BATAL',
        confirmButtonColor: '#29c7d9',
        background: '#172740',
        color: '#eef4fa',
        didOpen: () => {
            renderJamInput(category, prefill.jam || '');
            document.getElementById('input-visibility').addEventListener('change', togglePublishDaysField);
            const timeInput = document.getElementById('input-jam');
            timeInput.addEventListener('change', () => {
                if(timeInput.value === 'custom') document.getElementById('input-jam-custom').focus();
            });
            document.getElementById('input-nama-misa').focus();
        },
        preConfirm: () => {
            const tanggal = document.getElementById('input-tgl').value;
            const jam = getJamInput();
            const namaMisa = document.getElementById('input-nama-misa').value.trim() || 'MISA';
            const maxPetugas = Number(document.getElementById('input-max-petugas').value);
            const visibility = document.getElementById('input-visibility').value;
            const publishDaysBefore = Number(document.getElementById('input-publish-days').value);

            if(!parseScheduleDate(tanggal) || !jam) {
                Swal.showValidationMessage('Lengkapi tanggal dan jam misa.');
                return false;
            }
            if(!Number.isInteger(maxPetugas) || maxPetugas < 1) {
                Swal.showValidationMessage('Maksimal petugas harus berupa angka minimal 1.');
                return false;
            }
            if(!['immediate', 'scheduled'].includes(visibility)) {
                Swal.showValidationMessage('Pilih cara penayangan jadwal.');
                return false;
            }
            if(visibility === 'scheduled' &&
                (!Number.isInteger(publishDaysBefore) || publishDaysBefore < 1 || publishDaysBefore > 365)) {
                Swal.showValidationMessage('Isi H- dengan angka antara 1 sampai 365 hari.');
                return false;
            }

            const schedule = {
                tanggal,
                jam,
                namaMisa,
                kategori: category,
                maxPetugas,
                visibility,
                petugas: {}
            };
            if(visibility === 'scheduled') schedule.publishDaysBefore = publishDaysBefore;
            return schedule;
        }
    }).then(result => {
        if(!result.isConfirmed) return;
        return confirmScheduleConflicts(result.value).then(confirmed => {
            if(!confirmed) return;
            return db.ref('schedules').push(result.value)
                .then(() => Swal.fire('Jadwal Disimpan', 'Jadwal misa berhasil dibuat.', 'success'))
                .catch(error => Swal.fire('Gagal', error.message, 'error'));
        });
    });
}

function editSchedule(scheduleId) {
    const scheduleRef = db.ref(`schedules/${scheduleId}`);
    return scheduleRef.once('value').then(snapshot => {
        const schedule = snapshot.val();
        if(!schedule) {
            return Swal.fire('Jadwal Tidak Ditemukan', 'Jadwal ini mungkin sudah dihapus.', 'warning');
        }

        const currentLimit = getScheduleMaxPetugas(schedule);
        const visibility = schedule.visibility === 'scheduled' ? 'scheduled' : 'immediate';
        const publishDaysBefore = Number.isInteger(Number(schedule.publishDaysBefore)) &&
            Number(schedule.publishDaysBefore) >= 1 &&
            Number(schedule.publishDaysBefore) <= 365
            ? Number(schedule.publishDaysBefore)
            : 6;

        return Swal.fire({
            title: 'Edit Info Misa',
            html: `
                <div class="schedule-edit-form">
                    <label for="edit-schedule-name">Nama misa</label>
                    <input id="edit-schedule-name" class="admin-input" type="text" value="${escapeHtml(schedule.namaMisa || '')}">
                    <label for="edit-schedule-date">Tanggal misa</label>
                    <input id="edit-schedule-date" class="admin-input" type="date" value="${escapeHtml(schedule.tanggal || '')}">
                    <label for="edit-schedule-category">Jenis misa</label>
                    <select id="edit-schedule-category" class="admin-select">
                        <option value="Biasa" ${schedule.kategori === 'Biasa' ? 'selected' : ''}>Misa Biasa</option>
                        <option value="Besar" ${schedule.kategori === 'Besar' ? 'selected' : ''}>Misa Besar</option>
                    </select>
                    <label for="edit-schedule-limit">Maksimal petugas (orang)</label>
                    <input id="edit-schedule-limit" class="admin-input" type="number" min="1" step="1" value="${currentLimit}">
                    <label for="edit-schedule-visibility">Penayangan jadwal</label>
                    <select id="edit-schedule-visibility" class="admin-select">
                        <option value="immediate" ${visibility === 'immediate' ? 'selected' : ''}>Langsung tampil</option>
                        <option value="scheduled" ${visibility === 'scheduled' ? 'selected' : ''}>Jadwalkan untuk nanti</option>
                    </select>
                    <div id="edit-publish-days-field" class="${visibility === 'scheduled' ? '' : 'hidden'}">
                        <label for="edit-schedule-publish-days">Tampilkan H-berapa?</label>
                        <input id="edit-schedule-publish-days" class="admin-input" type="number" min="1" max="365" step="1" value="${publishDaysBefore}">
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'SIMPAN',
            cancelButtonText: 'BATAL',
            confirmButtonColor: '#29c7d9',
            background: '#172740',
            color: '#eef4fa',
            didOpen: () => {
                const visibilityInput = document.getElementById('edit-schedule-visibility');
                const publishDaysField = document.getElementById('edit-publish-days-field');
                visibilityInput.addEventListener('change', () => {
                    publishDaysField.classList.toggle('hidden', visibilityInput.value !== 'scheduled');
                });
            },
            preConfirm: () => {
                const namaMisa = document.getElementById('edit-schedule-name').value.trim();
                const tanggal = document.getElementById('edit-schedule-date').value;
                const kategori = document.getElementById('edit-schedule-category').value;
                const maxPetugas = Number(document.getElementById('edit-schedule-limit').value);
                const visibility = document.getElementById('edit-schedule-visibility').value;
                const publishDaysBefore = Number(document.getElementById('edit-schedule-publish-days').value);
                if(!namaMisa) {
                    Swal.showValidationMessage('Nama misa tidak boleh kosong.');
                    return false;
                }
                if(!parseScheduleDate(tanggal)) {
                    Swal.showValidationMessage('Pilih tanggal misa.');
                    return false;
                }
                if(!['Biasa', 'Besar'].includes(kategori)) {
                    Swal.showValidationMessage('Pilih jenis misa yang valid.');
                    return false;
                }
                if(!Number.isInteger(maxPetugas) || maxPetugas < 1) {
                    Swal.showValidationMessage('Maksimal petugas harus berupa angka minimal 1.');
                    return false;
                }
                if(!['immediate', 'scheduled'].includes(visibility)) {
                    Swal.showValidationMessage('Pilih cara penayangan jadwal.');
                    return false;
                }
                if(visibility === 'scheduled' &&
                    (!Number.isInteger(publishDaysBefore) || publishDaysBefore < 1 || publishDaysBefore > 365)) {
                    Swal.showValidationMessage('Isi H- dengan angka antara 1 sampai 365 hari.');
                    return false;
                }
                return {
                    namaMisa,
                    tanggal,
                    kategori,
                    maxPetugas,
                    visibility,
                    publishDaysBefore: visibility === 'scheduled' ? publishDaysBefore : null,
                    manualPublished: visibility === 'scheduled' ? schedule.manualPublished === true : null
                };
            }
        }).then(result => {
            if(!result.isConfirmed) return;
            return confirmScheduleConflicts({ ...schedule, ...result.value }, scheduleId).then(confirmed => {
                if(!confirmed) return;
                const assignedCount = Object.keys(schedule.petugas || {}).length;
                if(assignedCount > result.value.maxPetugas) {
                    return Swal.fire({
                        icon: 'warning',
                        title: 'Batas Petugas Lebih Kecil',
                        text: `Saat ini ada ${assignedCount} petugas, melebihi batas baru ${result.value.maxPetugas}. Jadwal tetap dapat diedit, tetapi pendaftaran baru akan ditutup sampai jumlahnya sesuai.`,
                        showCancelButton: true,
                        confirmButtonText: 'TETAP SIMPAN',
                        cancelButtonText: 'BATAL',
                        confirmButtonColor: '#d88a32',
                        background: '#172740',
                        color: '#eef4fa'
                    }).then(capacityResult => {
                        if(!capacityResult.isConfirmed) return;
                        return scheduleRef.update(result.value)
                            .then(() => Swal.fire('Info Misa Diperbarui', 'Jadwal dan daftar petugas tetap tersimpan.', 'success'));
                    });
                }
                return scheduleRef.update(result.value)
                    .then(() => Swal.fire('Info Misa Diperbarui', 'Jadwal dan daftar petugas tetap tersimpan.', 'success'));
            });
        });
    }).catch(error => Swal.fire('Gagal', error.message, 'error'));
}

function initMembersListener() {
    db.ref('members').on('value', snap => {
        membersCache = {};
        snap.forEach(child => {
            membersCache[child.key] = child.val().name;
        });
        renderMembers();
    }, error => Swal.fire('Gagal Memuat Anggota', error.message, 'error'));
}

function renderMembers() {
    const grid = document.getElementById('members-grid');
    const select = document.getElementById('select-member');
    if(!grid || !select) return;
    grid.innerHTML = '';
    select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    Object.entries(membersCache).forEach(([id, name]) => {
        const safeName = escapeHtml(name);
        const assignmentCount = getUpcomingSchedules(true).reduce((total, [, schedule]) =>
            total + Object.values(schedule.petugas || {}).filter(assignedName =>
                String(assignedName).trim().toLocaleLowerCase('id-ID') === String(name).trim().toLocaleLowerCase('id-ID')
            ).length, 0
        );
        grid.innerHTML += `<article class="member-card">
            <div class="member-info"><p class="member-name">${safeName}</p><span class="member-assignment-count">${assignmentCount} jadwal mendatang</span></div>
            <div class="member-actions">
                <button onclick="editMember('${id}')" class="icon-button" aria-label="Edit nama ${safeName}" title="Edit nama">EDIT</button>
                <button onclick="deleteMember('${id}')" class="danger-button icon-button" aria-label="Hapus ${safeName}" title="Hapus anggota">HAPUS</button>
            </div>
        </article>`;
        select.innerHTML += `<option value="${safeName}">${safeName}</option>`;
    });
    if(Object.keys(membersCache).length === 0) {
        grid.innerHTML = '<p class="member-empty">Belum ada anggota. Tambahkan nama untuk mulai.</p>';
    }
}

function deleteMember(id) {
    const name = membersCache[id];
    if(!name) return;
    const assignments = Object.values(schedulesCache).reduce((total, schedule) =>
        total + Object.values(schedule.petugas || {}).filter(assignedName =>
            String(assignedName).trim().toLocaleLowerCase('id-ID') === String(name).trim().toLocaleLowerCase('id-ID')
        ).length, 0
    );
    const warning = assignments
        ? `Nama ini masih tercatat sebagai petugas pada ${assignments} jadwal. Menghapus anggota hanya menghapusnya dari daftar pilihan; catatan petugas yang sudah ada tetap tersimpan.`
        : 'Nama ini akan dihapus dari daftar pilihan anggota.';
    return Swal.fire({
        icon: 'warning',
        title: `Hapus ${escapeHtml(name)}?`,
        text: warning,
        showCancelButton: true,
        confirmButtonText: 'HAPUS ANGGOTA',
        cancelButtonText: 'BATAL',
        confirmButtonColor: '#d33',
        background: '#172740',
        color: '#eef4fa'
    }).then(result => {
        if(!result.isConfirmed) return;
        return db.ref(`members/${id}`).remove()
            .then(() => Swal.fire('Anggota Dihapus', 'Daftar petugas pada jadwal yang sudah ada tetap dipertahankan.', 'success'))
            .catch(error => Swal.fire('Gagal Menghapus Anggota', error.message, 'error'));
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function addMember() {
    const input = document.getElementById('member-name');
    const name = input.value.trim();
    if(!name) return;
    const duplicate = Object.values(membersCache).some(existingName => existingName.trim().toLowerCase() === name.toLowerCase());
    if(duplicate) return Swal.fire('Nama Sudah Ada', 'Gunakan nama yang berbeda untuk setiap anggota.', 'info');
    db.ref('members').push({ name }).then(() => { input.value = ""; });
}

function editMember(id) {
    const currentName = membersCache[id];
    if(!currentName) return;

    Swal.fire({
        title: 'Edit Nama Anggota',
        input: 'text',
        inputValue: currentName,
        showCancelButton: true,
        confirmButtonText: 'SIMPAN',
        cancelButtonText: 'BATAL',
        confirmButtonColor: '#29c7d9',
        background: '#172740',
        color: '#eef4fa',
        inputValidator: value => {
            const name = value.trim();
            if(!name) return 'Nama tidak boleh kosong.';
            const duplicate = Object.entries(membersCache).some(([memberId, existingName]) =>
                memberId !== id && existingName.trim().toLowerCase() === name.toLowerCase()
            );
            if(duplicate) return 'Nama tersebut sudah digunakan.';
        }
    }).then(result => {
        if(!result.isConfirmed) return;
        const newName = result.value.trim();
        if(newName === currentName) return;

        db.ref('schedules').once('value').then(snap => {
            const updates = { [`members/${id}/name`]: newName };
            snap.forEach(schedule => {
                schedule.child('petugas').forEach(assignment => {
                    const assignedName = assignment.val();
                    if(typeof assignedName === 'string' && assignedName.trim().toLowerCase() === currentName.trim().toLowerCase()) {
                        updates[`schedules/${schedule.key}/petugas/${assignment.key}`] = newName;
                    }
                });
            });
            return db.ref().update(updates);
        }).then(() => Swal.fire('Nama Diperbarui', 'Nama anggota dan daftar petugas terkait sudah diperbarui.', 'success'))
          .catch(error => Swal.fire('Gagal', error.message, 'error'));
    });
}

function openDaftar(id, jam) { selectedScheduleId = id; document.getElementById('modal-info').innerText = jam; document.getElementById('modal-daftar').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-daftar').classList.add('hidden'); }

function editPetugas(scheduleId, assignmentId) {
    const assignmentRef = db.ref(`schedules/${scheduleId}/petugas/${assignmentId}`);
    assignmentRef.once('value').then(snapshot => {
        const currentName = snapshot.val();
        if(typeof currentName !== 'string') return;

        return Swal.fire({
            title: 'Edit Nama Petugas',
            input: 'text',
            inputValue: currentName,
            showCancelButton: true,
            confirmButtonText: 'SIMPAN',
            cancelButtonText: 'BATAL',
            confirmButtonColor: '#29c7d9',
            background: '#172740',
            color: '#eef4fa',
            inputValidator: value => {
                if(!value.trim()) return 'Nama tidak boleh kosong.';
            }
        }).then(result => {
            if(!result.isConfirmed) return;
            const newName = result.value.trim();
            return db.ref(`schedules/${scheduleId}/petugas`).transaction(assignments => {
                const currentAssignments = assignments || {};
                const duplicate = Object.entries(currentAssignments).some(([key, assignedName]) =>
                    key !== assignmentId && String(assignedName).trim().toLowerCase() === newName.toLowerCase()
                );
                if(duplicate) return;
                currentAssignments[assignmentId] = newName;
                return currentAssignments;
            }).then(transaction => {
                if(!transaction.committed) {
                    return Swal.fire('Nama Sudah Terdaftar', 'Nama ini sudah ada di jadwal tersebut.', 'info');
                }
            });
        });
    }).catch(error => Swal.fire('Gagal', error.message, 'error'));
}

document.addEventListener('click', e => {
    if(e.target.id === 'confirm-daftar') {
        const name = document.getElementById('select-member').value.trim();
        if(!name || !selectedScheduleId) return;

        const scheduleRef = db.ref(`schedules/${selectedScheduleId}`);
        const assignmentKey = scheduleRef.child('petugas').push().key;
        scheduleRef.transaction(schedule => {
            if(!schedule) return;

            const currentAssignments = schedule.petugas || {};
            const normalizedName = name.toLowerCase();
            const alreadyAssigned = Object.values(currentAssignments).some(assignedName =>
                String(assignedName).trim().toLowerCase() === normalizedName
            );

            const defaultLimit = schedule.kategori === 'Besar' ? 6 : 4;
            const maxPetugas = Number.isInteger(Number(schedule.maxPetugas)) && Number(schedule.maxPetugas) > 0
                ? Number(schedule.maxPetugas)
                : defaultLimit;
            if(alreadyAssigned || Object.keys(currentAssignments).length >= maxPetugas) return;

            schedule.petugas = { ...currentAssignments, [assignmentKey]: name };
            return schedule;
        }).then(result => {
            if(result.committed) {
                closeModal();
            } else if(!result.snapshot.exists()) {
                Swal.fire('Jadwal Tidak Ditemukan', 'Jadwal ini mungkin sudah dihapus.', 'warning');
            } else {
                const schedule = result.snapshot.val();
                const assignments = schedule.petugas || {};
                const defaultLimit = schedule.kategori === 'Besar' ? 6 : 4;
                const maxPetugas = Number.isInteger(Number(schedule.maxPetugas)) && Number(schedule.maxPetugas) > 0
                    ? Number(schedule.maxPetugas)
                    : defaultLimit;
                if(Object.keys(assignments).length >= maxPetugas) {
                    Swal.fire('Jadwal Penuh', 'Jumlah maksimal petugas untuk jadwal ini sudah terpenuhi.', 'info');
                } else {
                    Swal.fire('Nama Sudah Terdaftar', 'Nama ini sudah ada di jadwal tersebut.', 'info');
                }
            }
        }).catch(error => Swal.fire('Gagal', error.message, 'error'));
    }
});

function removePetugas(scheduleId, assignmentId) {
    const name = schedulesCache[scheduleId]?.petugas?.[assignmentId] || 'petugas';
    return Swal.fire({
        title: `Hapus ${escapeHtml(name)} dari misa?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'HAPUS PETUGAS',
        cancelButtonText: 'BATAL',
        confirmButtonColor: '#d33',
        background: '#172740',
        color: '#eef4fa'
    }).then(result => {
        if(!result.isConfirmed) return;
        return db.ref(`schedules/${scheduleId}/petugas/${assignmentId}`).remove()
            .catch(error => Swal.fire('Gagal Menghapus Petugas', error.message, 'error'));
    });
}

function hapusSatuJadwal(id) {
    const schedule = schedulesCache[id];
    if(!schedule) return Swal.fire('Jadwal Tidak Ditemukan', 'Jadwal ini mungkin sudah dihapus.', 'warning');
    const assignmentCount = Object.keys(schedule.petugas || {}).length;
    return Swal.fire({
        title: `Hapus ${escapeHtml(schedule.namaMisa || 'MISA')}?`,
        html: `${formatScheduleDate(schedule.tanggal)} · ${escapeHtml(schedule.jam || '')}<br>${assignmentCount ? `Perhatian: ${assignmentCount} nama petugas juga terhubung dengan jadwal ini.` : 'Jadwal ini belum memiliki petugas.'}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'HAPUS JADWAL',
        cancelButtonText: 'BATAL',
        confirmButtonColor: '#d33',
        background: '#172740',
        color: '#eef4fa'
    }).then(result => {
        if(!result.isConfirmed) return;
        return db.ref(`schedules/${id}`).remove()
            .then(() => Swal.fire('Jadwal Dihapus', 'Jadwal misa berhasil dihapus.', 'success'))
            .catch(error => Swal.fire('Gagal Menghapus Jadwal', error.message, 'error'));
    });
}

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(x => x.classList.add('hidden'));
    document.getElementById(`tab-${t}`).classList.remove('hidden');
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(button => button.classList.remove('active-tab'));
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
