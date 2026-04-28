// ============================================================
// admin.js  —  Supabase 연동 버전
// ============================================================

let currentAdminMonth = new Date().getMonth() + 1;
let currentAdminYear  = new Date().getFullYear();
let calendarYear  = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-indexed

// ============================================================
// 모바일 사이드바
// ============================================================
function toggleSidebar() {
    document.querySelector('.admin-sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
    document.querySelector('.admin-sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ============================================================
// 페이지 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.includes('admin-login.html')) {
        if (sessionStorage.getItem('adminLoggedIn') === 'true') {
            window.location.href = 'admin.html';
        }
    }
    if (window.location.pathname.includes('admin.html')) {
        if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
            window.location.href = 'admin-login.html';
            return;
        }
        initializeAdminDashboard();
    }
});

// ============================================================
// 로그인 / 로그아웃
// ============================================================
function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        window.location.href = 'admin.html';
    } else {
        alert('비밀번호가 일치하지 않습니다.');
    }
}

function goBack()      { window.location.href = 'index.html'; }
function logoutAdmin() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'index.html';
}

// ============================================================
// 대시보드 초기화
// ============================================================
async function initializeAdminDashboard() {
    updateAdminMonthDisplay();
    showSection('dashboard');
    await Promise.all([
        loadDashboardStats(),
        loadTeachersList(),
        loadPayrollSummary(),
        loadLogs(),
        loadHolidays()
    ]);
}

// ============================================================
// 섹션 전환
// ============================================================
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    document.getElementById(sectionName + 'Section').classList.add('active');
    if (event && event.target) {
        const link = event.target.closest('a');
        if (link) link.classList.add('active');
    }
    const titles = {
        dashboard: '관리자 대시보드', teachers: '선생님 관리',
        payroll: '급여 계산', logs: '출석 로그', holidays: '휴원일 설정'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionName] || '';
    closeSidebar();
}

// ============================================================
// 대시보드 통계
// ============================================================
async function loadDashboardStats() {
    const now = new Date();
    const monthRange = DateUtils.getMonthRange(now.getFullYear(), now.getMonth() + 1);

    const [teachersRes, logsRes, holidaysRes] = await Promise.all([
        db.from('teachers').select('*'),
        db.from('work_logs').select('*')
          .gte('work_date', monthRange.start)
          .lte('work_date', monthRange.end),
        db.from('holidays').select('date')
          .gte('date', monthRange.start)
          .lte('date', monthRange.end)
    ]);

    const teachers = teachersRes.data || [];
    const workLogs = logsRes.data     || [];
    const holidays = holidaysRes.data || [];
    const hdSet    = new Set(holidays.map(h => h.date));

    document.getElementById('totalTeachers').textContent = teachers.length + '명';

    // 이번 달 평일 수
    let workDays = 0;
    const [sy, sm, sd] = monthRange.start.split('-').map(Number);
    const [ey, em, ed] = monthRange.end.split('-').map(Number);
    for (let d = new Date(sy,sm-1,sd); d <= new Date(ey,em-1,ed); d.setDate(d.getDate()+1)) {
        const ds = DateUtils.toLocalDateStr(d);
        if (DateUtils.isWeekday(ds) && !hdSet.has(ds)) workDays++;
    }
    document.getElementById('totalWorkDays').textContent = workDays + '일';

    // 선생님별 급여 합계
    let totalSalary = 0;
    const summaryRows = teachers.map(t => {
        const logs = workLogs.filter(l => l.teacher_id === t.id);
        let mins = 0, days = 0;
        logs.forEach(l => {
            if (l.check_in_time && l.arrival_time && l.work_type !== 'holiday') {
                const adj = PayrollCalculator.adjustCheckInTime(l.check_in_time, l.first_bus_time);
                mins += PayrollCalculator.calculateWorkMinutes(adj, l.arrival_time);
                days++;
            }
        });
        const salary = PayrollCalculator.calculateSalary(mins, t.hourly_rate);
        totalSalary += salary;
        return { name: t.name, days, mins, salary };
    });

    document.getElementById('totalSalary').textContent = totalSalary.toLocaleString() + '원';

    const tbody = document.getElementById('dashboardSummaryBody');
    if (tbody) {
        tbody.innerHTML = summaryRows.length === 0
            ? '<tr><td colspan="4" style="text-align:center;padding:20px;color:#999;">등록된 선생님이 없습니다.</td></tr>'
            : summaryRows.map(r => `
                <tr>
                    <td>${r.name}</td>
                    <td>${r.days}일</td>
                    <td>${DateUtils.minsToHHMM(r.mins)}</td>
                    <td>${r.salary.toLocaleString()}원</td>
                </tr>`).join('');
    }
}

