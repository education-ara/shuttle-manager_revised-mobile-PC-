import * as XLSX from 'xlsx';
import { PayrollResult } from '@/types';
import { formatCurrency, formatHours } from './payroll';

export function exportPayrollToExcel(payroll: PayrollResult) {
  const { teacher, month, logs, totalWorkHours, totalSalary } = payroll;

  const headerRows = [
    ['셔틀 선생님 급여 정산표'],
    [`선생님: ${teacher.name}`, `정산 월: ${month}`, `시급: ${formatCurrency(teacher.hourly_rate)}`],
    [],
    ['날짜', '요일', '출근시간', '첫차출발', '보정출근', '원도착', '근무시간', '메모', '상태'],
  ];

  const dataRows = logs.map((log) => [
    log.date,
    log.dayOfWeek,
    log.checkInTime ?? '-',
    log.firstBusTime ?? '-',
    log.adjustedCheckIn ?? '-',
    log.arrivalTime ?? '-',
    log.workHours !== null ? `${log.workHours.toFixed(2)}h` : '-',
    log.memo ?? '',
    log.isMissing ? '⚠️ 누락' : '✓ 완료',
  ]);

  const summaryRows = [
    [],
    ['총 근무일수', `${logs.filter((l) => !l.isMissing).length}일`],
    ['총 근무시간', formatHours(totalWorkHours)],
    ['시급', formatCurrency(teacher.hourly_rate)],
    ['총 급여', formatCurrency(totalSalary)],
  ];

  const allRows = [...headerRows, ...dataRows, ...summaryRows];

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  const wb = XLSX.utils.book_new();

  // Style column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '급여정산');
  XLSX.writeFile(wb, `급여정산_${teacher.name}_${month}.xlsx`);
}
