const lessonGrid = document.getElementById('lessonGrid');
const lessonStatus = document.getElementById('lessonStatus');
const pdfResources = document.getElementById('pdfResources');
const pdfResourceStatus = document.getElementById('pdfResourceStatus');

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}

function createLessonCard(lesson) {
  const card = document.createElement('article');
  card.className = 'info-card';

  const title = document.createElement('h3');
  title.textContent = lesson.title;
  card.append(title);

  const topics = document.createElement('ul');
  lesson.topics.forEach((topic) => {
    const item = document.createElement('li');
    item.textContent = topic;
    topics.append(item);
  });
  card.append(topics);

  if (lesson.pdfUrl) {
    const button = document.createElement('button');
    button.className = 'card-btn';
    button.type = 'button';
    button.dataset.pdf = lesson.pdfUrl;
    button.dataset.title = lesson.title;
    button.textContent = 'Ouvrir le PDF';
    card.append(button);
  }

  return card;
}

function createPdfResource(pdf) {
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
  return link;
}

async function loadPublicContent() {
  try {
    const [lessonResult, pdfResult] = await Promise.all([
      getJson('/api/lessons'),
      getJson('/api/pdfs')
    ]);
    lessonGrid.replaceChildren(...lessonResult.lessons.map(createLessonCard));
    pdfResources.replaceChildren(...pdfResult.pdfs.map(createPdfResource));
    lessonStatus.textContent = `${lessonResult.lessons.length} leçon(s) disponible(s).`;
    pdfResourceStatus.textContent = `${pdfResult.pdfs.length} PDF disponible(s).`;
  } catch (error) {
    lessonStatus.textContent = `Impossible de charger les leçons et les PDF : ${error.message}`;
    pdfResourceStatus.textContent = 'Les ressources PDF ne sont pas disponibles pour le moment.';
    console.error('Could not load public lessons and PDFs:', error);
  }
}

loadPublicContent();
