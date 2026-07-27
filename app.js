const films = {
  mono: { name: '银盐 100', code: 'MONO 100', recommendation: '明暗层次清晰，推荐银盐 100' },
  harbor: { name: '港夜 800', code: 'HARBOR 800', recommendation: '高光与暗部强烈，推荐港夜 800' },
  sunset: { name: '暖日 200', code: 'GOLDEN 200', recommendation: '柔和暮色，推荐暖日 200' },
  fuji: { name: '青野 400', code: 'FIELD 400', recommendation: '绿色与肤色较多，推荐青野 400' },
  expired: { name: '过期 98', code: 'EXPIRED 98', recommendation: '低饱和画面，推荐过期 98' },
  daily: { name: '日常 160', code: 'DAILY 160', recommendation: '光线均匀，推荐日常 160' }
};

const captions = ['光落下来的时候', '今天也值得留一张', '风从画面里经过', '慢一点，记住此刻', '生活偶尔会发光', '这一秒没有重来'];
const cameraApp = document.querySelector('#cameraApp');
const stage = document.querySelector('.camera-stage');
const video = document.querySelector('#cameraFeed');
const previewCanvas = document.querySelector('#previewCanvas');
const captureCanvas = document.querySelector('#captureCanvas');
const exportCanvas = document.querySelector('#exportCanvas');
const demoScene = document.querySelector('#demoScene');
const permissionSheet = document.querySelector('#permissionSheet');
const sheetBackdrop = document.querySelector('#sheetBackdrop');
const dynamicIsland = document.querySelector('#dynamicIsland');
const tinyPhoto = document.querySelector('#tinyPhoto');
const islandTitle = document.querySelector('#islandTitle');
const islandMeta = document.querySelector('#islandMeta');
const islandPreviewCanvas = document.querySelector('#islandPreviewCanvas');
const islandPreviewFilm = document.querySelector('#islandPreviewFilm');
const islandPreviewFocal = document.querySelector('#islandPreviewFocal');
const developIslandThumb = document.querySelector('#developIslandThumb');
const developIslandTitle = document.querySelector('#developIslandTitle');
const developIslandMeta = document.querySelector('#developIslandMeta');
const developmentLayer = document.querySelector('#developmentLayer');
const developingPhoto = document.querySelector('#developingPhoto');
const developingImage = document.querySelector('#developingImage');
const developProgress = document.querySelector('#developProgress');
const developLabel = document.querySelector('#developLabel');
const developActions = document.querySelector('#developActions');
const photoCaption = document.querySelector('#photoCaption');
const photoDate = document.querySelector('#photoDate');
const filmStamp = document.querySelector('#filmStamp');
const shutterFlash = document.querySelector('#shutterFlash');
const focusReticle = document.querySelector('#focusReticle');
const uploadInput = document.querySelector('#photoUpload');
const galleryLayer = document.querySelector('#galleryLayer');
const galleryStack = document.querySelector('#galleryStack');
const galleryCount = document.querySelector('#galleryCount');
const galleryThumb = document.querySelector('#galleryThumb');
const aboutLayer = document.querySelector('#aboutLayer');
const recommendation = document.querySelector('#recommendation');

let stream = null;
let facingMode = 'environment';
let currentFilm = 'sunset';
let currentImage = '';
let currentCaption = '';
let uploadedImage = null;
let developing = false;
let developValue = 0;
let developFrame = null;
let lastFrameTime = 0;
let rubbing = false;
let exposure = 0;
let currentFocal = 1;
let currentZoom = 1.15;
let zoomSettleTimer = null;
let islandPreviewFrame = null;
let islandPointerId = null;
let islandStartY = 0;
let islandDragDistance = 0;
let islandWasExpanded = false;
let gallery = loadGallery();

stage.dataset.film = currentFilm;
stage.classList.add('environment');
setTimeout(() => openPermission(), 500);
renderGallery();
requestAnimationFrame(() => selectFilm(currentFilm));

function openPermission() {
  permissionSheet.classList.add('active');
  sheetBackdrop.classList.add('active');
}

function closePermission() {
  permissionSheet.classList.remove('active');
  sheetBackdrop.classList.remove('active');
}

async function startCamera() {
  closePermission();
  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 1920 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    video.classList.add('ready');
    previewCanvas.style.display = 'none';
    uploadedImage = null;
    document.querySelector('#cameraStatus').textContent = facingMode === 'environment' ? '后置镜头' : '前置镜头';
  } catch (error) {
    useDemoMode();
    document.querySelector('#cameraStatus').textContent = '相机不可用 · 演示样片';
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  video.classList.remove('ready');
}

