import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  initial?: { name: string; description?: string };
  onSave: (data: { name: string; description?: string }) => void;
  onClose: () => void;
  title: string;
}

export function PortfolioForm({ initial, onSave, onClose, title }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-modal-overlay" onClick={onClose}>
      <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pf-modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="pf-modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pf-modal-body">
            <div className="pf-form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pf-input"
                placeholder="Mi Portfolio"
                required
                autoFocus
              />
            </div>

            <div className="pf-form-group">
              <label>Descripción (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pf-input pf-textarea"
                placeholder="Breve descripción..."
                rows={3}
              />
            </div>
          </div>

          <div className="pf-modal-footer">
            <button type="button" onClick={onClose} className="pf-cancel-btn">
              Cancelar
            </button>
            <button type="submit" disabled={!name.trim() || saving} className="pf-save-btn">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
