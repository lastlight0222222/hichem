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
    `${pdf.subject} · ${new Date(pdf.created_at).toLocaleString('fr-FR')}`
  );
  const title = createAdminPdfElement('h2', '', pdf.title);
  const description = createAdminPdfElement('p', '', pdf.description || 'Aucune description.');
  const controls = document.createElement('div');
  controls.className = 'admin-controls';

  const openLink = document.createElement('a');
  openLink.className = 'secondary-btn';
  openLink.href = `/api/pdfs/${encodeURIComponent(pdf.id)}`;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.textContent = 'Ouvrir le PDF';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Supprimer';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`Retirer « ${pdf.title} » du site et supprimer son fichier ?`)) {
      return;
    }

    deleteButton.disabled = true;

    try {
      const result = await adminApiRequest(`/api/admin/pdfs?id=${encodeURIComponent(pdf.id)}`, {
        method: 'DELETE'
      });

      card.remove();
      pdfUploadStatus.textContent = result.storageCleanupPending
        ? 'Le PDF a été retiré du site, mais le nettoyage du stockage est en attente.'
        : 'PDF supprimé.';

      if (!pdfAdminList.querySelector('.admin-card')) {
        pdfAdminList.append(createAdminPdfElement('p', 'admin-empty', 'Aucun PDF ajouté pour le moment.'));
      }
    } catch (error) {
      pdfUploadStatus.textContent = error.message;
      deleteButton.disabled = false;
    }
  });

  controls.append(openLink, deleteButton);
  card.append(meta, title, description, controls);
  return card;
}

async function loadAdminPdfs() {
  try {
    const result = await adminApiRequest('/api/admin/pdfs', { cache: 'no-store' });

    pdfAdminList.replaceChildren();

    if (result.pdfs.length === 0) {
      pdfAdminList.append(createAdminPdfElement('p', 'admin-empty', 'Aucun PDF ajouté pour le moment.'));
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
    const result = await adminApiRequest('/api/admin/pdfs', {
      method: 'POST',
      body: new FormData(pdfUploadForm)
    });

    pdfUploadForm.reset();
    pdfUploadStatus.textContent = 'PDF ajouté et publié sur le site.';
    await loadAdminPdfs();
  } catch (error) {
    pdfUploadStatus.textContent = error.message || 'Erreur lors du téléversement.';
  } finally {
    pdfUploadButton.disabled = false;
  }
});

loadAdminPdfs();
