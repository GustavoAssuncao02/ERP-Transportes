import { useEffect, useRef, useState } from 'react';
import { Eye, FilePlus, X } from 'lucide-react';

function normalizeAttachment(file, source = 'new') {
  if (file instanceof File) {
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      type: file.type || 'Arquivo',
      size: file.size,
      source,
      file,
    };
  }

  return {
    id: file.id || file.name,
    name: file.name,
    type: file.type || 'Documento anexado',
    size: file.size || 0,
    source: file.source || source,
    url: file.url || '',
  };
}

function formatSize(size) {
  if (!size) return 'Arquivo existente';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export default function AttachmentPanel({ attachments, onAddFiles }) {
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const normalizedAttachments = attachments.map((attachment) => normalizeAttachment(attachment));

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const files = [...event.target.files];
    if (files.length) {
      onAddFiles(files);
    }
    event.target.value = '';
  }

  function handlePreview(attachment) {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }

    if (attachment.file) {
      const nextUrl = URL.createObjectURL(attachment.file);
      setPreviewUrl(nextUrl);
      setPreview({ ...attachment, url: nextUrl });
      return;
    }

    setPreview(attachment);
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setPreview(null);
  }

  return (
    <section className="attachments-panel field--span-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="attachments-header">
        <div>
          <span>Documentos anexados</span>
          <strong>{normalizedAttachments.length} documento(s)</strong>
        </div>
        <button type="button" className="secondary-button attachment-add-button" onClick={openFilePicker}>
          <FilePlus size={15} strokeWidth={2.2} />
          {normalizedAttachments.length ? 'Anexar novos documentos' : 'Anexar documentos'}
        </button>
      </div>

      {normalizedAttachments.length > 0 ? (
        <div className="attachments-list">
          {normalizedAttachments.map((attachment) => (
            <article className="attachment-card" key={attachment.id}>
              <div>
                <strong>{attachment.name}</strong>
                <span>{attachment.type} - {formatSize(attachment.size)}</span>
              </div>
              <button type="button" className="secondary-button attachment-view-button" onClick={() => handlePreview(attachment)}>
                <Eye size={15} strokeWidth={2.2} />
                Visualizar
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="attachments-empty">Nenhum documento anexado</div>
      )}

      {preview && (
        <div className="document-preview-modal" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
          <button type="button" className="lookup-modal-backdrop" aria-label="Fechar visualizacao" onClick={closePreview} />
          <div className="document-preview-panel">
            <header className="lookup-modal-header">
              <div>
                <h2 id="document-preview-title">Visualizar documento anexado</h2>
                <span>{preview.name}</span>
              </div>
              <button type="button" className="modal-close-button" aria-label="Fechar" onClick={closePreview}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </header>

            <div className="document-preview-body">
              {preview.url && preview.type.startsWith('image/') && (
                <img src={preview.url} alt={preview.name} />
              )}

              {preview.url && preview.type === 'application/pdf' && (
                <iframe src={preview.url} title={preview.name} />
              )}

              {(!preview.url || (!preview.type.startsWith('image/') && preview.type !== 'application/pdf')) && (
                <div className="document-preview-placeholder">
                  <strong>{preview.name}</strong>
                  <span>{preview.type}</span>
                  <p>Documento anexado ao lancamento. A pre-visualizacao real sera aberta quando o arquivo estiver disponivel no armazenamento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
