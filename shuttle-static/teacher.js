// ============================================================
// teacher.js  —  Supabase 연동 버전
// ============================================================

let currentTeacherId = null;
let currentMonth = new Date().getMonth() + 1;
let currentYear  = new Date().getFullYear();

// 저장 디바운스 타이머 (날짜별)
const saveTimers = {};

// ============================================================
// 페이지 초기화
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);

    if (window.location.pathname.includes('teacher-select.html')) {
        await loadTeachers();
    }

    if (window.location.pathname.includes('teacher.html')) {
        currentTeacherId = urlParams.get('teacherId');
        if (!currentTeacherId) {
            alert('선생님을 선택해주세요.');
            window.location.href = 'teacher-select.html';
            return;
        }
        await loadTeacherInfo();
        await loadWorkLogs();
    }
});

// ============================================================
// 선생님 선택 페이지
// ============================================================
async function loadTeachers() {
    const teacherGrid = document.getElementById('teacherGrid');
    teacherGrid.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px;">불러오는 중...</p>';

    const { data: teachers, error } = await db
        .from('teachers')
        .select('*')
        .order('name');

    if (error) {
        teacherGrid.innerHTML = '<p style="text-align:center;color:red;padding:40px;">데이터를 불러오지 못했습니다.</p>';
        console.error(error);
        return;
    }

    if (!teachers || teachers.length === 0) {
        teacherGrid.innerHTML = '<p style="text-align:center;color:#888;padding:40px;">등록된 선생님이 없습니다.</p>';
        return;
    }

    teacherGrid.innerHTML = teachers.map(teacher => `
        <div class="teacher-card" onclick="selectTeacher('${teacher.id}')">
            <div class="teacher-avatar">${teacher.name.charAt(0)}</div>
            <div class="teacher-name">${teacher.name}</div>
        </div>
    `).join('');
}

function selectTeacher(teacherId) {
    window.location.href = `teacher.html?teacherId=${teacherId}`;
}

// ============================================================
// 근무일지 페이지 — 선생님 정보
// ============================================================
async function loadTeacherInfo() {
    const { data: teacher, error } = await db
        .from('teachers')
        .select('*')
        .eq('id', currentTeacherId)
        .single();

    if (error || !teacher) {
        alert('선생님 정보를 찾을 수 없습니다.');
        window.location.href = 'teacher-select.html';
        return;
    }

    document.getElementById('teacherName').textContent = teacher.name + ' 선생님';
    updateMonthDisplay();
}

function updateMonthDisplay() {
    document.getElementById('currentMonth').textContent =
        `${currentYear}년 ${currentMonth}월`;
}

function changeMonth(direction) {
    currentMonth += direction;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    else if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    updateMonthDisplay();
    loadWorkLogs();
}

