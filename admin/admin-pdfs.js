const pdfUploadForm = document.getElementById('pdfUploadForm');
const pdfUploadButton = document.getElementById('pdfUploadButton');
const pdfUploadStatus = document.getElementById('pdfUploadStatus');
const pdfAdminList = document.getElementById('pdfAdminList');
const maxPdfBytes = 4 * 1024 * 1024;

function createAdminPdfElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createAdminPdfCard(pdf) {
  const card = document.createElement('article');
  card.className = 'admin-card';

  const meta = createAdminPdfElement(
    'div',
    'admin-meta',
    pdf.source === 'static'
      ? 'PDF du dossier pdfs/'
      : `${pdf.subject} · ${new Date(pdf.created_at).toLocaleString('fr-FR')}`
  );
  const title = createAdminPdfElement('h2', '', pdf.title);
  const fields = document.createElement('div');
  fields.className = 'pdf-edit-fields';

  let titleInput;
  let subjectInput;
  let descriptionInput;
  if (pdf.source === 'uploaded') {
    titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.maxLength = 100;
    titleInput.required = true;
    titleInput.value = pdf.title;
    titleInput.setAttribute('aria-label', 'Titre du PDF');

    subjectInput = document.createElement('input');
    subjectInput.type = 'text';
    subjectInput.maxLength = 80;
    subjectInput.required = true;
    subjectInput.value = pdf.subject;
    subjectInput.setAttribute('aria-label', 'Matière du PDF');

    descriptionInput = document.createElement('textarea');
    descriptionInput.maxLength = 240;
    descriptionInput.rows = 2;
    descriptionInput.value = pdf.description || '';
    descriptionInput.setAttribute('aria-label', 'Description du PDF');
    fields.append(titleInput, subjectInput, descriptionInput);
  } else {
    fields.append(createAdminPdfElement('p', '', `${pdf.subject} · ${pdf.description}`));
  }

  const controls = document.createElement('div');
  controls.className = 'admin-controls';

  const openLink = document.createElement('a');
  openLink.className = 'secondary-btn';
  openLink.href = `/api/pdfs/${encodeURIComponent(pdf.id)}`;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Ouvrir le PDF';

  const publishButton = document.createElement('button');
  publishButton.type = 'button';
  publishButton.textContent = pdf.published ? 'Masquer' : 'Publier';
  publishButton.addEventListener('click', async () => {
    publishButton.disabled = true;
    try {
      await adminApiRequest('/api/admin/pdfs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pdf.id, published: !pdf.published })
      });
      pdfUploadStatus.textContent = pdf.published ? 'PDF masqué.' : 'PDF publié.';
      await loadAdminPdfs();
    } catch (error) {
      pdfUploadStatus.textContent = error.message;
      publishButton.disabled = false;
    }
  });

  controls.append(openLink, publishButton);
  if (pdf.source === 'uploaded') {
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Enregistrer les détails';
    saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      try {
        await adminApiRequest('/api/admin/pdfs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: pdf.id,
            title: titleInput.value,
            subject: subjectInput.value,
            description: descriptionInput.value
          })
        });
        pdfUploadStatus.textContent = 'Détails du PDF mis à jour.';
        title.textContent = titleInput.value;
      } catch (error) {
        pdfUploadStatus.textContent = error.message;
      } finally {
        saveButton.disabled = false;
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = 'Supprimer';
    deleteButton.addEventListener('click', async () => {
      if (!window.confirm(`Retirer « ${pdf.title} » du site et supprimer son fichier ?`)) return;
      deleteButton.disabled = true;

      try {
        const result = await adminApiRequest(`/api/admin/pdfs?id=${encodeURIComponent(pdf.id)}`, {
          method: 'DELETE'
        });
        pdfUploadStatus.textContent = result.storageCleanupPending
          ? 'Le PDF a été retiré du site, mais le nettoyage du stockage est en attente.'
          : 'PDF supprimé.';
        await loadAdminPdfs();
      } catch (error) {
        pdfUploadStatus.textContent = error.message;
        deleteButton.disabled = false;
      }
    });
    controls.append(saveButton, deleteButton);
  }

  card.append(meta, title, fields, controls);
  return card;
}

async function loadAdminPdfs() {
  try {
    const result = await adminApiRequest('/api/admin/pdfs', { cache: 'no-store' });
    pdfAdminList.replaceChildren();

    if (result.pdfs.length === 0) {
      pdfAdminList.append(createAdminPdfElement('p', 'admin-empty', 'Aucun PDF téléversé pour le moment.'));
    } else {
      result.pdfs.forEach(pdf => pdfAdminList.append(createAdminPdfCard(pdf)));
    }
  } catch (error) {
    pdfUploadStatus.textContent = error.message;
  }
}

pdfUploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = pdfUploadForm.elements.file.files[0];
  if (!file) {
    pdfUploadStatus.textContent = 'Choisissez un fichier PDF.';
    return;
  }
  if (file.size > maxPdfBytes) {
    pdfUploadStatus.textContent = 'Le PDF dépasse la limite de 4 Mo.';
    return;
  }

  pdfUploadButton.disabled = true;
  pdfUploadStatus.textContent = 'Téléversement du PDF…';
  try {
    await adminApiRequest('/api/admin/pdfs', {
      method: 'POST',
      body: new FormData(pdfUploadForm)
    });
    pdfUploadForm.reset();
    pdfUploadStatus.textContent = 'PDF ajouté et publié.';
    await loadAdminPdfs();
  } catch (error) {
    pdfUploadStatus.textContent = error.message;
  } finally {
    pdfUploadButton.disabled = false;
  }
});

loadAdminPdfs();
