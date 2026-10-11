const uploadedPdfResources = document.getElementById('uploadedPdfResources');

async function loadUploadedPdfResources() {
  if (!uploadedPdfResources) return;

  try {
    const response = await fetch('/api/pdfs', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Impossible de charger les nouveaux PDF.');
    }

    const result = await response.json();

    result.pdfs.forEach((pdf) => {
      const link = document.createElement('a');
      link.className = 'source-card';
      link.href = pdf.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const subject = document.createElement('span');
      subject.textContent = pdf.subject;

      const title = document.createElement('strong');
      title.textContent = pdf.title;

      link.append(subject, title);
      uploadedPdfResources.append(link);
    });
  } catch (error) {
    console.error(error.message);
  }
}

loadUploadedPdfResources();
