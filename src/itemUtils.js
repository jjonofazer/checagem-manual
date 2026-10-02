export const FREQUENCY_LABELS = {
  daily: 'DIÁRIA',
  weekly: 'SEMANAL',
  monthly: 'MENSAL'
};

export function frequencyLabel(frequency) {
  return FREQUENCY_LABELS[frequency] || null;
}

// Data em que um item semanal/mensal volta a poder ser marcado de novo (o
// mesmo calculo de periodo que o backend usa pra period_key, so que aqui so
// precisamos do inicio do PROXIMO periodo, nao da chave do atual).
export function nextPeriodReset(frequency) {
  const now = new Date();

  if (frequency === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
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
