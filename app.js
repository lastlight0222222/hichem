
const pdfFrame = document.getElementById('pdfFrame');
const viewerTitle = document.getElementById('viewerTitle');
const previewSection = document.querySelector('.preview-section');

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-pdf]');
  if (!button) return;

  const pdfName = button.getAttribute('data-pdf');
  const title = button.getAttribute('data-title');
  if (pdfFrame && pdfName) {
    pdfFrame.src = pdfName;
  }
  if (viewerTitle) {
    viewerTitle.textContent = title || 'PDF';
  }
  if (previewSection) {
    window.scrollTo({ top: previewSection.offsetTop - 20, behavior: 'smooth' });
  }
});
