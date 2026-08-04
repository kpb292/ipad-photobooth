const $ = (id) => document.getElementById(id);
const state = { stream:null, photoBlob:null, photoDataUrl:null, frameDataUrl:null };
const defaults = {
  title:'Celebrate With Us!', footer:'Tap • Smile • Share', theme:'confetti', ratio:'4:3', frame:'',
  emailPublicKey:'', emailServiceId:'', emailTemplateId:''
};
let settings = loadSettings();

function loadSettings(){
  try { return {...defaults, ...JSON.parse(localStorage.getItem('photoboothSettings') || '{}')}; }
  catch { return {...defaults}; }
}
function saveSettings(){ localStorage.setItem('photoboothSettings', JSON.stringify(settings)); }

function applySettings(){
  $('eventTitle').textContent = settings.title;
  $('footerText').textContent = settings.footer;
  $('app').className = `app theme-${settings.theme}`;
  $('cameraStage').className = 'camera-stage' + (settings.ratio==='3:4'?' ratio-3-4':settings.ratio==='1:1'?' ratio-1-1':'');
  $('frameOverlay').src = settings.frame || '';
  $('frameOverlay').style.display = settings.frame ? 'block' : 'none';
}

async function startCamera(){
  $('cameraMessage').textContent = 'Starting camera…';
  try {
    if (state.stream) state.stream.getTracks().forEach(t=>t.stop());
    state.stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:'user', width:{ideal:1920}, height:{ideal:1440} }, audio:false
    });
    $('video').srcObject = state.stream;
    await $('video').play();
    $('cameraMessage').classList.add('hidden');
    $('captureBtn').disabled = false;
  } catch (err) {
    $('cameraMessage').textContent = 'Camera permission is required. Open this page in Safari over HTTPS and allow camera access.';
    console.error(err);
  }
}

function getTargetSize(){
  const max = 1800;
  if(settings.ratio==='3:4') return {w:Math.round(max*.75), h:max};
  if(settings.ratio==='1:1') return {w:max,h:max};
  return {w:max,h:Math.round(max*.75)};
}

async function countdownAndCapture(){
  $('captureBtn').disabled = true;
  for(const n of [3,2,1]){
    $('countdown').textContent = n;
    await wait(700);
  }
  $('countdown').textContent = '';
  capturePhoto();
}
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

function coverCrop(sourceW, sourceH, targetW, targetH){
  const sourceRatio=sourceW/sourceH, targetRatio=targetW/targetH;
  if(sourceRatio>targetRatio){
    const sw=sourceH*targetRatio; return {sx:(sourceW-sw)/2, sy:0, sw, sh:sourceH};
  }
  const sh=sourceW/targetRatio; return {sx:0, sy:(sourceH-sh)/2, sw:sourceW, sh};
}

function capturePhoto(){
  const v=$('video'), c=$('canvas'), ctx=c.getContext('2d');
  const {w,h}=getTargetSize(); c.width=w; c.height=h;
  const crop=coverCrop(v.videoWidth,v.videoHeight,w,h);
  ctx.save(); ctx.translate(w,0); ctx.scale(-1,1);
  ctx.drawImage(v,crop.sx,crop.sy,crop.sw,crop.sh,0,0,w,h); ctx.restore();

  const finish=()=>{
    c.toBlob(blob=>{
      state.photoBlob=blob; state.photoDataUrl=c.toDataURL('image/jpeg',.9);
      $('preview').src=state.photoDataUrl;
      $('cameraStage').classList.add('hidden'); $('capturePanel').classList.add('hidden'); $('reviewPanel').classList.remove('hidden');
      $('flash').classList.add('active'); setTimeout(()=>$('flash').classList.remove('active'),450);
    },'image/jpeg',.9);
  };

  if(settings.frame){
    const img=new Image(); img.onload=()=>{ctx.drawImage(img,0,0,w,h); finish();}; img.onerror=finish; img.src=settings.frame;
  } else finish();
}

