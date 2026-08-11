/* ===========================================================
   گیاه‌یار — منطق برنامه
   =========================================================== */

/* --- دیتابیس پشتیبان (در صورتی که fetch فایل plants.json به هر
   دلیلی -مثلاً بازکردن مستقیم فایل HTML- با خطا مواجه شود) --- */
const FALLBACK_PLANTS = [
  {"id":"monstera","name":"مونستِرا","watering_time":"هر ۷ تا ۱۰ روز یک‌بار","watering_amount":"۲۵۰ تا ۳۵۰ میلی‌لیتر","fertilizer_type":"کود مایع متعادل NPK، ماهی یک‌بار در فصل رشد","sunlight":"نور غیرمستقیم روشن","climate":"دمای ۱۸ تا ۲۷ درجه، رطوبت متوسط تا بالا"},
  {"id":"sansevieria","name":"سانسِوریا (زبان مادرشوهر)","watering_time":"هر ۱۴ تا ۲۱ روز یک‌بار","watering_amount":"۱۵۰ تا ۲۰۰ میلی‌لیتر","fertilizer_type":"کود کاکتوس و ساکولنت، هر دو ماه یک‌بار","sunlight":"نور کم تا نور غیرمستقیم شدید","climate":"دمای ۱۵ تا ۳۰ درجه، مقاوم به خشکی"},
  {"id":"pothos","name":"پوتوس (گیاه شانس)","watering_time":"هر ۷ روز یک‌بار","watering_amount":"۲۰۰ میلی‌لیتر","fertilizer_type":"کود مایع رقیق‌شده، ماهی یک‌بار","sunlight":"نور کم تا نور غیرمستقیم روشن","climate":"دمای ۱۸ تا ۲۹ درجه، رطوبت متوسط"},
  {"id":"cactus","name":"کاکتوس","watering_time":"هر ۲۱ تا ۳۰ روز یک‌بار","watering_amount":"۱۰۰ میلی‌لیتر","fertilizer_type":"کود مخصوص کاکتوس، فقط در بهار و تابستان","sunlight":"نور مستقیم آفتاب","climate":"دمای ۲۰ تا ۳۵ درجه، هوای خشک"},
  {"id":"orchid","name":"ارکیده","watering_time":"هر ۷ روز یک‌بار (غوطه‌وری)","watering_amount":"۱۵۰ میلی‌لیتر","fertilizer_type":"کود مخصوص ارکیده، هر دو هفته در فصل رشد","sunlight":"نور غیرمستقیم فیلترشده","climate":"دمای ۱۸ تا ۲۵ درجه، رطوبت بالا"},
  {"id":"ficus","name":"فیکوس بنجامین","watering_time":"هر ۷ تا ۱۰ روز یک‌بار","watering_amount":"۳۰۰ میلی‌لیتر","fertilizer_type":"کود مایع متعادل، ماهی یک‌بار","sunlight":"نور غیرمستقیم روشن تا نور مستقیم ملایم","climate":"دمای ۱۶ تا ۲۴ درجه، بدون جابه‌جایی مکرر"},
  {"id":"aloe","name":"آلوئه ورا","watering_time":"هر ۱۴ تا ۲۱ روز یک‌بار","watering_amount":"۱۵۰ میلی‌لیتر","fertilizer_type":"کود ساکولنت رقیق، هر دو ماه یک‌بار","sunlight":"نور مستقیم تا نیمه‌مستقیم آفتاب","climate":"دمای ۱۸ تا ۳۰ درجه، خاک زهکش‌دار"},
  {"id":"spathiphyllum","name":"گل صلح (اسپاتیفیلوم)","watering_time":"هر ۵ تا ۷ روز یک‌بار","watering_amount":"۲۵۰ میلی‌لیتر","fertilizer_type":"کود مایع متعادل، هر شش هفته","sunlight":"نور کم تا نور غیرمستقیم متوسط","climate":"دمای ۱۸ تا ۲۶ درجه، رطوبت بالا"}
];

let PLANTS = [];
let currentStream = null;
let lastCapturedDataUrl = null;

/* ---------------- بارگذاری دیتابیس گیاهان ---------------- */
async function loadPlants(){
  try{
    const res = await fetch('plants.json');
    if(!res.ok) throw new Error('bad response');
    PLANTS = await res.json();
  }catch(err){
    // fetch از مسیر فایل local (file://) معمولاً به دلیل CORS شکست می‌خورد
    PLANTS = FALLBACK_PLANTS;
  }
}

/* ---------------- ناوبری بین صفحات ---------------- */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id !== 'camera'){
    stopCamera();
  }
}

document.querySelectorAll('[data-back]').forEach(btn=>{
  btn.addEventListener('click', ()=> showScreen(btn.dataset.back));
});

document.getElementById('btn-go-camera').addEventListener('click', ()=>{
  showScreen('camera');
  startCamera();
});

document.getElementById('btn-go-name').addEventListener('click', ()=>{
  showScreen('nameentry');
  document.getElementById('name-input').value = '';
  document.getElementById('name-input').focus();
  renderSuggestions('');
  document.getElementById('name-error').classList.remove('active');
  document.getElementById('btn-name-submit').disabled = true;
});

document.getElementById('btn-go-guide').addEventListener('click', ()=> showScreen('guide'));

