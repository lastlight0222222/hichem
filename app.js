
const pdfFrame = document.getElementById('pdfFrame');
const viewerTitle = document.getElementById('viewerTitle');

const buttons = document.querySelectorAll('[data-pdf]');
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const pdfName = button.getAttribute('data-pdf');
    const title = button.getAttribute('data-title');
    if (pdfFrame) {
      pdfFrame.src = pdfName;
    }
    if (viewerTitle) {
      viewerTitle.textContent = title || 'PDF';
    }
    window.scrollTo({ top: document.querySelector('.preview-section').offsetTop - 20, behavior: 'smooth' });
  });
});