function useDemoMode() {
  closePermission();
  stopCamera();
  previewCanvas.style.display = 'none';
  uploadedImage = null;
  document.querySelector('#cameraStatus').textContent = '演示样片';
  updateRecommendation('sunset');
}

function filterCss(film) {
  const filters = {
    mono: 'grayscale(1) contrast(1.17) brightness(.94)',
    harbor: 'contrast(1.18) saturate(1.3) hue-rotate(165deg) brightness(.89)',
    sunset: 'sepia(.22) saturate(1.18) contrast(1.06) brightness(1.02)',
    fuji: 'saturate(.82) contrast(.95) hue-rotate(345deg) brightness(1.04)',
    expired: 'sepia(.25) saturate(.86) contrast(.9) hue-rotate(315deg) brightness(1.08)',
    daily: 'saturate(.94) contrast(1.02) brightness(1.03)'
  };
  return `${filters[film]} brightness(${1 + exposure})`;
}

function selectFilm(film) {
  currentFilm = film;
  stage.dataset.film = film;
  previewCanvas.style.filter = filterCss(film);
  document.querySelectorAll('.film-chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.film === film));
  recommendation.textContent = films[film].recommendation;
  islandPreviewFilm.textContent = films[film].name;
  islandPreviewCanvas.style.filter = filterCss(film);
  const chip = document.querySelector(`.film-chip[data-film="${film}"]`);
  chip?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
}

function setFocal(value) {
  const focalScales = { 0.5: 1, 1: 1.15, 2: 1.66, 3: 2.28 };
  const nextFocal = Number(value);
  const targetZoom = focalScales[nextFocal] || focalScales[1];
  const direction = targetZoom >= currentZoom ? 1 : -1;
  currentFocal = nextFocal;
  currentZoom = targetZoom;
  clearTimeout(zoomSettleTimer);
  stage.style.setProperty('--zoom-scale', String(targetZoom * (direction > 0 ? 1.035 : .985)));
  zoomSettleTimer = setTimeout(() => stage.style.setProperty('--zoom-scale', String(targetZoom)), 430);
  document.querySelectorAll('[data-focal]').forEach((button) => button.classList.toggle('active', Number(button.dataset.focal) === nextFocal));
  islandPreviewFocal.textContent = `${nextFocal}×`;
}

function renderIslandPreview() {
  if (!dynamicIsland.classList.contains('expanded')) return;
  const width = 636;
  const height = 352;
  if (islandPreviewCanvas.width !== width) islandPreviewCanvas.width = width;
  if (islandPreviewCanvas.height !== height) islandPreviewCanvas.height = height;
  const ctx = islandPreviewCanvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(currentZoom, currentZoom);
  ctx.translate(-width / 2, -height / 2);
  if (uploadedImage) drawCover(ctx, uploadedImage, uploadedImage.naturalWidth, uploadedImage.naturalHeight, width, height);
  else if (stream && video.videoWidth) drawCover(ctx, video, video.videoWidth, video.videoHeight, width, height, facingMode === 'user');
  else drawDemo(ctx, width, height);
  ctx.restore();
  islandPreviewFrame = requestAnimationFrame(renderIslandPreview);
}

function openIslandPreview() {
  if (developing || dynamicIsland.classList.contains('working')) return;
  dynamicIsland.classList.add('expanded');
  stage.classList.add('island-open');
  dynamicIsland.classList.remove('dragging');
  dynamicIsland.style.width = '';
  dynamicIsland.style.height = '';
  cancelAnimationFrame(islandPreviewFrame);
  renderIslandPreview();
}

function closeIslandPreview() {
  dynamicIsland.classList.remove('expanded', 'dragging');
  stage.classList.remove('island-open');
  dynamicIsland.style.width = '';
  dynamicIsland.style.height = '';
  cancelAnimationFrame(islandPreviewFrame);
}

function beginIslandDrag(event) {
  if (developing || dynamicIsland.classList.contains('working')) return;
  islandPointerId = event.pointerId;
  islandStartY = event.clientY;
  islandDragDistance = 0;
  islandWasExpanded = dynamicIsland.classList.contains('expanded');
  dynamicIsland.classList.add('dragging');
  event.stopPropagation();
}

function moveIslandDrag(event) {
  if (event.pointerId !== islandPointerId) return;
  islandDragDistance = event.clientY - islandStartY;
  if (islandWasExpanded) return;
  const progress = Math.max(0, Math.min(1, islandDragDistance / 115));
  const targetWidth = Math.min(330, window.innerWidth - 36);
  dynamicIsland.style.width = `${118 + (targetWidth - 118) * progress}px`;
  dynamicIsland.style.height = `${34 + 154 * progress}px`;
  dynamicIsland.style.borderRadius = `${24 + 5 * progress}px`;
  if (progress > .18) dynamicIsland.classList.add('expanded');
  event.preventDefault();
}

function endIslandDrag(event) {
  if (event.pointerId !== islandPointerId) return;
  islandDragDistance = event.clientY - islandStartY;
  if (islandWasExpanded && islandDragDistance < -34) closeIslandPreview();
  else if (!islandWasExpanded && islandDragDistance > 42) openIslandPreview();
  else if (islandWasExpanded) openIslandPreview();
  else closeIslandPreview();
  islandPointerId = null;
}

function updateRecommendation(film) {
  recommendation.textContent = films[film].recommendation;
  document.querySelector('#applyRecommendation').dataset.recommendedFilm = film;
}

function focusAt(event) {
  if (event.target.closest('button,label,.film-dock,.camera-controls,.camera-header,.scene-reading')) return;
  const rect = stage.getBoundingClientRect();
  focusReticle.style.left = `${event.clientX - rect.left}px`;
  focusReticle.style.top = `${event.clientY - rect.top}px`;
  focusReticle.classList.remove('focusing');
  void focusReticle.offsetWidth;
  focusReticle.classList.add('focusing');
}

function drawCover(ctx, source, sourceWidth, sourceHeight, targetWidth, targetHeight, mirrored = false) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) { sw = sourceHeight * targetRatio; sx = (sourceWidth - sw) / 2; }
  else { sh = sourceWidth / targetRatio; sy = (sourceHeight - sh) / 2; }
  ctx.save();
  if (mirrored) { ctx.translate(targetWidth, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  ctx.restore();
}

function drawDemo(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#73879e'); sky.addColorStop(.54, '#e5b07d'); sky.addColorStop(1, '#24434a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffe1a0'; ctx.beginPath(); ctx.arc(width * .76, height * .34, width * .13, 0, Math.PI * 2); ctx.fill();
  const buildings = [[-.02,.54,.24,.23],[.18,.4,.17,.38],[.33,.49,.25,.29],[.56,.31,.18,.47],[.72,.44,.3,.34]];
  ctx.fillStyle = '#27302e'; buildings.forEach(([x,y,w,h]) => ctx.fillRect(x*width,y*height,w*width,h*height));
  ctx.fillStyle = 'rgba(255,216,151,.72)';
  for (let i=0;i<14;i++) ctx.fillRect((.1 + ((i*37)%83)/100)*width, (.47 + ((i*19)%23)/100)*height, width*.012, height*.006);
  ctx.fillStyle = '#345d64'; ctx.fillRect(0,height*.78,width,height*.22);
  ctx.fillStyle = 'rgba(255,224,170,.32)'; ctx.fillRect(width*.13,height*.82,width*.68,3); ctx.fillRect(width*.31,height*.87,width*.5,2);
}

function clamp(value) { return Math.max(0, Math.min(255, value)); }

function processFilm(ctx, width, height, film) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    if (film === 'mono') {
      const y = r * .3 + g * .59 + b * .11; r = g = b = (y - 128) * 1.16 + 128;
    } else if (film === 'harbor') {
      r = (r - 118) * 1.14 + 126 + 10; g = (g - 128) * 1.05 + 120; b = (b - 120) * 1.2 + 137;
    } else if (film === 'sunset') {
      r = r * 1.08 + 10; g = g * 1.015 + 2; b = b * .88 - 3;
    } else if (film === 'fuji') {
      r = r * .96 + 4; g = g * 1.03 + 8; b = b * 1.01 + 4;
    } else if (film === 'expired') {
      r = r * .89 + 23; g = g * .79 + 25; b = b * .93 + 17;
    } else {
      r = (r - 128) * 1.03 + 130; g = (g - 128) * 1.02 + 129; b = (b - 128) * 1.01 + 128;
    }
    const noise = (Math.random() - .5) * (film === 'expired' ? 12 : 6);
    data[i] = clamp(r + noise); data[i + 1] = clamp(g + noise); data[i + 2] = clamp(b + noise);
  }
  ctx.putImageData(image, 0, 0);
  const vignette = ctx.createRadialGradient(width/2,height*.46,width*.13,width/2,height*.5,width*.72);
  vignette.addColorStop(.45,'rgba(0,0,0,0)'); vignette.addColorStop(1,film === 'expired' ? 'rgba(92,48,70,.24)' : 'rgba(0,0,0,.27)');
  ctx.fillStyle = vignette; ctx.fillRect(0,0,width,height);
  if (film === 'expired') {
    const leak = ctx.createLinearGradient(0,0,width*.36,0); leak.addColorStop(0,'rgba(255,79,42,.32)'); leak.addColorStop(1,'rgba(255,79,42,0)');
    ctx.fillStyle = leak; ctx.fillRect(0,0,width*.42,height);
  }
}