// ============================================================
// 선생님 관리
// ============================================================
async function loadTeachersList() {
    const tbody = document.getElementById('teachersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">불러오는 중...</td></tr>';

    const { data: teachers, error } = await db
        .from('teachers').select('*').order('name');

    if (error || !teachers?.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">등록된 선생님이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.phone || '-'}</td>
            <td>${t.start_date}</td>
            <td>${(t.hourly_rate || 0).toLocaleString()}원</td>
            <td>
                <button onclick="showEditTeacherModal('${t.id}')" class="btn-secondary"
                        style="padding:6px 12px;font-size:0.8rem;">
                    <span class="material-symbols-outlined" style="font-size:1rem;">edit</span>
                </button>
                <button onclick="deleteTeacher('${t.id}')" class="btn-secondary"
                        style="padding:6px 12px;font-size:0.8rem;margin-left:5px;">
                    <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
                </button>
            </td>
        </tr>`).join('');
}

function showAddTeacherModal() {
    document.getElementById('addTeacherForm').reset();
    document.getElementById('addTeacherModal').classList.add('show');
}

async function addTeacher(event) {
    event.preventDefault();
    const payload = {
        name:        document.getElementById('teacherName').value.trim(),
        phone:       document.getElementById('teacherPhone').value.trim() || null,
        start_date:  document.getElementById('startDate').value,
        hourly_rate: parseInt(document.getElementById('hourlyRate').value),
        created_at:  new Date().toISOString()
    };

    const { error } = await db.from('teachers').insert(payload);
    if (error) { alert('저장에 실패했습니다: ' + error.message); return; }

    closeModal('addTeacherModal');
    await loadTeachersList();
    await loadDashboardStats();
    alert('선생님이 추가되었습니다.');
}

async function showEditTeacherModal(teacherId) {
    const { data: t, error } = await db
        .from('teachers').select('*').eq('id', teacherId).single();
    if (error || !t) { alert('선생님 정보를 불러올 수 없습니다.'); return; }

    document.getElementById('editTeacherId').value    = t.id;
    document.getElementById('editTeacherName').value  = t.name || '';
    document.getElementById('editTeacherPhone').value = t.phone || '';
    document.getElementById('editStartDate').value    = t.start_date || '';
    document.getElementById('editHourlyRate').value   = t.hourly_rate || '';
    document.getElementById('editTeacherModal').classList.add('show');
}

async function saveEditTeacher(event) {
    event.preventDefault();
    const id         = document.getElementById('editTeacherId').value;
    const name       = document.getElementById('editTeacherName').value.trim();
    const phone      = document.getElementById('editTeacherPhone').value.trim() || null;
    const start_date = document.getElementById('editStartDate').value;
    const hourly_rate = parseInt(document.getElementById('editHourlyRate').value);

    if (!name || !start_date || isNaN(hourly_rate)) {
        alert('모든 필수 항목을 입력해주세요.'); return;
    }

    const { error } = await db.from('teachers')
        .update({ name, phone, start_date, hourly_rate })
        .eq('id', id);

    if (error) { alert('수정에 실패했습니다: ' + error.message); return; }

    closeModal('editTeacherModal');
    await loadTeachersList();
    await loadDashboardStats();
    alert('선생님 정보가 수정되었습니다.');
}

async function deleteTeacher(teacherId) {
    if (!confirm('정말로 이 선생님을 삭제하시겠습니까?\n(근무 데이터는 유지됩니다)')) return;

    const { error } = await db.from('teachers').delete().eq('id', teacherId);
    if (error) { alert('삭제에 실패했습니다: ' + error.message); return; }

    await loadTeachersList();
    await loadDashboardStats();
    alert('선생님이 삭제되었습니다.');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ============================================================
// 급여 계산
// ============================================================
function changeAdminMonth(direction) {
    currentAdminMonth += direction;
    if (currentAdminMonth > 12) { currentAdminMonth = 1; currentAdminYear++; }
    else if (currentAdminMonth < 1) { currentAdminMonth = 12; currentAdminYear--; }
    updateAdminMonthDisplay();
    loadPayrollSummary();
}

function updateAdminMonthDisplay() {
    document.getElementById('adminCurrentMonth').textContent =
        `${currentAdminYear}년 ${currentAdminMonth}월`;
}

async function loadPayrollSummary() {
    const monthRange = DateUtils.getMonthRange(currentAdminYear, currentAdminMonth);

    const [teachersRes, logsRes] = await Promise.all([
        db.from('teachers').select('*').order('name'),
        db.from('work_logs').select('*')
          .gte('work_date', monthRange.start)
          .lte('work_date', monthRange.end)
    ]);

    const teachers = teachersRes.data || [];
    const workLogs = logsRes.data     || [];

    if (!teachers.length) {
        document.getElementById('payrollSummary').innerHTML =
            '<p style="color:#aaa;text-align:center;padding:40px;">등록된 선생님이 없습니다.</p>';
        return;
    }

    let html = '<div class="payroll-grid">';
    teachers.forEach(t => {
        const logs = workLogs.filter(l => l.teacher_id === t.id && l.work_type !== 'holiday');
        let mins = 0, days = 0;
        const details = logs.map(l => {
            if (!l.check_in_time || !l.arrival_time) return null;
            const adj  = PayrollCalculator.adjustCheckInTime(l.check_in_time, l.first_bus_time);
            const wm   = PayrollCalculator.calculateWorkMinutes(adj, l.arrival_time);
            mins += wm; days++;
            return { date: l.work_date, checkIn: l.check_in_time, adj, arrival: l.arrival_time, wm };
        }).filter(Boolean);

        const salary = PayrollCalculator.calculateSalary(mins, t.hourly_rate);

        // 상세 테이블
        const detailRows = details.map(r => `
            <tr>
                <td>${r.date}</td>
                <td>${r.checkIn}</td>
                <td style="color:var(--primary-color);font-weight:600;">${r.adj}</td>
                <td>${r.arrival}</td>
                <td>${DateUtils.minsToHHMM(r.wm)}</td>
            </tr>`).join('');

        html += `
        <div class="payroll-card">
            <h4>${t.name}</h4>
            <div class="payroll-info">
                <p><strong>근무일수:</strong> ${days}일</p>
                <p><strong>총 근무시간:</strong> ${DateUtils.minsToHHMM(mins)}</p>
                <p><strong>시급:</strong> ${t.hourly_rate.toLocaleString()}원</p>
                <p style="font-size:1.1rem;color:var(--primary-color);">
                    <strong>급여:</strong> ${salary.toLocaleString()}원
                </p>
            </div>
            ${detailRows ? `
            <details style="margin-top:12px;">
                <summary style="cursor:pointer;font-size:0.85rem;color:#666;">상세 내역 보기</summary>
                <table style="width:100%;margin-top:8px;font-size:0.8rem;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f5f5f5;">
                            <th style="padding:4px 6px;text-align:left;">날짜</th>
                            <th style="padding:4px 6px;">입력출근</th>
                            <th style="padding:4px 6px;">보정출근</th>
                            <th style="padding:4px 6px;">원도착</th>
                            <th style="padding:4px 6px;">근무시간</th>
                        </tr>
                    </thead>
                    <tbody>${detailRows}</tbody>
                </table>
            </details>` : ''}
        </div>`;
    });
    html += '</div>';
    document.getElementById('payrollSummary').innerHTML = html;
}

async function calculateAllSalaries() {
    await loadPayrollSummary();
    alert('급여 계산이 완료되었습니다.');
}

// ============================================================
// 엑셀(CSV) 다운로드
// ============================================================
async function downloadExcel() {
    const monthRange = DateUtils.getMonthRange(currentAdminYear, currentAdminMonth);

    const [teachersRes, logsRes] = await Promise.all([
        db.from('teachers').select('*').order('name'),
        db.from('work_logs').select('*')
          .gte('work_date', monthRange.start)
          .lte('work_date', monthRange.end)
    ]);

    const teachers = teachersRes.data || [];
    const workLogs = logsRes.data     || [];

    let csv = '선생님,근무일수,총근무시간,시급,급여\n';
    teachers.forEach(t => {
        const logs = workLogs.filter(l => l.teacher_id === t.id && l.work_type !== 'holiday');
        let mins = 0, days = 0;
        logs.forEach(l => {
            if (!l.check_in_time || !l.arrival_time) return;
            const adj = PayrollCalculator.adjustCheckInTime(l.check_in_time, l.first_bus_time);
            mins += PayrollCalculator.calculateWorkMinutes(adj, l.arrival_time);
            days++;
        });
        csv += `${t.name},${days},${DateUtils.minsToHHMM(mins)},${t.hourly_rate},${PayrollCalculator.calculateSalary(mins, t.hourly_rate)}\n`;
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `급여내역_${currentAdminYear}년${currentAdminMonth}월.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================
// 출석 로그
// ============================================================
async function loadLogs() {
    const { data: teachers } = await db.from('teachers').select('id,name').order('name');
    const tf = document.getElementById('teacherFilter');
    tf.innerHTML = '<option value="">전체 선생님</option>' +
        (teachers || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    document.getElementById('monthFilter').value = new Date().toISOString().slice(0, 7);
    await filterLogs();
}

async function filterLogs() {
    const tid   = document.getElementById('teacherFilter').value;
    const month = document.getElementById('monthFilter').value;
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#aaa;">불러오는 중...</td></tr>';

    const { data: teachers } = await db.from('teachers').select('id,name');

    let query = db.from('work_logs').select('*').order('work_date', { ascending: false });
    if (tid)   query = query.eq('teacher_id', tid);
    if (month) query = query.gte('work_date', `${month}-01`).lte('work_date', `${month}-31`);

    const { data: logs, error } = await query;

    if (error || !logs?.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">조회된 로그가 없습니다.</td></tr>';
        return;
    }

    const teacherMap = new Map((teachers || []).map(t => [t.id, t.name]));

    tbody.innerHTML = logs.map(l => {
        let wh = '-';
        if (l.check_in_time && l.arrival_time && l.work_type !== 'holiday') {
            const adj = PayrollCalculator.adjustCheckInTime(l.check_in_time, l.first_bus_time);
            wh = DateUtils.minsToHHMM(PayrollCalculator.calculateWorkMinutes(adj, l.arrival_time));
        }
        return `<tr>
            <td>${l.work_date}</td>
            <td>${teacherMap.get(l.teacher_id) || '알 수 없음'}</td>
            <td>${l.check_in_time     || '-'}</td>
            <td>${l.first_bus_time    || '-'}</td>
            <td>${l.last_dropoff_time || '-'}</td>
            <td>${l.arrival_time      || '-'}</td>
            <td>${wh}</td>
        </tr>`;
    }).join('');
}

// ============================================================
// 휴원일 관리
// ============================================================
async function loadHolidays() { await renderHolidaysTable(); }

function showAddHolidayModal() {
    calendarYear  = new Date().getFullYear();
    calendarMonth = new Date().getMonth();
    renderCalendar();
    document.getElementById('addHolidayModal').classList.add('show');
}

function getTypeLabel(type) {
    return { school_holiday:'휴원', public_holiday:'공휴일', vacation:'방학', event:'행사' }[type] || '휴원';
}

async function renderCalendar() {
    const monthRange = {
        start: `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-01`,
        end:   `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-31`
    };
    const { data: holidays } = await db.from('holidays').select('*')
        .gte('date', monthRange.start).lte('date', monthRange.end);
    const hdMap = new Map((holidays || []).map(h => [h.date, h]));

    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const dayNames   = ['일','월','화','수','목','금','토'];
    document.getElementById('calendarMonthTitle').textContent =
        `${calendarYear}년 ${monthNames[calendarMonth]}`;

    const firstDay    = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth+1, 0).getDate();
    const today       = DateUtils.today();

    let html = dayNames.map((d,i) =>
        `<div class="cal-header ${i===0?'sunday':i===6?'saturday':''}">${d}</div>`).join('');
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

    for (let day = 1; day <= daysInMonth; day++) {
        const ds  = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dow = new Date(calendarYear, calendarMonth, day).getDay();
        const h   = hdMap.get(ds);
        const cls = ['cal-day',
            dow===0?'sunday':dow===6?'saturday':'',
            h?'is-holiday':'', ds===today?'is-today':''
        ].filter(Boolean).join(' ');
        html += `<div class="${cls}" onclick="toggleHolidayDate('${ds}')"
                     title="${h ? h.description||getTypeLabel(h.type) : '클릭하여 휴원일 추가'}">
            <span class="cal-day-num">${day}</span>
            ${h ? `<span class="cal-holiday-badge">${getTypeLabel(h.type)}</span>` : ''}
        </div>`;
    }
    document.getElementById('calendarGrid').innerHTML = html;
}

function changeCalendarMonth(dir) {
    calendarMonth += dir;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    else if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    const f = document.getElementById('inlineHolidayForm');
    if (f) f.remove();
    renderCalendar();
}

async function toggleHolidayDate(dateStr) {
    const { data: existing } = await db.from('holidays').select('id').eq('date', dateStr).maybeSingle();
    if (existing) {
        if (!confirm(`${dateStr} 휴원일을 삭제하시겠습니까?`)) return;
        await db.from('holidays').delete().eq('date', dateStr);
        await renderCalendar();
        await renderHolidaysTable();
        return;
    }
    showInlineHolidayForm(dateStr);
}

function showInlineHolidayForm(dateStr) {
    const existing = document.getElementById('inlineHolidayForm');
    if (existing) existing.remove();
    const form = document.createElement('div');
    form.id = 'inlineHolidayForm';
    form.className = 'inline-holiday-form';
    form.innerHTML = `
        <div class="inline-form-header">📅 <strong>${dateStr}</strong> 휴원일 추가</div>
        <div class="inline-form-row">
            <select id="inlineHolidayType">
                <option value="school_holiday">휴원</option>
                <option value="public_holiday">공휴일</option>
                <option value="vacation">방학</option>
                <option value="event">행사</option>
            </select>
            <input type="text" id="inlineHolidayDesc" placeholder="설명 (예: 추석, 정기휴원)">
        </div>
        <div class="inline-form-actions">
            <button onclick="confirmAddHoliday('${dateStr}')" class="btn-primary"
                    style="padding:7px 20px;font-size:0.85rem;">추가</button>
            <button onclick="document.getElementById('inlineHolidayForm').remove()"
                    class="btn-secondary" style="padding:7px 20px;font-size:0.85rem;">취소</button>
        </div>`;
    document.getElementById('calendarContainer').appendChild(form);
    document.getElementById('inlineHolidayDesc').focus();
}

async function confirmAddHoliday(dateStr) {
    const type        = document.getElementById('inlineHolidayType').value;
    const description = document.getElementById('inlineHolidayDesc').value.trim();

    const { error } = await db.from('holidays').insert({
        date: dateStr, type, description: description || null
    });
    if (error) { alert('저장에 실패했습니다: ' + error.message); return; }

    document.getElementById('inlineHolidayForm').remove();
    await renderCalendar();
    await renderHolidaysTable();
}

async function deleteHoliday(dateStr) {
    if (!confirm('이 휴원일을 삭제하시겠습니까?')) return;
    await db.from('holidays').delete().eq('date', dateStr);
    await renderCalendar();
    await renderHolidaysTable();
}

async function renderHolidaysTable() {
    const tbody    = document.getElementById('holidaysTableBody');
    const dayNames = ['일','월','화','수','목','금','토'];

    const { data: holidays } = await db.from('holidays').select('*').order('date');

    if (!holidays?.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;">등록된 휴원일이 없습니다.</td></tr>';
        return;
    }
    tbody.innerHTML = holidays.map(h => `
        <tr>
            <td>${h.date}</td>
            <td>${dayNames[new Date(h.date+'T00:00:00').getDay()]}</td>
            <td>${getTypeLabel(h.type)}</td>
            <td>${h.description || '-'}</td>
            <td>
                <button onclick="deleteHoliday('${h.date}')" class="btn-secondary"
                        style="padding:6px 12px;font-size:0.8rem;">
                    <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
                </button>
            </td>
        </tr>`).join('');
}
