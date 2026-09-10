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

function getPeriodKey(dateStr, frequency) {
  if (frequency === 'weekly') return isoWeekKey(dateStr);
  if (frequency === 'monthly') return monthKey(dateStr);
  return dateStr;
}

module.exports = { FREQUENCIES, sanitizeFrequency, getPeriodKey, isoWeekKey, monthKey };