function resetBooth(){
  state.photoBlob=null; state.photoDataUrl=null; $('emailInput').value=''; $('emailStatus').textContent='Optional: configure EmailJS in Admin Settings.';
  $('reviewPanel').classList.add('hidden'); $('cameraStage').classList.remove('hidden'); $('capturePanel').classList.remove('hidden'); $('captureBtn').disabled=false;
}

function downloadPhoto(){
  const a=document.createElement('a'); a.href=state.photoDataUrl; a.download=`${slug(settings.title)}-${Date.now()}.jpg`; a.click();
}
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'photo'; }

async function sharePhoto(){
  if(!state.photoBlob) return;
  const file=new File([state.photoBlob],`${slug(settings.title)}.jpg`,{type:'image/jpeg'});
  try {
    if(navigator.canShare?.({files:[file]})) await navigator.share({title:settings.title,text:'My photo booth picture',files:[file]});
    else downloadPhoto();
  } catch(err){ if(err.name!=='AbortError') console.error(err); }
}

async function emailPhoto(){
  const to=$('emailInput').value.trim();
  if(!/^\S+@\S+\.\S+$/.test(to)){ $('emailStatus').textContent='Enter a valid email address.'; return; }
  if(!settings.emailPublicKey || !settings.emailServiceId || !settings.emailTemplateId){
    $('emailStatus').textContent='EmailJS is not configured. Use Share or Download instead.'; return;
  }
  try {
    $('emailBtn').disabled=true; $('emailStatus').textContent='Sending…';
    emailjs.init({publicKey:settings.emailPublicKey});
    await emailjs.send(settings.emailServiceId,settings.emailTemplateId,{to_email:to,event_name:settings.title,photo_data:state.photoDataUrl});
    $('emailStatus').textContent='Sent. Check the inbox and spam folder.';
  } catch(err){ console.error(err); $('emailStatus').textContent='Could not send. Check EmailJS settings and template size limits.'; }
  finally { $('emailBtn').disabled=false; }
}

function openAdmin(){
  const pin=prompt('Enter admin PIN');
  if(pin!=='2468') return;
  $('settingTitle').value=settings.title; $('settingFooter').value=settings.footer; $('settingTheme').value=settings.theme; $('settingRatio').value=settings.ratio;
  $('emailPublicKey').value=settings.emailPublicKey; $('emailServiceId').value=settings.emailServiceId; $('emailTemplateId').value=settings.emailTemplateId;
  $('adminDialog').showModal();
}

async function fileToDataUrl(file){ return new Promise((res,rej)=>{const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file);}); }

$('saveSettingsBtn').addEventListener('click', async (e)=>{
  e.preventDefault();
  const file=$('settingFrame').files[0];
  settings={...settings,title:$('settingTitle').value||defaults.title,footer:$('settingFooter').value||defaults.footer,theme:$('settingTheme').value,ratio:$('settingRatio').value,emailPublicKey:$('emailPublicKey').value.trim(),emailServiceId:$('emailServiceId').value.trim(),emailTemplateId:$('emailTemplateId').value.trim()};
  if(file) settings.frame=await fileToDataUrl(file);
  saveSettings(); applySettings(); $('adminDialog').close(); resetBooth();
});
$('clearFrameBtn').addEventListener('click',()=>{settings.frame=''; $('settingFrame').value=''; saveSettings(); applySettings();});
$('resetSettingsBtn').addEventListener('click',()=>{settings={...defaults}; saveSettings(); applySettings(); $('adminDialog').close(); resetBooth();});
$('captureBtn').addEventListener('click',countdownAndCapture);
$('retakeBtn').addEventListener('click',resetBooth);
$('doneBtn').addEventListener('click',resetBooth);
$('downloadBtn').addEventListener('click',downloadPhoto);
$('shareBtn').addEventListener('click',sharePhoto);
$('emailBtn').addEventListener('click',emailPhoto);
$('adminBtn').addEventListener('click',openAdmin);

applySettings(); startCamera();
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