function captureFrame() {
  const width = 900;
  const height = 1020;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext('2d', { willReadFrequently: true });
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(currentZoom, currentZoom);
  ctx.translate(-width / 2, -height / 2);
  if (uploadedImage) drawCover(ctx, uploadedImage, uploadedImage.naturalWidth, uploadedImage.naturalHeight, width, height);
  else if (stream && video.videoWidth) drawCover(ctx, video, video.videoWidth, video.videoHeight, width, height, facingMode === 'user');
  else drawDemo(ctx, width, height);
  ctx.restore();
  if (exposure !== 0) {
    ctx.globalCompositeOperation = exposure > 0 ? 'screen' : 'multiply';
    ctx.fillStyle = exposure > 0 ? `rgba(255,255,255,${exposure})` : `rgba(30,24,18,${Math.abs(exposure)})`;
    ctx.fillRect(0,0,width,height); ctx.globalCompositeOperation = 'source-over';
  }
  processFilm(ctx, width, height, currentFilm);
  return captureCanvas.toDataURL('image/jpeg', .88);
}

function takePhoto() {
  if (developing) return;
  closeIslandPreview();
  dynamicIsland.classList.remove('working');
  dynamicIsland.classList.add('collapse-capture');
  shutterFlash.classList.remove('fire'); void shutterFlash.offsetWidth; shutterFlash.classList.add('fire');
  currentImage = captureFrame();
  currentCaption = captions[Math.floor(Math.random() * captions.length)];
  tinyPhoto.style.backgroundImage = `url(${currentImage})`;
  developIslandThumb.style.backgroundImage = `url(${currentImage})`;
  islandTitle.textContent = '正在感光';
  islandMeta.textContent = `${films[currentFilm].code} · ${String(gallery.length + 1).padStart(2,'0')}`;
  developIslandTitle.textContent = '正在显影';
  developIslandMeta.textContent = `${films[currentFilm].code} · ${String(gallery.length + 1).padStart(2,'0')}`;
  if (navigator.vibrate) navigator.vibrate(35);
  setTimeout(() => {
    dynamicIsland.classList.remove('collapse-capture');
    dynamicIsland.classList.add('working');
  }, 360);
  setTimeout(beginDevelopment, 920);
}