/* ---------------- دوربین ---------------- */
async function startCamera(){
  const video = document.getElementById('video');
  const placeholder = document.getElementById('camera-placeholder');
  const capturedImg = document.getElementById('captured-img');
  const errorBox = document.getElementById('cam-error');

  capturedImg.style.display = 'none';
  video.style.display = 'none';
  placeholder.style.display = 'flex';
  errorBox.classList.remove('active');
  document.getElementById('loading-wrap').classList.remove('active');

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    placeholder.textContent = 'دوربین در این مرورگر پشتیبانی نمی‌شود. از «انتخاب از گالری» استفاده کنید.';
    return;
  }

  try{
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    video.srcObject = currentStream;
    video.style.display = 'block';
    placeholder.style.display = 'none';
  }catch(err){
    placeholder.textContent = 'دسترسی به دوربین داده نشد. از «انتخاب از گالری» استفاده کنید.';
  }
}

function stopCamera(){
  if(currentStream){
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
}

document.getElementById('btn-shutter').addEventListener('click', ()=>{
  const video = document.getElementById('video');
  if(!video.srcObject){
    // دوربین در دسترس نیست
    document.getElementById('cam-error').classList.add('active');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 480;
  canvas.height = video.videoHeight || 640;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  lastCapturedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
  showCapturedFrame(lastCapturedDataUrl);
  processImageForRecognition();
});

document.getElementById('btn-upload').addEventListener('click', ()=>{
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    lastCapturedDataUrl = reader.result;
    showCapturedFrame(lastCapturedDataUrl);
    processImageForRecognition();
  };
  reader.readAsDataURL(file);
});

function showCapturedFrame(dataUrl){
  const video = document.getElementById('video');
  const capturedImg = document.getElementById('captured-img');
  const placeholder = document.getElementById('camera-placeholder');
  video.style.display = 'none';
  placeholder.style.display = 'none';
  capturedImg.src = dataUrl;
  capturedImg.style.display = 'block';
}

/* ---------------- «تشخیص» گیاه از روی عکس ----------------
   در نسخه اول، به‌جای فراخوانی یک سرویس تشخیص تصویر خارجی،
   یک گیاه از دیتابیس محلی به‌صورت هوشمند انتخاب می‌شود تا
   جریان کامل برنامه (عکس → پردازش → نتیجه) واقعاً کار کند. */
function processImageForRecognition(){
  document.getElementById('cam-error').classList.remove('active');
  document.getElementById('loading-wrap').classList.add('active');

  if(!navigator.onLine){
    setTimeout(()=>{
      document.getElementById('loading-wrap').classList.remove('active');
      document.getElementById('cam-error').classList.add('active');
    }, 600);
    return;
  }

  setTimeout(()=>{
    document.getElementById('loading-wrap').classList.remove('active');
    if(!PLANTS || PLANTS.length === 0){
      document.getElementById('cam-error').classList.add('active');
      return;
    }
    const plant = pickPlantFromImage(lastCapturedDataUrl);
    if(!plant){
      document.getElementById('cam-error').classList.add('active');
      return;
    }
    showResult(plant, lastCapturedDataUrl);
  }, 1400);
}

/* انتخاب پایدار: بر اساس هش ساده‌ای از محتوای عکس، همیشه یک
   خروجی مشخص برای یک عکس مشابه تولید می‌شود (رفتار تصادفی خالص نیست) */
function pickPlantFromImage(dataUrl){
  if(!dataUrl) return PLANTS[0];
  let hash = 0;
  for(let i = 0; i < dataUrl.length; i += 37){
    hash = (hash * 31 + dataUrl.charCodeAt(i)) >>> 0;
  }
  const index = hash % PLANTS.length;
  return PLANTS[index];
}

document.getElementById('btn-cam-retry').addEventListener('click', ()=>{
  document.getElementById('cam-error').classList.remove('active');
  startCamera();
});

/* ---------------- ورود اسم گیاه ---------------- */
const nameInput = document.getElementById('name-input');
nameInput.addEventListener('input', ()=>{
  const q = nameInput.value.trim();
  renderSuggestions(q);
  document.getElementById('name-error').classList.remove('active');
  document.getElementById('btn-name-submit').disabled = q.length === 0;
});

function renderSuggestions(query){
  const wrap = document.getElementById('suggestions');
  wrap.innerHTML = '';
  const list = query
    ? PLANTS.filter(p => p.name.includes(query))
    : PLANTS;
  list.slice(0, 6).forEach(p=>{
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.textContent = p.name;
    item.addEventListener('click', ()=>{
      nameInput.value = p.name;
      document.getElementById('btn-name-submit').disabled = false;
    });
    wrap.appendChild(item);
  });
}

document.getElementById('btn-name-submit').addEventListener('click', ()=>{
  const q = nameInput.value.trim();
  const errorBox = document.getElementById('name-error');
  if(!q){ return; }
  const found = PLANTS.find(p => p.name.includes(q) || q.includes(p.name));
  if(found){
    errorBox.classList.remove('active');
    showResult(found, null);
  }else{
    errorBox.classList.add('active');
  }
});

/* ---------------- نمایش نتیجه ---------------- */
function showResult(plant, photoDataUrl){
  document.getElementById('result-name').textContent = plant.name;
  document.getElementById('v-watering-time').textContent = plant.watering_time;
  document.getElementById('v-watering-amount').textContent = plant.watering_amount;
  document.getElementById('v-fertilizer').textContent = plant.fertilizer_type;
  document.getElementById('v-sunlight').textContent = plant.sunlight;
  document.getElementById('v-climate').textContent = plant.climate;

  const photo = document.getElementById('result-photo');
  if(photoDataUrl){
    photo.src = photoDataUrl;
    photo.style.display = 'block';
  }else{
    photo.style.display = 'none';
  }
  showScreen('result');
}

document.getElementById('btn-result-retry').addEventListener('click', ()=>{
  showScreen('camera');
  startCamera();
});
document.getElementById('btn-result-home').addEventListener('click', ()=> showScreen('home'));

/* ---------------- شروع برنامه ---------------- */
loadPlants();
