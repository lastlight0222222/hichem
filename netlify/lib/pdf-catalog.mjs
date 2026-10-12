import { getJson, listRecords } from './storage.mjs';

export const staticPdfs = [
  {
    id: 'static:resume_maths_bac_info.pdf',
    title: 'Résumé',
    subject: 'Mathématiques',
    description: 'Résumé de mathématiques',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/resume_maths_bac_info.pdf'
  },
  {
    id: 'static:resume_algorithmique_bac_info_trimestre1.pdf',
    title: 'Trimestre 1',
    subject: 'Algorithmique',
    description: 'Résumé d’algorithmique',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/resume_algorithmique_bac_info_trimestre1.pdf'
  },
  {
    id: 'static:resume_bases_de_donnees.pdf',
    title: 'Résumé',
    subject: 'Bases de données',
    description: 'Résumé des bases de données',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/resume_bases_de_donnees.pdf'
  },
  {
    id: 'static:guide_revision_bac_info_bases_de_donnees.pdf',
    title: 'Guide',
    subject: 'Bases de données',
    description: 'Guide de révision en bases de données',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/guide_revision_bac_info_bases_de_donnees.pdf'
  },
  {
    id: 'static:Guide_Complet_Bac_SI_Tunisie.pdf',
    title: 'Bac SI',
    subject: 'Guide complet',
    description: 'Guide complet du Bac SI',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/Guide_Complet_Bac_SI_Tunisie.pdf'
  },
  {
    id: 'static:Guide_Bac_Tunisien_SI_BDD_FR.pdf',
    title: 'FR',
    subject: 'Bases de données',
    description: 'Guide des bases de données en français',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/Guide_Bac_Tunisien_SI_BDD_FR.pdf'
  },
  {
    id: 'static:resume_physique_bac_info_trimestre1.pdf',
    title: 'Trimestre 1',
    subject: 'Physique',
    description: 'Résumé de physique, trimestre 1',
    created_at: '1970-01-01T00:00:00.000Z',
    url: '/pdfs/resume_physique_bac_info_trimestre1.pdf'
  }
];

export const defaultLessons = [
  {
    id: 'mathematiques',
    title: 'Mathématiques',
    topics: ['Suites', 'Limites et continuité', 'Dérivabilité', 'Intégrales'],
    pdfId: 'static:resume_maths_bac_info.pdf'
  },
  {
    id: 'algorithmique',
    title: 'Algorithmique',
    topics: ['Recherches', 'Tri', 'Structures', 'Algorithmes classiques'],
    pdfId: 'static:resume_algorithmique_bac_info_trimestre1.pdf'
  },
  {
    id: 'bases-de-donnees',
    title: 'Bases de données',
    topics: ['Modèle relationnel', 'SQL', 'SGBD', 'Requêtes'],
    pdfId: 'static:Guide_Bac_Tunisien_SI_BDD_FR.pdf'
  },
  {
    id: 'physique',
    title: 'Physique',
    topics: ['Rappels de cours', 'Notions clés', 'Exercices', 'Révision rapide'],
    pdfId: 'static:resume_physique_bac_info_trimestre1.pdf'
  }
];

export async function listCatalogPdfs(store) {
  const blobs = await listRecords(store, 'pdfs/');
  const uploaded = (await Promise.all(
    blobs.filter(blob => blob.key.endsWith('/metadata')).map(blob => getJson(store, blob.key))
  ))
    .filter(Boolean)
    .map(pdf => ({
      ...pdf,
      url: `/api/pdfs/${encodeURIComponent(pdf.id)}`
    }));

  return [...uploaded, ...staticPdfs].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getHiddenPdfIds(store) {
  const ids = await getJson(store, 'site/hidden-pdfs') || [];
  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
    throw new Error('Stored hidden PDF list is invalid.');
  }
  return ids;
}

export async function listPublicPdfs(store) {
  const [pdfs, hiddenIds] = await Promise.all([listCatalogPdfs(store), getHiddenPdfIds(store)]);
  const hidden = new Set(hiddenIds);
  return pdfs.filter(pdf => !hidden.has(pdf.id));
}

export async function listAdminPdfs(store) {
  const [pdfs, hiddenIds] = await Promise.all([listCatalogPdfs(store), getHiddenPdfIds(store)]);
  const hidden = new Set(hiddenIds);
  return pdfs.map(pdf => ({
    ...pdf,
    source: pdf.id.startsWith('static:') ? 'static' : 'uploaded',
    published: !hidden.has(pdf.id)
  }));
}

export async function getLessons(store) {
  return await getJson(store, 'site/lessons') || defaultLessons;
}
