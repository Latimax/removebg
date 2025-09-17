// Helper
const $ = (q) => document.querySelector(q);

// Elements
const frm = $('#frm');
const btn = $('#btn');
const btnText = btn?.querySelector('.btn-text');
const spinner = btn?.querySelector('.spinner');
const imgInput = $('#img');
const alertBox = $('#alert');
const drop = $('#drop');
const previewOriginal = $('#preview-original');
const previewRemoved = $('#preview-removed');
const tabOriginal = $('#tab-original');
const tabRemoved = $('#tab-removed');
const panelOriginal = $('#panel-original');
const panelRemoved = $('#panel-removed');
const downloadLink = $('#download');

let originalURL = '';
let removedDataURL = '';

// Accessible toast/alert
function showAlert(type = 'info', message = '') {
  alertBox.className = `alert ${type}`; // replaces classes
  alertBox.textContent = message;
  alertBox.style.display = 'block';
  if (type !== 'loading') {
    // auto-hide after 4s for non-loading states
    setTimeout(() => {
      alertBox.style.display = 'none';
    }, 4000);
  }
}

function setLoading(isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('loading', isLoading);
  spinner.style.display = isLoading ? 'inline-block' : 'none';
  btnText.textContent = isLoading ? 'Removing…' : 'Remove Background';
}

function enableDownload(dataURL) {
  if (!dataURL) return;
  downloadLink.href = dataURL;
  downloadLink.setAttribute('download', 'removed-background.png');
  downloadLink.classList.add('ready');
  downloadLink.setAttribute('aria-disabled', 'false');
}

function disableDownload() {
  downloadLink.href = '#';
  downloadLink.classList.remove('ready');
  downloadLink.setAttribute('aria-disabled', 'true');
}

// Image selection / preview
function setOriginalPreview(file) {
  const url = URL.createObjectURL(file);
  originalURL = url;
  previewOriginal.src = url;
  // Also mirror in the drop preview
  $('#displayImage').src = url;
  btn.disabled = false;
  tabOriginal.click();
  disableDownload();
}

imgInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const valid = ['image/jpeg', 'image/png'];
  if (!valid.includes(file.type)) {
    showAlert('danger', 'Please upload a valid PNG or JPG.');
    imgInput.value = '';
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    showAlert('danger', 'Image size should be less than 3MB.');
    imgInput.value = '';
    return;
  }

  setOriginalPreview(file);
});

// Drag & drop
['dragenter', 'dragover'].forEach(evt => drop.addEventListener(evt, (e) => {
  e.preventDefault(); e.stopPropagation();
  drop.classList.add('drag');
}));
['dragleave', 'drop'].forEach(evt => drop.addEventListener(evt, (e) => {
  e.preventDefault(); e.stopPropagation();
  drop.classList.remove('drag');
}));

drop.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  imgInput.files = e.dataTransfer.files; // sync
  imgInput.dispatchEvent(new Event('change'));
});

drop.addEventListener('click', () => imgInput.click());

// Tabs switching
function activateTab(which) {
  if (which === 'original') {
    tabOriginal.classList.add('active');
    tabOriginal.setAttribute('aria-selected', 'true');
    panelOriginal.classList.add('show');

    tabRemoved.classList.remove('active');
    tabRemoved.setAttribute('aria-selected', 'false');
    panelRemoved.classList.remove('show');
  } else {
    tabRemoved.classList.add('active');
    tabRemoved.setAttribute('aria-selected', 'true');
    panelRemoved.classList.add('show');

    tabOriginal.classList.remove('active');
    tabOriginal.setAttribute('aria-selected', 'false');
    panelOriginal.classList.remove('show');
  }
}

tabOriginal.addEventListener('click', () => activateTab('original'));
tabRemoved.addEventListener('click', () => activateTab('removed'));

// Client-side compression (kept from your version, simplified)
async function compressImg(file) {
  const dataURL = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve) => {
    const _img = new Image();
    _img.onload = () => resolve(_img);
    _img.src = dataURL;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let { width, height } = img;
  const aspect = width / height;

  const maxW = 800, maxH = 600;
  if (width > maxW || height > maxH) {
    if (width / maxW > height / maxH) {
      width = maxW; height = Math.round(maxW / aspect);
    } else {
      height = maxH; width = Math.round(maxH * aspect);
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, 0.9));
  // Name the blob so PHP gets a filename
  return new File([blob], 'upload.' + (file.type === 'image/png' ? 'png' : 'jpg'), { type: file.type });
}

// Submit
frm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!imgInput.files?.[0]) {
    showAlert('warning', 'Please upload an image first.');
    return;
  }

  setLoading(true);
  showAlert('loading', 'Processing your image…');

  try {
    const compressed = await compressImg(imgInput.files[0]);
    const formData = new FormData();
    formData.append('action', 'remove_bg');
    formData.append('compress', compressed, compressed.name);

    const res = await fetch('process.php', { method: 'POST', body: formData });
    const json = await res.json();

    if (json.status === 'success' && json.output) {
      removedDataURL = json.output;
      previewRemoved.src = removedDataURL;
      tabRemoved.disabled = false;
      activateTab('removed');
      enableDownload(removedDataURL);
      showAlert('success', 'Background removed successfully.');
    } else {
      tabRemoved.disabled = true;
      disableDownload();
      showAlert('danger', json.msg || 'Something went wrong.');
    }
  } catch (err) {
    tabRemoved.disabled = true;
    disableDownload();
    showAlert('danger', 'Network or server error. Please try again.'+ err.message);
  } finally {
    setLoading(false);
  }
});

// Initialize visuals
(function init() {
  $('#displayImage').src = 'upload.png';
  spinner.style.display = 'none';
})();