// ============================================================
// 근무일지 로드 및 렌더링
// ============================================================
async function loadWorkLogs() {
    const tbody = document.getElementById('workLogsBody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#aaa;">불러오는 중...</td></tr>';

    const monthRange = DateUtils.getMonthRange(currentYear, currentMonth);

    // Supabase에서 이번 달 근무 기록 + 휴원일 병렬 조회
    const [logsRes, holidaysRes] = await Promise.all([
        db.from('work_logs')
          .select('*')
          .eq('teacher_id', currentTeacherId)
          .gte('work_date', monthRange.start)
          .lte('work_date', monthRange.end),
        db.from('holidays')
          .select('*')
          .gte('date', monthRange.start)
          .lte('date', monthRange.end)
    ]);

    const workLogs = logsRes.data  || [];
    const holidays = holidaysRes.data || [];

    // 날짜별 Map으로 변환 (빠른 조회)
    const logMap     = new Map(workLogs.map(l => [l.work_date, l]));
    const holidayMap = new Map(holidays.map(h => [h.date, h]));

    const [sy, sm, sd] = monthRange.start.split('-').map(Number);
    const [ey, em, ed] = monthRange.end.split('-').map(Number);

    let actualWorkDays = 0, totalWorkableDays = 0, html = '';

    for (let d = new Date(sy, sm - 1, sd);
         d <= new Date(ey, em - 1, ed);
         d.setDate(d.getDate() + 1)) {

        const dateStr  = DateUtils.toLocalDateStr(d);
        const dayOfWeek = d.getDay();
        const dayName  = ['일','월','화','수','목','금','토'][dayOfWeek];
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isToday  = dateStr === DateUtils.today();

        const schoolHoliday   = holidayMap.get(dateStr);
        const isSchoolHoliday = !!schoolHoliday;
        const workLog         = logMap.get(dateStr);
        const isManualHoliday = !!(workLog && workLog.work_type === 'holiday');
        const isHoliday       = isWeekend || isSchoolHoliday || isManualHoliday;

        // 통계
        if (!isWeekend && !isSchoolHoliday) {
            totalWorkableDays++;
            if (!isManualHoliday && workLog && isWorkLogComplete(workLog)) actualWorkDays++;
        }

        // 행 클래스
        const rowClasses = [
            isHoliday ? 'weekend' : '',
            isToday   ? 'today'   : '',
            !isHoliday && workLog && isWorkLogComplete(workLog) ? 'completed'    : '',
            !isHoliday && !isManualHoliday && !workLog          ? 'missing-data' : ''
        ].filter(Boolean).join(' ');

        // 구분 셀
        let selectCell, mobileSelectCell;
        if (isWeekend) {
            selectCell = mobileSelectCell =
                `<span style="font-size:0.82rem;color:#aaa;">주말</span>`;
        } else if (isSchoolHoliday) {
            const label = `휴원일${schoolHoliday.description ? ': ' + schoolHoliday.description : ''}`;
            selectCell       = `<span style="font-size:0.82rem;color:#e53935;">${label}</span>`;
            mobileSelectCell = `<span class="mobile-holiday-label">🚫 ${label}</span>`;
        } else {
            selectCell = mobileSelectCell = `
                <select onchange="saveWorkLogField('${dateStr}', 'work_type', this.value)"
                        class="mobile-type-select">
                    <option value="work"    ${!isManualHoliday ? 'selected' : ''}>근무</option>
                    <option value="holiday" ${ isManualHoliday ? 'selected' : ''}>휴일</option>
                </select>`;
        }

        // 상태 배지
        let statusClass, statusText;
        if      (isWeekend)      { statusClass = 'status-weekend';       statusText = '주말'; }
        else if (isSchoolHoliday){ statusClass = 'status-school-holiday'; statusText = '휴원'; }
        else if (isManualHoliday){ statusClass = 'status-weekend';       statusText = '휴일'; }
        else if (workLog && isWorkLogComplete(workLog))
                                 { statusClass = 'status-completed';     statusText = '완료'; }
        else                     { statusClass = 'status-incomplete';    statusText = '미완료'; }

        const dayClass = dayOfWeek === 0 ? 'sun' : dayOfWeek === 6 ? 'sat' : '';
        const v = f => workLog?.[f] || '';

        html += `
        <tr class="${rowClasses}"
            data-date="${dateStr}"
            data-is-school-holiday="${isSchoolHoliday}"
            data-is-weekend="${isWeekend}">

            <!-- ── 데스크탑 ── -->
            <td class="desktop-only">${dateStr.split('-')[2]}</td>
            <td class="desktop-only ${dayOfWeek===0?'day-sun':dayOfWeek===6?'day-sat':''}">${dayName}</td>
            <td class="desktop-only">
                <input type="time" value="${v('check_in_time')}"
                    onchange="scheduleAutoSave('${dateStr}','check_in_time',this.value)"
                    ${isHoliday ? 'disabled' : ''}>
            </td>
            <td class="desktop-only">
                <input type="time" value="${v('first_bus_time')}"
                    onchange="scheduleAutoSave('${dateStr}','first_bus_time',this.value)"
                    ${isHoliday ? 'disabled' : ''}>
            </td>
            <td class="desktop-only">
                <input type="time" value="${v('last_dropoff_time')}"
                    onchange="scheduleAutoSave('${dateStr}','last_dropoff_time',this.value)"
                    ${isHoliday ? 'disabled' : ''}>
            </td>
            <td class="desktop-only">
                <input type="time" value="${v('arrival_time')}"
                    onchange="scheduleAutoSave('${dateStr}','arrival_time',this.value)"
                    ${isHoliday ? 'disabled' : ''}>
            </td>
            <td class="desktop-only">
                <input type="text" value="${v('memo')}"
                    onchange="scheduleAutoSave('${dateStr}','memo',this.value)"
                    placeholder="메모"
                    ${isHoliday ? 'disabled' : ''}>
            </td>
            <td class="desktop-only">${selectCell}</td>
            <td class="desktop-only">
                <span class="status-badge ${statusClass}" id="badge-${dateStr}">${statusText}</span>
            </td>

            <!-- ── 모바일 ── -->
            <td colspan="9" class="mobile-only" style="padding:0;border:none;">
                <div class="mobile-card-header">
                    <div class="mobile-date-info">
                        <span class="mobile-date-num">${dateStr.split('-')[2]}</span>
                        <span class="mobile-day-name ${dayClass}">${dayName}요일</span>
                    </div>
                    <span class="status-badge ${statusClass}" id="mbadge-${dateStr}">${statusText}</span>
                </div>
                ${isHoliday && !isManualHoliday
                    ? (isSchoolHoliday
                        ? `<div class="mobile-holiday-label">🚫 휴원일${schoolHoliday.description?': '+schoolHoliday.description:''}</div>`
                        : '')
                    : `
                <div class="mobile-time-grid">
                    <div class="mobile-time-item">
                        <span class="mobile-time-label">출근</span>
                        <input type="time" value="${v('check_in_time')}"
                            onchange="scheduleAutoSave('${dateStr}','check_in_time',this.value)"
                            ${isHoliday?'disabled':''}>
                    </div>
                    <div class="mobile-time-item">
                        <span class="mobile-time-label">첫 차량 출발</span>
                        <input type="time" value="${v('first_bus_time')}"
                            onchange="scheduleAutoSave('${dateStr}','first_bus_time',this.value)"
                            ${isHoliday?'disabled':''}>
                    </div>
                    <div class="mobile-time-item">
                        <span class="mobile-time-label">마지막 하차</span>
                        <input type="time" value="${v('last_dropoff_time')}"
                            onchange="scheduleAutoSave('${dateStr}','last_dropoff_time',this.value)"
                            ${isHoliday?'disabled':''}>
                    </div>
                    <div class="mobile-time-item">
                        <span class="mobile-time-label">원 도착</span>
                        <input type="time" value="${v('arrival_time')}"
                            onchange="scheduleAutoSave('${dateStr}','arrival_time',this.value)"
                            ${isHoliday?'disabled':''}>
                    </div>
                </div>
                <div class="mobile-bottom-row">
                    <input class="mobile-memo-input" type="text" value="${v('memo')}"
                        onchange="scheduleAutoSave('${dateStr}','memo',this.value)"
                        placeholder="메모"
                        ${isHoliday?'disabled':''}>
                    ${mobileSelectCell}
                </div>`}
            </td>
        </tr>`;
    }

    tbody.innerHTML = html;
    updateWorkStats(actualWorkDays, totalWorkableDays);
}

// ============================================================
// 자동 저장 (디바운스 800ms)
// ============================================================
// 각 날짜별로 현재 입력값을 메모리에 쌓아두고 한 번에 저장
const pendingData = {};   // { dateStr: { field: value, ... } }

function scheduleAutoSave(dateStr, field, value) {
    // 메모리에 값 누적
    if (!pendingData[dateStr]) pendingData[dateStr] = {};
    pendingData[dateStr][field] = value;

    // 이미 예약된 타이머 취소
    if (saveTimers[dateStr]) clearTimeout(saveTimers[dateStr]);

    showSavingIndicator();

    // 800ms 후 실제 저장
    saveTimers[dateStr] = setTimeout(async () => {
        await flushSave(dateStr);
    }, 800);
}

async function flushSave(dateStr) {
    const changes = pendingData[dateStr];
    if (!changes) return;

    try {
        // 현재 행의 모든 time input 값 수집 (화면에 있는 최신값)
        const row = document.querySelector(`tr[data-date="${dateStr}"]`);
        const getVal = selector => row?.querySelector(selector)?.value || null;

        // 기존 DB 레코드 조회
        const { data: existing } = await db
            .from('work_logs')
            .select('id, check_in_time, first_bus_time, last_dropoff_time, arrival_time, memo, work_type')
            .eq('teacher_id', currentTeacherId)
            .eq('work_date', dateStr)
            .maybeSingle();

        // 병합: DB 기존값 → 화면값(최신) 순으로 덮어쓰기
        const payload = {
            teacher_id:        currentTeacherId,
            work_date:         dateStr,
            check_in_time:     changes.check_in_time     ?? existing?.check_in_time     ?? null,
            first_bus_time:    changes.first_bus_time    ?? existing?.first_bus_time    ?? null,
            last_dropoff_time: changes.last_dropoff_time ?? existing?.last_dropoff_time ?? null,
            arrival_time:      changes.arrival_time      ?? existing?.arrival_time      ?? null,
            memo:              changes.memo              ?? existing?.memo              ?? null,
            work_type:         changes.work_type         ?? existing?.work_type         ?? 'work',
            updated_at:        new Date().toISOString(),
        };

        // 휴일로 변경 시 시간 필드 초기화
        if (payload.work_type === 'holiday') {
            payload.check_in_time     = null;
            payload.first_bus_time    = null;
            payload.last_dropoff_time = null;
            payload.arrival_time      = null;
        }

        let error;
        if (existing) {
            ({ error } = await db.from('work_logs').update(payload).eq('id', existing.id));
        } else {
            ({ error } = await db.from('work_logs').insert({
                ...payload,
                created_at: new Date().toISOString()
            }));
        }

        if (error) throw error;

        // 메모리 초기화
        delete pendingData[dateStr];

        // UI 상태 갱신
        updateRowStatus(dateStr, payload);
        showAutosaveNotification();

    } catch (err) {
        console.error('저장 실패:', err);
        showSaveError();
    }
}

// ============================================================
// 행 상태 UI 업데이트 (전체 재렌더링 없이)
// ============================================================
function updateRowStatus(dateStr, log) {
    const row = document.querySelector(`tr[data-date="${dateStr}"]`);
    if (!row) return;

    const isWeekend      = row.dataset.isWeekend === 'true';
    const isSchoolHoliday = row.dataset.isSchoolHoliday === 'true';
    const isManualHoliday = log.work_type === 'holiday';
    const isHoliday      = isWeekend || isSchoolHoliday || isManualHoliday;
    const isComplete     = !!(log.check_in_time && log.first_bus_time &&
                              log.last_dropoff_time && log.arrival_time);

    // 행 클래스
    row.className = [
        isHoliday ? 'weekend' : '',
        dateStr === DateUtils.today() ? 'today' : '',
        !isHoliday && isComplete ? 'completed' : '',
        !isHoliday && !isManualHoliday && !isComplete ? 'missing-data' : ''
    ].filter(Boolean).join(' ');
    // data 속성 유지
    row.dataset.date             = dateStr;
    row.dataset.isSchoolHoliday  = String(isSchoolHoliday);
    row.dataset.isWeekend        = String(isWeekend);

    // 입력 필드 활성/비활성
    row.querySelectorAll('input[type="time"], input[type="text"]').forEach(inp => {
        inp.disabled = isHoliday;
        if (isManualHoliday && inp.type === 'time') inp.value = '';
    });

    // 상태 배지 (데스크탑 + 모바일)
    let cls, txt;
    if      (isWeekend)       { cls = 'status-weekend';       txt = '주말'; }
    else if (isSchoolHoliday) { cls = 'status-school-holiday'; txt = '휴원'; }
    else if (isManualHoliday) { cls = 'status-weekend';       txt = '휴일'; }
    else if (isComplete)      { cls = 'status-completed';     txt = '완료'; }
    else                      { cls = 'status-incomplete';    txt = '미완료'; }

    [`badge-${dateStr}`, `mbadge-${dateStr}`].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.className = `status-badge ${cls}`; el.textContent = txt; }
    });

    recalculateStats();
}

