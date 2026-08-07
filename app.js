const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const CAMERA_ZOOM = 1.12;

const state = {
  ratio: '9:16',
  seconds: 3,
  facing: 'user',
  stream: null,
  photoBlob: null,
  resetTimer: null,
  settings: {
    title: 'Rutvi and Ronak’s Summer Soirée',
    defaultRatio: '9:16',
    resetSeconds: 60
  }
};

const frameSources = {
  '9:16': 'assets/frame-story.png?v=7',
  '16:9': 'assets/frame-wide.png?v=7'
};
const CLOUDINARY_CLOUD_NAME = 'xfk1ojbe';
const CLOUDINARY_UPLOAD_PRESET = 'summer-soiree';
const frameImages = {};
for (const [ratio, src] of Object.entries(frameSources)) {
  const img = new Image();
  img.decoding = 'sync';
  img.src = src;
  frameImages[ratio] = img;
}

const els = {
  welcome: $('#welcome'), booth: $('#booth'), result: $('#result'),
  video: $('#video'), cameraShell: $('#cameraShell'), frameOverlay: $('#frameOverlay'),
  captureCanvas: $('#captureCanvas'), countdown: $('#countdown'), flash: $('#flash'),
  resultImage: $('#resultImage'), adminDialog: $('#adminDialog')
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('sunsetBoothSettingsV6'));
    if (saved) state.settings = { ...state.settings, ...saved };
  } catch (_) {}
  state.ratio = state.settings.defaultRatio;
  document.title = state.settings.title;
}

function saveSettings() {
  localStorage.setItem('sunsetBoothSettingsV6', JSON.stringify(state.settings));
}

function setScreen(name) {
  els.welcome.classList.toggle('hidden', name !== 'welcome');
  els.booth.classList.toggle('hidden', name !== 'booth');
  els.result.classList.toggle('hidden', name !== 'result');
}

async function startCamera() {
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: state.facing,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    els.video.srcObject = state.stream;
    await els.video.play();
  } catch (error) {
    alert('Camera access is required. Allow camera access for this website in Safari Settings.');
  }
}

function applyRatio(ratio) {
  state.ratio = ratio;
  $$('.format-btn').forEach((button) => button.classList.toggle('active', button.dataset.ratio === ratio));
  els.cameraShell.classList.toggle('ratio-9-16', ratio === '9:16');
  els.cameraShell.classList.toggle('ratio-16-9', ratio === '16:9');
  els.frameOverlay.src = frameSources[ratio];
}

