const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { ratio:'9:16', seconds:3, facing:'user', stream:null, photoBlob:null, resetTimer:null, settings:{title:'Rutvi and Ronak’s Summer Soirée',defaultRatio:'9:16',resetSeconds:15} };
const frameImages = {
  '9:16': new Image(),
  '16:9': new Image()
};
frameImages['9:16'].src = 'assets/frame-story.png';
frameImages['16:9'].src = 'assets/frame-wide.png';
Object.values(frameImages).forEach(img => img.addEventListener('load', () => drawFrame()));
const els = {welcome:$('#welcome'),booth:$('#booth'),result:$('#result'),video:$('#video'),cameraShell:$('#cameraShell'),frameCanvas:$('#frameCanvas'),captureCanvas:$('#captureCanvas'),countdown:$('#countdown'),flash:$('#flash'),resultImage:$('#resultImage'),adminDialog:$('#adminDialog')};

function loadSettings(){try{const s=JSON.parse(localStorage.getItem('sunsetBoothSettingsV32'));if(s) state.settings={...state.settings,...s};}catch{} state.ratio=state.settings.defaultRatio; document.title=state.settings.title;}
function saveSettings(){localStorage.setItem('sunsetBoothSettingsV32',JSON.stringify(state.settings));}
function setScreen(name){els.welcome.classList.toggle('hidden',name!=='welcome');els.booth.classList.toggle('hidden',name!=='booth');els.result.classList.toggle('hidden',name!=='result');}
async function startCamera(){if(state.stream) state.stream.getTracks().forEach(t=>t.stop());try{state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:state.facing,width:{ideal:1920},height:{ideal:1080}},audio:false});els.video.srcObject=state.stream;await els.video.play();drawFrame();}catch(e){alert('Camera access is required. Open Safari Settings and allow camera access for this site.');}}
function applyRatio(r){state.ratio=r;$$('.format-btn').forEach(b=>b.classList.toggle('active',b.dataset.ratio===r));els.cameraShell.classList.toggle('ratio-9-16',r==='9:16');els.cameraShell.classList.toggle('ratio-16-9',r==='16:9');requestAnimationFrame(drawFrame);}
function drawFrame(){
  const c=els.frameCanvas,rect=els.cameraShell.getBoundingClientRect();
  if(!rect.width)return;
  c.width=Math.round(rect.width*2);
  c.height=Math.round(rect.height*2);
  const x=c.getContext('2d');
  x.clearRect(0,0,c.width,c.height);
  const img=frameImages[state.ratio];
  if(img && img.complete && img.naturalWidth){
    x.drawImage(img,0,0,c.width,c.height);
  }
}
async function countdownAndCapture(){$('#captureBtn').disabled=true;for(let n=state.seconds;n>0;n--){els.countdown.textContent=n;els.countdown.classList.remove('hidden');await new Promise(r=>setTimeout(r,900));}els.countdown.classList.add('hidden');els.flash.classList.remove('on');void els.flash.offsetWidth;els.flash.classList.add('on');await new Promise(r=>setTimeout(r,120));capture();$('#captureBtn').disabled=false;}
function capture(){const video=els.video;const ratio=state.ratio==='9:16'?9/16:16/9;const outH=state.ratio==='9:16'?1920:1080;const outW=Math.round(outH*ratio);const c=els.captureCanvas;c.width=outW;c.height=outH;const x=c.getContext('2d');const vw=video.videoWidth,vh=video.videoHeight;const target=outW/outH;let sx=0,sy=0,sw=vw,sh=vh;if(vw/vh>target){sw=vh*target;sx=(vw-sw)/2}else{sh=vw/target;sy=(vh-sh)/2}x.save();if(state.facing==='user'){x.translate(outW,0);x.scale(-1,1);}x.drawImage(video,sx,sy,sw,sh,0,0,outW,outH);x.restore();drawOutputFrame(x,outW,outH);c.toBlob(blob=>{state.photoBlob=blob;const url=URL.createObjectURL(blob);els.resultImage.src=url;setScreen('result');scheduleReset();},'image/jpeg',.94);}
function drawOutputFrame(x,w,h){
  const img=frameImages[state.ratio];
  if(img && img.complete && img.naturalWidth){
    x.drawImage(img,0,0,w,h);
    return;
  }
  x.strokeStyle='#ffdca0';
  x.lineWidth=Math.max(10,w*.008);
  x.strokeRect(x.lineWidth/2,x.lineWidth/2,w-x.lineWidth,h-x.lineWidth);
}
function scheduleReset(){clearTimeout(state.resetTimer);if(state.settings.resetSeconds>0) state.resetTimer=setTimeout(done,state.settings.resetSeconds*1000);}
function done(){clearTimeout(state.resetTimer);state.photoBlob=null;els.resultImage.removeAttribute('src');setScreen('booth');}
async function sharePhoto(){if(!state.photoBlob)return;const file=new File([state.photoBlob],'rutvi-ronak-summer-soiree.jpg',{type:'image/jpeg'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:state.settings.title,text:'Photo from Rutvi and Ronak’s Summer Soirée'});}else{downloadPhoto();}}
function downloadPhoto(){if(!state.photoBlob)return;const a=document.createElement('a');a.href=URL.createObjectURL(state.photoBlob);a.download='rutvi-ronak-summer-soiree.jpg';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
let logoTaps=0,tapTimer;$('#logoTapTarget').addEventListener('click',e=>{if(e.target.id==='startBtn')return;logoTaps++;clearTimeout(tapTimer);tapTimer=setTimeout(()=>logoTaps=0,1200);if(logoTaps>=5){logoTaps=0;openAdmin();}});
function openAdmin(){const pin=prompt('Admin PIN');if(pin!=='2468')return;$('#eventTitleInput').value=state.settings.title;$('#defaultRatioInput').value=state.settings.defaultRatio;$('#resetSecondsInput').value=String(state.settings.resetSeconds);els.adminDialog.showModal();}
$('#saveAdminBtn').addEventListener('click',()=>{state.settings.title=$('#eventTitleInput').value.trim()||'Rutvi and Ronak’s Summer Soirée';state.settings.defaultRatio=$('#defaultRatioInput').value;state.settings.resetSeconds=Number($('#resetSecondsInput').value);saveSettings();applyRatio(state.settings.defaultRatio);drawFrame();});
$('#startBtn').addEventListener('click',async()=>{setScreen('booth');applyRatio(state.ratio);await startCamera();});
$('#backBtn').addEventListener('click',()=>setScreen('welcome'));
$('#cameraFlipBtn').addEventListener('click',async()=>{state.facing=state.facing==='user'?'environment':'user';await startCamera();});
$$('.format-btn').forEach(b=>b.addEventListener('click',()=>applyRatio(b.dataset.ratio)));
$$('.timer-btn').forEach(b=>b.addEventListener('click',()=>{state.seconds=Number(b.dataset.seconds);$$('.timer-btn').forEach(x=>x.classList.toggle('active',x===b));}));
$('#captureBtn').addEventListener('click',countdownAndCapture);$('#shareBtn').addEventListener('click',sharePhoto);$('#downloadBtn').addEventListener('click',downloadPhoto);$('#retakeBtn').addEventListener('click',done);$('#retakeTopBtn').addEventListener('click',done);$('#doneBtn').addEventListener('click',done);
window.addEventListener('resize',drawFrame);loadSettings();applyRatio(state.ratio);if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
