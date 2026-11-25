// Calcula a "chave de periodo" de uma data (YYYY-MM-DD) para cada frequencia.
// E o que decide se um item semanal/mensal continua valendo como "verificado"
// mesmo que tenha sido registrado em outro dia dentro do mesmo periodo.

function isoWeekKey(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const target = new Date(date.getTime());
  const dayNr = (date.getUTCDay() + 6) % 7; // segunda=0 ... domingo=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // quinta-feira desta semana

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

const FREQUENCIES = ['daily', 'weekly', 'monthly'];

function sanitizeFrequency(value) {
  return FREQUENCIES.includes(value) ? value : 'daily';
}

function sanitizeMonthlyDay(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 1;
}

// Mensal agora tem um dia fixo de vencimento por item (ex: todo dia 25). O
// "ciclo" vai do dia seguinte ao vencimento ate o proximo vencimento: marcado
// ate o dia configurado, conta pro ciclo que fecha nesse mes; marcado depois,
// ja conta pro ciclo do mes seguinte. Por isso o period_key e nomeado pelo
// ano-mes em que o ciclo FECHA (ex: "M2026-11" pra um vencimento dia 25/11).
function monthlyPeriodKey(dateStr, monthlyDay) {
  const [year, month, day] = dateStr.split('-').map(Number); // month: 1-12
  const day_ = sanitizeMonthlyDay(monthlyDay);

  let targetYear = year;
  let targetMonth = month; // ainda 1-12 aqui
  if (day > day_) {
    targetMonth += 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  return `M${targetYear}-${String(targetMonth).padStart(2, '0')}`;
}

function getPeriodKey(dateStr, frequency, monthlyDay) {
  if (frequency === 'weekly') return isoWeekKey(dateStr);
  if (frequency === 'monthly') return monthlyPeriodKey(dateStr, monthlyDay);
  return dateStr;
}

module.exports = {
  FREQUENCIES,
  sanitizeFrequency,
  sanitizeMonthlyDay,
  getPeriodKey,
  isoWeekKey,
  monthKey
};
