const $ = (id) => document.getElementById(id);
const state = { stream:null, photoBlob:null, photoDataUrl:null };
const defaults = {
  title:'Summer Sunset Party', footer:'Summer 2026 • Smile • Share', ratio:'9:16',
  framePortrait:'', frameLandscape:''
};
let settings = loadSettings();

function loadSettings(){
  try { return {...defaults, ...JSON.parse(localStorage.getItem('photoboothSettingsV2') || '{}')}; }
  catch { return {...defaults}; }
}
function saveSettings(){ localStorage.setItem('photoboothSettingsV2', JSON.stringify(settings)); }
function currentFrame(){ return settings.ratio === '9:16' ? settings.framePortrait : settings.frameLandscape; }

function applySettings(){
  $('eventTitle').textContent = settings.title;
  $('footerText').textContent = settings.footer;
  $('cameraStage').className = `camera-stage ${settings.ratio === '9:16' ? 'ratio-9-16' : 'ratio-16-9'}`;
  $('portraitBtn').classList.toggle('active', settings.ratio === '9:16');
  $('landscapeBtn').classList.toggle('active', settings.ratio === '16:9');
  const frame = currentFrame();
  $('frameOverlay').src = frame || '';
  $('frameOverlay').style.display = frame ? 'block' : 'none';
}

function chooseRatio(ratio){
  if(state.photoBlob) return;
  settings.ratio = ratio;
  saveSettings();
  applySettings();
}

async function startCamera(){
  $('cameraMessage').textContent = 'Starting camera…';
  try {
    if (state.stream) state.stream.getTracks().forEach(t=>t.stop());
    state.stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:'user', width:{ideal:1920}, height:{ideal:1080} }, audio:false
    });
    $('video').srcObject = state.stream;
    await $('video').play();
    $('cameraMessage').classList.add('hidden');
    $('captureBtn').disabled = false;
  } catch (err) {
    $('cameraMessage').textContent = 'Camera permission is required. Open in Safari over HTTPS and allow camera access.';
    console.error(err);
  }
}

function getTargetSize(){
  return settings.ratio === '9:16' ? {w:1080,h:1920} : {w:1920,h:1080};
}
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function countdownAndCapture(){
  $('captureBtn').disabled = true;
  for(const n of [3,2,1]){ $('countdown').textContent=n; await wait(700); }
  $('countdown').textContent=''; capturePhoto();
}
function coverCrop(sourceW, sourceH, targetW, targetH){
  const sr=sourceW/sourceH, tr=targetW/targetH;
  if(sr>tr){ const sw=sourceH*tr; return {sx:(sourceW-sw)/2,sy:0,sw,sh:sourceH}; }
  const sh=sourceW/tr; return {sx:0,sy:(sourceH-sh)/2,sw:sourceW,sh};
}
function capturePhoto(){
  const v=$('video'), c=$('canvas'), ctx=c.getContext('2d');
  const {w,h}=getTargetSize(); c.width=w; c.height=h;
  const crop=coverCrop(v.videoWidth,v.videoHeight,w,h);
  ctx.save(); ctx.translate(w,0); ctx.scale(-1,1);
  ctx.drawImage(v,crop.sx,crop.sy,crop.sw,crop.sh,0,0,w,h); ctx.restore();
  const finish=()=>c.toBlob(blob=>{
    state.photoBlob=blob; state.photoDataUrl=c.toDataURL('image/jpeg',.92);
    $('preview').src=state.photoDataUrl;
    $('cameraStage').classList.add('hidden'); $('capturePanel').classList.add('hidden');
    document.querySelector('.format-switch').classList.add('hidden'); $('reviewPanel').classList.remove('hidden');
    $('flash').classList.add('active'); setTimeout(()=>$('flash').classList.remove('active'),450);
  },'image/jpeg',.92);
  const frame=currentFrame();
  if(frame){ const img=new Image(); img.onload=()=>{ctx.drawImage(img,0,0,w,h);finish();}; img.onerror=finish; img.src=frame; }
  else finish();
}
function resetBooth(){
  state.photoBlob=null; state.photoDataUrl=null;
  $('reviewPanel').classList.add('hidden'); $('cameraStage').classList.remove('hidden');
  $('capturePanel').classList.remove('hidden'); document.querySelector('.format-switch').classList.remove('hidden');
  $('captureBtn').disabled=false;
}
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'photo'; }
function downloadPhoto(){ const a=document.createElement('a');a.href=state.photoDataUrl;a.download=`${slug(settings.title)}-${Date.now()}.jpg`;a.click(); }
async function sharePhoto(){
  if(!state.photoBlob) return;
  const file=new File([state.photoBlob],`${slug(settings.title)}.jpg`,{type:'image/jpeg'});
  try { if(navigator.canShare?.({files:[file]})) await navigator.share({title:settings.title,text:'My photo booth picture',files:[file]}); else downloadPhoto(); }
  catch(err){ if(err.name!=='AbortError') console.error(err); }
}
function openAdmin(){
  const pin=prompt('Enter admin PIN'); if(pin!=='2468') return;
  $('settingTitle').value=settings.title; $('settingFooter').value=settings.footer; $('settingRatio').value=settings.ratio;
  $('adminDialog').showModal();
}
async function fileToDataUrl(file){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);}); }
$('saveSettingsBtn').addEventListener('click', async (e)=>{
  e.preventDefault();
  settings.title=$('settingTitle').value||defaults.title; settings.footer=$('settingFooter').value||defaults.footer; settings.ratio=$('settingRatio').value;
  const p=$('settingFramePortrait').files[0], l=$('settingFrameLandscape').files[0];
  if(p) settings.framePortrait=await fileToDataUrl(p); if(l) settings.frameLandscape=await fileToDataUrl(l);
  saveSettings(); applySettings(); $('adminDialog').close(); resetBooth();
});
$('clearPortraitFrameBtn').addEventListener('click',()=>{settings.framePortrait='';saveSettings();applySettings();});
$('clearLandscapeFrameBtn').addEventListener('click',()=>{settings.frameLandscape='';saveSettings();applySettings();});
$('resetSettingsBtn').addEventListener('click',()=>{settings={...defaults};saveSettings();applySettings();$('adminDialog').close();resetBooth();});
$('portraitBtn').addEventListener('click',()=>chooseRatio('9:16'));
$('landscapeBtn').addEventListener('click',()=>chooseRatio('16:9'));
$('captureBtn').addEventListener('click',countdownAndCapture);
$('retakeBtn').addEventListener('click',resetBooth); $('doneBtn').addEventListener('click',resetBooth);
$('downloadBtn').addEventListener('click',downloadPhoto); $('shareBtn').addEventListener('click',sharePhoto); $('adminBtn').addEventListener('click',openAdmin);
applySettings(); startCamera();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
