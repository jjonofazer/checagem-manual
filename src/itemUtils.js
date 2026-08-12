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
    return [{ id: item.id, label }];
  });
}