function beginDevelopment() {
  developing = true;
  developValue = 0;
  lastFrameTime = performance.now();
  developingImage.src = currentImage;
  photoCaption.textContent = currentCaption;
  photoDate.textContent = new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',year:'numeric'}).format(new Date()).toUpperCase();
  filmStamp.textContent = films[currentFilm].name;
  developmentLayer.classList.add('active');
  developmentLayer.setAttribute('aria-hidden','false');
  developActions.classList.remove('ready');
  updateDevelopment(0);
  developFrame = requestAnimationFrame(developmentTick);
}

function developmentTick(now) {
  if (!developing) return;
  const delta = Math.min(now - lastFrameTime, 80);
  lastFrameTime = now;
  developValue = Math.min(1, developValue + delta / 9200);
  updateDevelopment(developValue);
  if (developValue < 1) developFrame = requestAnimationFrame(developmentTick);
  else finishDevelopment();
}

function updateDevelopment(value) {
  const percent = Math.round(value * 100);
  developmentLayer.style.setProperty('--progress', percent);
  developProgress.style.opacity = value > .98 ? '0' : '1';
  developLabel.textContent = value >= 1 ? '显影完成' : `正在显影 · ${percent}%`;
  developingImage.style.opacity = String(.04 + value * .96);
  developingImage.style.filter = `blur(${18 * (1 - value)}px) saturate(${.2 + value * .82}) contrast(${.55 + value * .5}) brightness(${1.4 - value * .4})`;
  developingImage.style.transform = `scale(${1.08 - value * .08})`;
  document.querySelector('.chemical-clouds').style.opacity = String(1 - value * .96);
  if (value > .72) islandTitle.textContent = '快要看见了';
  if (value > .72) developIslandTitle.textContent = '快要看见了';
}

