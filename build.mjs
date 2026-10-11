import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = join(root, 'dist');
const publicFiles = [
  'index.html',
  'app.js',
  'style.css',
  'formulas.js',
  'formulas.css',
  'public-pdfs.js',
  'public-pdfs.css',
  'suggestions.js',
  'suggestions.css',
  'Guide_Bac_Tunisien_SI_BDD_FR.pdf',
  'Guide_Complet_Bac_SI_Tunisie.pdf',
  'guide_revision_bac_info_bases_de_donnees.pdf',
  'resume_algorithmique_bac_info_trimestre1.pdf',
  'resume_bases_de_donnees.pdf',
  'resume_maths_bac_info.pdf',
  'resume_physique_bac_info_trimestre1.pdf'
];
const adminFiles = [
  'index.html',
  'admin-api.js',
  'admin-auth.js',
  'admin-auth.css',
  'admin.js',
  'admin-pdfs.js',
  'admin.css'
];

rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'admin'), { recursive: true });
publicFiles.forEach(file => cpSync(join(root, file), join(output, file)));
adminFiles.forEach(file => cpSync(join(root, 'admin', file), join(output, 'admin', file)));