async function countdownAndCapture() {
  $('#captureBtn').disabled = true;
  for (let n = state.seconds; n > 0; n -= 1) {
    els.countdown.textContent = n;
    els.countdown.classList.remove('hidden');
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  els.countdown.classList.add('hidden');
  els.flash.classList.remove('on');
  void els.flash.offsetWidth;
  els.flash.classList.add('on');
  await new Promise((resolve) => setTimeout(resolve, 120));
  capture();
  $('#captureBtn').disabled = false;
}

function capture() {
  const video = els.video;
  const outputWidth = state.ratio === '9:16' ? 1440 : 2560;
  const outputHeight = state.ratio === '9:16' ? 2560 : 1440;
  const canvas = els.captureCanvas;
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const targetRatio = outputWidth / outputHeight;
  let sx = 0, sy = 0, sw = videoWidth, sh = videoHeight;

  if (videoWidth / videoHeight > targetRatio) {
    sw = videoHeight * targetRatio;
    sx = (videoWidth - sw) / 2;
  } else {
    sh = videoWidth / targetRatio;
    sy = (videoHeight - sh) / 2;
  }
const zoomedWidth = sw / CAMERA_ZOOM;
const zoomedHeight = sh / CAMERA_ZOOM;

sx += (sw - zoomedWidth) / 2;
sy += (sh - zoomedHeight) / 2;
sw = zoomedWidth;
sh = zoomedHeight;
  ctx.save();
  if (state.facing === 'user') {
    ctx.translate(outputWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  ctx.restore();

  const frame = frameImages[state.ratio];
  if (frame.complete && frame.naturalWidth) {
    ctx.drawImage(frame, 0, 0, outputWidth, outputHeight);
  }

  canvas.toBlob((blob) => {
    state.photoBlob = blob;
    els.resultImage.src = URL.createObjectURL(blob);
    setScreen('result');
    scheduleReset();
  }, 'image/jpeg', 1);
}

function scheduleReset() {
  clearTimeout(state.resetTimer);
  if (state.settings.resetSeconds > 0) {
    state.resetTimer = setTimeout(done, state.settings.resetSeconds * 1000);
  }
}

function done() {
  clearTimeout(state.resetTimer);
  state.photoBlob = null;
  els.resultImage.removeAttribute('src');
  setScreen('booth');
}

async function sharePhoto() {
  if (!state.photoBlob) return;
  const file = new File([state.photoBlob], 'rutvi-ronak-summer-soiree.jpg', { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: state.settings.title, text: 'Photo from Rutvi and Ronak’s Summer Soirée' });
  } else {
    downloadPhoto();
  }
}

function downloadPhoto() {
  if (!state.photoBlob) return;
  const url = URL.createObjectURL(state.photoBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rutvi-ronak-summer-soiree.jpg';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function uploadPhotoForQr() {
  if (!state.photoBlob) {
    throw new Error('No photo is available.');
  }

  const formData = new FormData();
  formData.append('file', state.photoBlob, 'rutvi-ronak-summer-soiree.jpg');
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Upload failed: ${message}`);
  }

  const result = await response.json();

  if (!result.secure_url) {
    throw new Error('Cloudinary did not return a photo URL.');
  }

  return result.secure_url;
}

async function showQrCode() {
  if (!state.photoBlob) return;

  const dialog = $('#qrDialog');
  const status = $('#qrStatus');
  const qrContainer = $('#qrcode');
  const qrButton = $('#qrBtn');

  qrButton.disabled = true;
  qrContainer.innerHTML = '';
  status.textContent = 'Uploading your photo…';
  dialog.showModal();

  try {
    const photoUrl = await uploadPhotoForQr();

    status.textContent = 'Scan this code with your phone';

    new QRCode(qrContainer, {
      text: photoUrl,
      width: 240,
      height: 240,
      colorDark: '#24132d',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (error) {
    console.error(error);
    status.textContent = 'Unable to create the QR code. Please use Share or AirDrop.';
  } finally {
    qrButton.disabled = false;
  }
}
let logoTaps = 0;
let tapTimer;
$('#logoTapTarget').addEventListener('click', (event) => {
  if (event.target.id === 'startBtn') return;
  logoTaps += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => { logoTaps = 0; }, 1200);
  if (logoTaps >= 5) {
    logoTaps = 0;
    openAdmin();
  }
});

function openAdmin() {
  const pin = prompt('Admin PIN');
  if (pin !== '2468') return;
  $('#eventTitleInput').value = state.settings.title;
  $('#defaultRatioInput').value = state.settings.defaultRatio;
  $('#resetSecondsInput').value = String(state.settings.resetSeconds);
  els.adminDialog.showModal();
}

$('#saveAdminBtn').addEventListener('click', () => {
  state.settings.title = $('#eventTitleInput').value.trim() || 'Rutvi and Ronak’s Summer Soirée';
  state.settings.defaultRatio = $('#defaultRatioInput').value;
  state.settings.resetSeconds = Number($('#resetSecondsInput').value);
  saveSettings();
  applyRatio(state.settings.defaultRatio);
});

$('#startBtn').addEventListener('click', async () => {
  setScreen('booth');
  applyRatio(state.ratio);
  await startCamera();
});
$('#backBtn').addEventListener('click', () => setScreen('welcome'));
$('#cameraFlipBtn').addEventListener('click', async () => {
  state.facing = state.facing === 'user' ? 'environment' : 'user';
  await startCamera();
});
$$('.format-btn').forEach((button) => button.addEventListener('click', () => applyRatio(button.dataset.ratio)));
$$('.timer-btn').forEach((button) => button.addEventListener('click', () => {
  state.seconds = Number(button.dataset.seconds);
  $$('.timer-btn').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
}));
$('#captureBtn').addEventListener('click', countdownAndCapture);
$('#shareBtn').addEventListener('click', sharePhoto);f
$('#airdropBtn').addEventListener('click', sharePhoto);
$('#qrBtn').addEventListener('click', showQrCode);

$('#closeQrBtn').addEventListener('click', () => {
  $('#qrDialog').close();
  $('#qrcode').innerHTML = '';
});
$('#retakeBtn').addEventListener('click', done);
$('#retakeTopBtn').addEventListener('click', done);
$('#doneBtn').addEventListener('click', done);

loadSettings();
applyRatio(state.ratio);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=8').catch(() => {});
