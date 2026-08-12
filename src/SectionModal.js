import React from 'react';
import { ChevronRight } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import ItemRow from './ItemRow';
import { flattenLeafItems } from './itemUtils';

function SectionModal({
  section,
  checkedItems,
  onSetOnline,
  onRequestOffline,
  onOpenInstructions,
  onRemove,
  onOpenGroup,
  onClose
}) {
  const leafItems = flattenLeafItems(section.items);
  const checkedCount = leafItems.filter((item) => checkedItems[item.id]).length;

  return (
    <ModalOverlay cardClassName="section-modal-card" onClose={onClose}>
      <div className="header">
        <h1>{section.title}</h1>
        <p>
          {checkedCount}/{leafItems.length} itens verificados
        </p>
      </div>

      <div className="items-list">
        {section.items.map((item) => {
          const isGroup = item.children && item.children.length > 0;

          if (isGroup) {
            const groupChecked = item.children.filter((child) => checkedItems[child.id]).length;
            const groupComplete = groupChecked === item.children.length;

            return (
              <button
                key={item.id}
                type="button"
                className={`check-item check-item-group ${groupComplete ? 'complete' : ''}`}
                onClick={() => onOpenGroup(item)}
              >
                <div className="check-item-info">
                  <span>{item.label}</span>
                  <span className="registered-by">
                    {groupChecked}/{item.children.length} verificados
                  </span>
                </div>
                <ChevronRight size={20} />
              </button>
            );
          }

          return (
            <ItemRow
              key={item.id}
              item={item}
              registro={checkedItems[item.id]}
              onSetOnline={() => onSetOnline(section, item)}
              onRequestOffline={() => onRequestOffline(section, item)}
              onOpenInstructions={() => onOpenInstructions(section, item)}
              onRemove={() => onRemove(section, item)}
            />
          );
        })}
      </div>

      <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1.5rem' }}>
        FECHAR
      </button>
    </ModalOverlay>
  );
}

export default SectionModal;