function finishDevelopment() {
  developValue = 1;
  updateDevelopment(1);
  islandTitle.textContent = '显影完成';
  developIslandTitle.textContent = '显影完成';
  developActions.classList.add('ready');
  if (navigator.vibrate) navigator.vibrate([24,40,24]);
}

function rubDevelopment(event) {
  if (!rubbing || !developing || developValue >= 1) return;
  event.preventDefault();
  developValue = Math.min(1, developValue + .013);
  updateDevelopment(developValue);
  if (developValue >= 1) { cancelAnimationFrame(developFrame); finishDevelopment(); }
}

function resetDevelopment() {
  developing = false;
  rubbing = false;
  cancelAnimationFrame(developFrame);
  developmentLayer.classList.remove('active');
  developmentLayer.setAttribute('aria-hidden','true');
  dynamicIsland.classList.remove('working', 'collapse-capture');
  developingPhoto.style.transform = '';
  developActions.classList.remove('ready');
}

function loadGallery() {
  try { return JSON.parse(localStorage.getItem('island-film-gallery') || '[]'); }
  catch { return []; }
}

function persistGallery() {
  localStorage.setItem('island-film-gallery', JSON.stringify(gallery.slice(0, 8)));
}

function savePhoto() {
  gallery.unshift({ id: Date.now(), image: currentImage, caption: currentCaption, film: currentFilm, date: new Date().toISOString() });
  gallery = gallery.slice(0, 8);
  persistGallery(); renderGallery(); resetDevelopment(); openGallery();
}

function renderGallery() {
  galleryCount.textContent = gallery.length;
  galleryThumb.style.backgroundImage = gallery[0] ? `url(${gallery[0].image})` : '';
  if (!gallery.length) {
    galleryStack.innerHTML = '<div class="empty-gallery"><span>◇</span><strong>第一张相纸，还在等你</strong><small>回到相机按下快门，它会从灵动岛慢慢出现。</small></div>';
    return;
  }
  galleryStack.innerHTML = gallery.map((photo,index) => {
    const date = new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit'}).format(new Date(photo.date));
    const angle = index % 2 === 0 ? '-1.2deg' : '1.4deg';
    return `<article class="gallery-card" style="--angle:${angle}"><img src="${photo.image}" alt="${photo.caption}" /><div><strong>${photo.caption}</strong><small>${date} · ${films[photo.film]?.name || '等光来'}</small></div><button type="button" data-download="${photo.id}">下载这张相纸</button></article>`;
  }).join('');
}

function openGallery() { galleryLayer.classList.add('active'); galleryLayer.setAttribute('aria-hidden','false'); }
function closeGallery() { galleryLayer.classList.remove('active'); galleryLayer.setAttribute('aria-hidden','true'); }

function exportPolaroid(photo) {
  const image = new Image();
  image.onload = () => {
    const width = 1080, height = 1440, pad = 58;
    exportCanvas.width = width; exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(0,0,width,height);
    drawCover(ctx,image,image.naturalWidth,image.naturalHeight,width-pad*2,1085,false);
    const snapshot = ctx.getImageData(0,0,width-pad*2,1085);
    ctx.clearRect(0,0,width,height); ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,width,height);ctx.putImageData(snapshot,pad,pad);
    ctx.fillStyle='#24231e';ctx.font='38px serif';ctx.fillText(photo.caption,pad,height-170);
    ctx.fillStyle='#777267';ctx.font='20px sans-serif';ctx.fillText(new Date(photo.date).toLocaleDateString('zh-CN'),pad,height-115);
    ctx.textAlign='right';ctx.fillText(films[photo.film]?.name || '等光来',width-pad,height-115);
    const link=document.createElement('a');link.download=`等光来-${photo.id}.jpg`;link.href=exportCanvas.toDataURL('image/jpeg',.94);link.click();
  };
  image.src=photo.image;
}

