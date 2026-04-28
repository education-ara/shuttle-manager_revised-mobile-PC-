// ============================================================
// Supabase 설정
// ⚠️  아래 두 값을 본인의 Supabase 프로젝트 값으로 교체하세요
// ============================================================
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// 역할 선택
// ============================================================
function selectRole(role) {
    if (role === 'teacher') {
        window.location.href = 'teacher-select.html';
    } else if (role === 'admin') {
        window.location.href = 'admin-login.html';
    }
}

// ============================================================
// 날짜 유틸리티
// ============================================================
const DateUtils = {
    toLocalDateStr: function(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },
    today: function() {
        return this.toLocalDateStr(new Date());
    },
    getMonthRange: function(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate   = new Date(year, month, 0);
        return {
            start: this.toLocalDateStr(startDate),
            end:   this.toLocalDateStr(endDate)
        };
    },
    isWeekday: function(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const day = new Date(y, m - 1, d).getDay();
        return day !== 0 && day !== 6;
    },
    timeDiffInMinutes: function(time1, time2) {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);
        return (h2 * 60 + m2) - (h1 * 60 + m1);
    },
    minsToHHMM: function(minutes) {
        if (!minutes || minutes <= 0) return '0시간 00분';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}시간 ${String(m).padStart(2, '0')}분`;
    }
};

// ============================================================
// 급여 계산 유틸리티
// 보정 기준: 첫 차 출발 20분 전까지만 인정 (요구사항 기준)
// ============================================================
const PayrollCalculator = {
    adjustCheckInTime: function(checkInTime, firstBusTime) {
        if (!checkInTime || !firstBusTime) return checkInTime;
        const diff = DateUtils.timeDiffInMinutes(checkInTime, firstBusTime);
        if (diff > 20) {
            const [h, m] = firstBusTime.split(':').map(Number);
            const adjustedMinutes = (h * 60 + m) - 20;
            const ah = Math.floor(adjustedMinutes / 60);
            const am = adjustedMinutes % 60;
            return `${String(ah).padStart(2, '0')}:${String(am).padStart(2, '0')}`;
        }
        return checkInTime;
    },
    calculateWorkMinutes: function(adjustedCheckIn, arrivalTime) {
        if (!adjustedCheckIn || !arrivalTime) return 0;
        const diff = DateUtils.timeDiffInMinutes(adjustedCheckIn, arrivalTime);
        return diff > 0 ? diff : 0;
    },
    calculateSalary: function(totalMinutes, hourlyRate) {
        return Math.round((totalMinutes / 60) * hourlyRate);
    }
};

// ============================================================
// 관리자 인증 (비밀번호는 환경에 맞게 변경)
// ============================================================
const ADMIN_PASSWORD = 'admin1234';

// ============================================================
// 전역 노출
// ============================================================
window.db          = db;
window.DateUtils   = DateUtils;
window.PayrollCalculator = PayrollCalculator;
window.ADMIN_PASSWORD    = ADMIN_PASSWORD;