// ============================================================
// 통계 재계산
// ============================================================
async function recalculateStats() {
    const monthRange = DateUtils.getMonthRange(currentYear, currentMonth);

    const [logsRes, holidaysRes] = await Promise.all([
        db.from('work_logs').select('work_date,check_in_time,first_bus_time,last_dropoff_time,arrival_time,work_type')
          .eq('teacher_id', currentTeacherId)
          .gte('work_date', monthRange.start)
          .lte('work_date', monthRange.end),
        db.from('holidays').select('date')
          .gte('date', monthRange.start)
          .lte('date', monthRange.end)
    ]);

    const logs     = logsRes.data     || [];
    const holidays = holidaysRes.data || [];
    const logMap   = new Map(logs.map(l => [l.work_date, l]));
    const hdSet    = new Set(holidays.map(h => h.date));

    const [sy, sm, sd] = monthRange.start.split('-').map(Number);
    const [ey, em, ed] = monthRange.end.split('-').map(Number);
    let actual = 0, total = 0;

    for (let d = new Date(sy, sm-1, sd); d <= new Date(ey, em-1, ed); d.setDate(d.getDate()+1)) {
        const ds  = DateUtils.toLocalDateStr(d);
        const dow = d.getDay();
        if (dow === 0 || dow === 6 || hdSet.has(ds)) continue;
        total++;
        const wl = logMap.get(ds);
        if (wl && wl.work_type !== 'holiday' && isWorkLogComplete(wl)) actual++;
    }

    updateWorkStats(actual, total);
}

