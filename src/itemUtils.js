export const FREQUENCY_LABELS = {
  daily: 'DIÁRIA',
  weekly: 'SEMANAL',
  monthly: 'MENSAL'
};

export function frequencyLabel(frequency) {
  return FREQUENCY_LABELS[frequency] || null;
}

// Data em que um item semanal/mensal volta a poder ser marcado de novo. So e
// chamada quando o item ja esta travado (satisfeito no periodo atual), entao
// o resultado precisa ser sempre no futuro - se hoje for exatamente o dia do
// vencimento, o proximo vencimento e no mes seguinte, nao hoje de novo.
// Semanal: proxima segunda (semana ISO, igual ao backend). Mensal: dia fixo de
// vencimento do proprio item (ex: todo dia 25), com o mesmo ajuste de fim de
// mes do backend (dia 31 num mes de 30 dias cai no ultimo dia daquele mes).
export function nextPeriodReset(frequency, monthlyDay) {
  const now = new Date();

  if (frequency === 'monthly') {
    const day = monthlyDay || 1;
    const targetMonth = now.getDate() >= day ? now.getMonth() + 1 : now.getMonth();
    const lastDayOfTargetMonth = new Date(now.getFullYear(), targetMonth + 1, 0).getDate();
    return new Date(now.getFullYear(), targetMonth, Math.min(day, lastDayOfTargetMonth));
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
