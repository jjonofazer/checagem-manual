import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  createSection,
  updateSection,
  deleteSection,
  moveSection,
  createItem,
  updateItem,
  deleteItem,
  moveItem
} from './api';
import ModalOverlay from './ModalOverlay';

function instructionsToText(instructions) {
  return Array.isArray(instructions) ? instructions.join('\n') : '';
}

function textToInstructions(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

function AdminSections({ sections, onReload, onClose }) {
  const [error, setError] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newItemForms, setNewItemForms] = useState({}); // sectionId -> { label, instructions }
  const [editingSection, setEditingSection] = useState(null); // { id, title }
  const [editingItem, setEditingItem] = useState(null); // { id, label, instructions }
  const [expandedSections, setExpandedSections] = useState({});

  const toggleExpanded = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const runAction = async (action) => {
    setError('');
    try {
      await action();
      await onReload();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    runAction(async () => {
      await createSection(newSectionTitle.trim());
      setNewSectionTitle('');
    });
  };

  const handleSaveSection = (id) => {
    runAction(async () => {
      await updateSection(id, editingSection.title);
      setEditingSection(null);
    });
  };

  const handleDeleteSection = (id) => {
    if (!window.confirm('Excluir este tópico e todos os itens dele? Os registros ligados a ele também somem.')) return;
    runAction(() => deleteSection(id));
  };

  const getNewItemForm = (sectionId) => newItemForms[sectionId] || { label: '', instructions: '' };

  const setNewItemForm = (sectionId, patch) => {
    setNewItemForms((prev) => ({ ...prev, [sectionId]: { ...getNewItemForm(sectionId), ...patch } }));
  };

  const handleAddItem = (sectionId) => {
    const form = getNewItemForm(sectionId);
    if (!form.label.trim()) return;
    runAction(async () => {
      await createItem({
        sectionId,
        label: form.label.trim(),
        instructions: textToInstructions(form.instructions)
      });
      setNewItemForms((prev) => ({ ...prev, [sectionId]: { label: '', instructions: '' } }));
    });
  };

  const handleSaveItem = (id) => {
    runAction(async () => {
      await updateItem(id, {
        label: editingItem.label,
        instructions: textToInstructions(editingItem.instructions)
      });
      setEditingItem(null);
    });
  };

  const handleDeleteItem = (id) => {
    if (!window.confirm('Excluir este item? Os registros ligados a ele também somem.')) return;
    runAction(() => deleteItem(id));
  };

  return (
    <ModalOverlay cardClassName="admin-card sections-admin-card" onClose={onClose}>
        <div className="header">
          <h1>TÓPICOS</h1>
          <p>Crie, edite e organize os tópicos e itens da checagem</p>
        </div>

        {error && <p className="login-error">{error}</p>}

        <form className="login-form" onSubmit={handleAddSection}>
          <label htmlFor="new-section-title">Novo tópico</label>
          <div className="inline-form-row">
            <input
              id="new-section-title"
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Ex: SALA DE RAIO-X"
            />
            <button type="submit" className="icon-button">
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </form>

        <div className="sections-admin-list">
          {sections.map((section, sectionIndex) => (
            <div key={section.id} className="section-admin-block">
              <div className="section-admin-title-row">
                {editingSection?.id === section.id ? (
                  <>
                    <input
                      type="text"
                      value={editingSection.title}
                      onChange={(e) => setEditingSection({ id: section.id, title: e.target.value })}
                    />
                    <button type="button" className="icon-button" onClick={() => handleSaveSection(section.id)}>
                      Salvar
                    </button>
                    <button type="button" className="icon-button" onClick={() => setEditingSection(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="section-admin-toggle"
                      onClick={() => toggleExpanded(section.id)}
                    >
                      {expandedSections[section.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <strong>{section.title}</strong>
                    </button>
                    <div className="section-admin-actions">
                      <button
                        type="button"
                        className="icon-button"
                        disabled={sectionIndex === 0}
                        onClick={() => runAction(() => moveSection(section.id, 'up'))}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={sectionIndex === sections.length - 1}
                        onClick={() => runAction(() => moveSection(section.id, 'down'))}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setEditingSection({ id: section.id, title: section.title })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="icon-button" onClick={() => handleDeleteSection(section.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {expandedSections[section.id] && (
              <div className="item-admin-list">
                {section.items.map((item, itemIndex) => (
                  <div key={item.id} className="item-admin-row">
                    {editingItem?.id === item.id ? (
                      <div className="item-admin-edit">
                        <input
                          type="text"
                          value={editingItem.label}
                          onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                        />
                        <textarea
                          rows={3}
                          placeholder="Instruções extras (uma ação por linha). Deixe em branco se não precisar."
                          value={editingItem.instructions}
                          onChange={(e) => setEditingItem({ ...editingItem, instructions: e.target.value })}
                        />
                        <div className="section-admin-actions">
                          <button type="button" className="icon-button" onClick={() => handleSaveItem(item.id)}>
                            Salvar
                          </button>
                          <button type="button" className="icon-button" onClick={() => setEditingItem(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span>
                          {item.label}
                          {item.instructions && <em className="item-admin-badge"> (com instruções)</em>}
                        </span>
                        <div className="section-admin-actions">
                          <button
                            type="button"
                            className="icon-button"
                            disabled={itemIndex === 0}
                            onClick={() => runAction(() => moveItem(item.id, 'up'))}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            disabled={itemIndex === section.items.length - 1}
                            onClick={() => runAction(() => moveItem(item.id, 'down'))}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() =>
                              setEditingItem({
                                id: item.id,
                                label: item.label,
                                instructions: instructionsToText(item.instructions)
                              })
                            }
                          >
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="icon-button" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <div className="item-admin-add">
                  <input
                    type="text"
                    placeholder="Novo item"
                    value={getNewItemForm(section.id).label}
                    onChange={(e) => setNewItemForm(section.id, { label: e.target.value })}
                  />
                  <textarea
                    rows={2}
                    placeholder="Instruções extras (opcional, uma por linha)"
                    value={getNewItemForm(section.id).instructions}
                    onChange={(e) => setNewItemForm(section.id, { instructions: e.target.value })}
                  />
                  <button type="button" className="icon-button" onClick={() => handleAddItem(section.id)}>
                    <Plus size={14} /> Adicionar item
                  </button>
                </div>
              </div>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1.5rem' }}>
          FECHAR
        </button>
    </ModalOverlay>
  );
}

export default AdminSections;