function isWorkLogComplete(wl) {
    return !!(wl.check_in_time && wl.first_bus_time && wl.last_dropoff_time && wl.arrival_time);
}

function updateWorkStats(actual, total) {
    document.getElementById('actualWorkDays').textContent  = actual + '일';
    document.getElementById('totalWorkDays').textContent   = total  + '일';
    const rate = total > 0 ? Math.round((actual / total) * 100) : 0;
    const el = document.getElementById('completionRate');
    el.textContent  = rate + '%';
    el.style.color  = rate >= 80 ? 'var(--success-color)'
                    : rate >= 60 ? 'var(--warning-color)'
                    : 'var(--error-color)';
}

// ============================================================
// 저장 상태 UI
// ============================================================
function showSavingIndicator() {
    const n = document.getElementById('autosaveNotification');
    if (!n) return;
    n.innerHTML = `<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">sync</span><span>저장 중...</span>`;
    n.classList.add('show');
}

function showAutosaveNotification() {
    const n = document.getElementById('autosaveNotification');
    if (!n) return;
    n.innerHTML = `<span class="material-symbols-outlined">check_circle</span><span>자동 저장되었습니다</span>`;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 2500);
}

function showSaveError() {
    const n = document.getElementById('autosaveNotification');
    if (!n) return;
    n.innerHTML = `<span class="material-symbols-outlined" style="color:#e53935">cloud_off</span><span style="color:#e53935">저장 실패 — 다시 시도하세요</span>`;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 4000);
}
