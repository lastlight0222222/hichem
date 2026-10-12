const lessonCreateForm = document.getElementById('lessonCreateForm');
const lessonAdminStatus = document.getElementById('lessonAdminStatus');
const lessonAdminList = document.getElementById('lessonAdminList');

function createLessonElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createPdfSelect(pdfs, selectedId) {
  const select = document.createElement('select');
  select.required = true;
  select.setAttribute('aria-label', 'PDF associé');

  pdfs.forEach((pdf) => {
    const option = document.createElement('option');
    option.value = pdf.id;
    option.textContent = `${pdf.subject} — ${pdf.title}`;
    option.selected = pdf.id === selectedId;
    select.append(option);
  });
  return select;
}

async function saveLessons(lessons, successMessage) {
  await adminApiRequest('/api/admin/lessons', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessons })
  });
  lessonAdminStatus.textContent = successMessage;
  await loadAdminLessons();
}

function createLessonCard(lesson, pdfs, lessons) {
  const card = document.createElement('article');
  card.className = 'admin-card';
  card.dataset.lessonId = lesson.id;

  const title = document.createElement('input');
  title.type = 'text';
  title.maxLength = 100;
  title.required = true;
  title.value = lesson.title;
  title.setAttribute('aria-label', 'Titre de la leçon');

  const topics = document.createElement('textarea');
  topics.rows = 5;
  topics.maxLength = 2400;
  topics.value = lesson.topics.join('\n');
  topics.setAttribute('aria-label', 'Chapitres, un par ligne');

  const pdfSelect = createPdfSelect(pdfs, lesson.pdfId);
  const controls = document.createElement('div');
  controls.className = 'admin-controls';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Enregistrer';
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    const updated = lessons.map(item => item.id === lesson.id ? {
      ...item,
      title: title.value,
      topics: topics.value.split(/\r?\n/).map(topic => topic.trim()).filter(Boolean),
      pdfId: pdfSelect.value
    } : item);

    try {
      await saveLessons(updated, 'Leçon mise à jour.');
    } catch (error) {
      lessonAdminStatus.textContent = error.message;
      saveButton.disabled = false;
    }
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Supprimer';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`Supprimer la leçon « ${lesson.title} » ?`)) return;
    deleteButton.disabled = true;

    try {
      await saveLessons(lessons.filter(item => item.id !== lesson.id), 'Leçon supprimée.');
    } catch (error) {
      lessonAdminStatus.textContent = error.message;
      deleteButton.disabled = false;
    }
  });

  controls.append(pdfSelect, saveButton, deleteButton);
  card.append(
    createLessonElement('label', 'lesson-edit-field', 'Titre'),
    title,
    createLessonElement('label', 'lesson-edit-field', 'Chapitres (un par ligne)'),
    topics,
    controls
  );
  card.querySelectorAll('.lesson-edit-field')[0].htmlFor = `lesson-title-${lesson.id}`;
  title.id = `lesson-title-${lesson.id}`;
  card.querySelectorAll('.lesson-edit-field')[1].htmlFor = `lesson-topics-${lesson.id}`;
  topics.id = `lesson-topics-${lesson.id}`;
  return card;
}

async function loadAdminLessons() {
  try {
    const result = await adminApiRequest('/api/admin/lessons', { cache: 'no-store' });
    lessonAdminList.replaceChildren();
    lessonCreateForm.elements.pdfId.replaceChildren();

    result.pdfs.forEach((pdf) => {
      const option = document.createElement('option');
      option.value = pdf.id;
      option.textContent = `${pdf.subject} — ${pdf.title}`;
      lessonCreateForm.elements.pdfId.append(option);
    });

    if (result.pdfs.length === 0) {
      lessonAdminStatus.textContent = 'Aucun PDF disponible. Un enseignant doit en téléverser un avant de créer une leçon.';
    } else if (result.lessons.length === 0) {
      lessonAdminList.append(createLessonElement('p', 'admin-empty', 'Aucune leçon publiée.'));
      lessonAdminStatus.textContent = 'Vous pouvez créer une nouvelle leçon ci-dessus.';
    } else {
      result.lessons.forEach(lesson => lessonAdminList.append(
        createLessonCard(lesson, result.pdfs, result.lessons)
      ));
      lessonAdminStatus.textContent = `${result.lessons.length} leçon(s) chargée(s).`;
    }
  } catch (error) {
    lessonAdminStatus.textContent = error.message;
  }
}

lessonCreateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = lessonCreateForm.elements.title.value.trim();
  const topics = lessonCreateForm.elements.topics.value
    .split(/\r?\n/)
    .map(topic => topic.trim())
    .filter(Boolean);
  const baseId = title.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'lecon';
  const existing = new Set(Array.from(lessonAdminList.querySelectorAll('[data-lesson-id]'))
    .map(card => card.dataset.lessonId));
  let id = baseId;
  let suffix = 2;
  while (existing.has(id)) id = `${baseId}-${suffix++}`;

  const submitButton = lessonCreateForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const current = await adminApiRequest('/api/admin/lessons', { cache: 'no-store' });
    await saveLessons([...current.lessons, {
      id,
      title,
      topics,
      pdfId: lessonCreateForm.elements.pdfId.value
    }], 'Leçon ajoutée.');
    lessonCreateForm.reset();
  } catch (error) {
    lessonAdminStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

loadAdminLessons();
