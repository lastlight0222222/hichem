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
  'suggestions.css'
];
const adminFiles = [
  'index.html',
  'admin-api.js',
  'admin-auth.js',
  'admin-auth.css',
  'admin.js',
  'admin-pdfs.js',
  'admin-lessons.js',
  'admin.css'
];
const teacherFiles = ['index.html', 'teacher.js'];

rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, 'admin'), { recursive: true });
mkdirSync(join(output, 'teachers'), { recursive: true });
publicFiles.forEach(file => cpSync(join(root, file), join(output, file)));
adminFiles.forEach(file => cpSync(join(root, 'admin', file), join(output, 'admin', file)));
teacherFiles.forEach(file => cpSync(join(root, 'teachers', file), join(output, 'teachers', file)));
cpSync(join(root, 'pdfs'), join(output, 'pdfs'), { recursive: true });