function handleUpload(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    uploadedImage = image;
    stopCamera();
    previewCanvas.width = 720; previewCanvas.height = 1280;
    drawCover(previewCanvas.getContext('2d'), image, image.naturalWidth, image.naturalHeight, previewCanvas.width, previewCanvas.height);
    previewCanvas.style.display = 'block'; previewCanvas.style.filter = filterCss(currentFilm);
    document.querySelector('#cameraStatus').textContent = '相册照片';
    updateRecommendation(guessFilm(image));
    URL.revokeObjectURL(url);
  };
  image.src = url;
}

function guessFilm(image) {
  const probe = document.createElement('canvas'); probe.width=12; probe.height=12;
  const ctx=probe.getContext('2d');drawCover(ctx,image,image.naturalWidth,image.naturalHeight,12,12);
  const data=ctx.getImageData(0,0,12,12).data;let r=0,g=0,b=0;
  for(let i=0;i<data.length;i+=4){r+=data[i];g+=data[i+1];b+=data[i+2];}
  const count=data.length/4;r/=count;g/=count;b/=count;const light=(r+g+b)/3;
  if(light<85)return 'harbor';if(Math.max(r,g,b)-Math.min(r,g,b)<15)return 'mono';if(g>r*1.08)return 'fuji';if(r>b*1.14)return 'sunset';return 'daily';
}

async function flipCamera() {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  stage.classList.toggle('environment', facingMode === 'environment');
  if (stream) await startCamera();
}

document.querySelectorAll('.film-chip').forEach((chip) => chip.addEventListener('click', () => selectFilm(chip.dataset.film)));
document.querySelectorAll('[data-focal]').forEach((button) => button.addEventListener('click', () => setFocal(button.dataset.focal)));
document.querySelector('#applyRecommendation').addEventListener('click', (event) => selectFilm(event.currentTarget.dataset.recommendedFilm || 'sunset'));
document.querySelector('#shutterButton').addEventListener('click', takePhoto);
stage.addEventListener('pointerdown', focusAt);
dynamicIsland.addEventListener('pointerdown', beginIslandDrag);
window.addEventListener('pointermove', moveIslandDrag, { passive: false });
window.addEventListener('pointerup', endIslandDrag);
window.addEventListener('pointercancel', endIslandDrag);
dynamicIsland.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    dynamicIsland.classList.contains('expanded') ? closeIslandPreview() : openIslandPreview();
  }
  if (event.key === 'ArrowUp' || event.key === 'Escape') closeIslandPreview();
});
uploadInput.addEventListener('change', () => handleUpload(uploadInput.files[0]));

developingPhoto.addEventListener('pointerdown', (event) => { rubbing = true; developingPhoto.setPointerCapture?.(event.pointerId); });
developingPhoto.addEventListener('pointermove', rubDevelopment);
developingPhoto.addEventListener('pointerup', () => { rubbing = false; });
developingPhoto.addEventListener('pointercancel', () => { rubbing = false; });

galleryStack.addEventListener('click', (event) => {
  const button = event.target.closest('[data-download]'); if (!button) return;
  const photo = gallery.find((item) => item.id === Number(button.dataset.download)); if (photo) exportPolaroid(photo);
});

document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', async () => {
  const action = button.dataset.action;
  if (action === 'enable-camera') await startCamera();
  if (action === 'demo') useDemoMode();
  if (action === 'flip') await flipCamera();
  if (action === 'gallery') openGallery();
  if (action === 'close-gallery') closeGallery();
  if (action === 'about') { aboutLayer.classList.add('active'); aboutLayer.setAttribute('aria-hidden','false'); }
  if (action === 'close-about') { aboutLayer.classList.remove('active'); aboutLayer.setAttribute('aria-hidden','true'); }
  if (action === 'retake') resetDevelopment();
  if (action === 'save' && developValue >= 1) savePhoto();
  if (action === 'exposure') {
    exposure = exposure === 0 ? .16 : exposure > 0 ? -.14 : 0;
    document.querySelector('.exposure-meter b').textContent = exposure > 0 ? '+0.7' : exposure < 0 ? '-0.7' : '0';
    previewCanvas.style.filter = filterCss(currentFilm);
    islandPreviewCanvas.style.filter = filterCss(currentFilm);
  }
  if (action === 'clear-gallery' && gallery.length && window.confirm('确定清空显影簿吗？照片删除后无法恢复。')) { gallery=[];persistGallery();renderGallery(); }
}));

sheetBackdrop.addEventListener('click', closePermission);
document.addEventListener('visibilitychange', () => { if (document.hidden && stream) stopCamera(); });
window.addEventListener('beforeunload', stopCamera);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then((registration) => registration.update())
    .catch(() => {});
}
