export const FREQUENCY_LABELS = {
  daily: 'DIÁRIA',
  weekly: 'SEMANAL',
  monthly: 'MENSAL'
};

export function frequencyLabel(frequency) {
  return FREQUENCY_LABELS[frequency] || null;
}

// Data em que um item semanal/mensal volta a poder ser marcado de novo.
// Semanal: proxima segunda (semana ISO, igual ao backend). Mensal: 1 mes apos a
// data do ultimo registro (YYYY-MM-DD), com o mesmo ajuste de fim de mes do
// DATE_ADD(..., INTERVAL 1 MONTH) do MySQL (31/01 -> 28/02).
export function nextPeriodReset(frequency, lastDate) {
  const now = new Date();

  if (frequency === 'monthly') {
    if (!lastDate) return null;
    const [year, month, day] = lastDate.slice(0, 10).split('-').map(Number);
    const lastDayOfNextMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDayOfNextMonth));
  }

  if (frequency === 'weekly') {
    const day = now.getDay(); // 0=domingo ... 6=sabado
    const daysUntilNextMonday = ((1 - day + 7) % 7) || 7;
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextMonday);
    return next;
  }

  return null;
}

export function formatDateBR(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function flattenLeafItems(items) {
  return items.flatMap((item) =>
    item.children && item.children.length > 0 ? flattenLeafItems(item.children) : [item]
  );
}

// Achata a arvore de itens em uma lista de folhas, prefixando o label com o
// nome do item-grupo pai (ex: "CAMERA / DVR 1"). Usado no relatorio/export,
// onde cada linha precisa de um rotulo unico e legivel sem aninhamento.
export function flattenLeafItemsWithLabel(items, prefix = '') {
  return items.flatMap((item) => {
    const label = prefix ? `${prefix} / ${item.label}` : item.label;
    if (item.children && item.children.length > 0) {
      return flattenLeafItemsWithLabel(item.children, label);
    }
    return [{ id: item.id, label, frequency: item.frequency }];
  });
}
