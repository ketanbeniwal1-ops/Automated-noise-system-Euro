 console.log("15 sec function called");
 const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxz4lUE2xrlEEYbhad-dh08fTMr0m3sFR2ydWPvYHOvepKBkXuyV10mmU-d9TPL5lY/exec";
// ---------- INITIAL SETUP ----------
const classSelect = document.getElementById("classSelect");
for (let i = 1; i <= 12; i++) {
  classSelect.innerHTML += `<option>Class ${i}</option>`;
}

let ADMIN_PASS = localStorage.getItem("adminPass") || "euroschool@13579";
let timetable = JSON.parse(localStorage.getItem("timetable") || "[]");

// ---------- ELEMENTS ----------
const noiseValue = document.getElementById("noiseValue");
const statusText = document.getElementById("status");
const tableBody = document.getElementById("dataTable");
const peakText = document.getElementById("peak");
const lectureAvgText = document.getElementById("lectureAvg");
const currentPeriodText = document.getElementById("currentPeriod");

// ---------- AUDIO ----------
let audioContext, analyser, mic, dataArray;
let running = false;
let sum15 = 0, count15 = 0;
let lectureSum = 0, lectureCount = 0;
let peak = 0;

// ---------- TIME CONTROL ----------
function isSchoolTime() {
  const h = new Date().getHours();
  return h >= 8 && h < 20;
}

// ---------- PERIOD CHECK ----------
function getCurrentPeriod() {
  const now = new Date();
  const time = now.getHours()*60 + now.getMinutes();

  for (let p of timetable) {
    const [s,e,name] = p;
    if (time >= s && time <= e) return name;
  }
  return "No Period";
}

// ---------- START ----------
document.getElementById("startBtn").onclick = async () => {
  if (!isSchoolTime()) {
    alert("Works only 8 AM – 8 PM");
    return;
  }

  audioContext = new AudioContext();
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  mic = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  mic.connect(analyser);

  running = true;
  setInterval(log15Sec, 15000);
  listen();
};

// ---------- STOP ----------
document.getElementById("stopBtn").onclick = () => {
  running = false;
  clearInterval(logInterval);
};

// ---------- LISTEN ----------
function listen() {
  if (!running) return;

  analyser.getByteFrequencyData(dataArray);
  const avg = dataArray.reduce((a,b)=>a+b,0)/dataArray.length;

  noiseValue.innerText = Math.round(avg);
  sum15 += avg; count15++;
  lectureSum += avg; lectureCount++;

  if (avg > peak) peak = Math.round(avg);
  peakText.innerText = peak;

  currentPeriodText.innerText = getCurrentPeriod();
  lectureAvgText.innerText = Math.round(lectureSum / lectureCount);

  statusText.innerText = avg > 40 ? "🔴 Noisy" : "🟢 Calm";
  requestAnimationFrame(listen);
}

// ---------- 15 SECOND LOG ----------
function log15Sec() {
  console.log("15 sec function called");

  if (count15 === 0) {
    console.warn("No audio data collected");
    return;
  }

  const avgNoise = Math.round(sum15 / count15);
  const time = new Date().toLocaleTimeString();

  // SHOW ON WEBSITE TABLE
  tableBody.innerHTML += `
    <tr>
      <td>${time}</td>
      <td>${avgNoise}</td>
    </tr>
  `;

  // RESET
  sum15 = 0;
  count15 = 0;
}
fetch(SHEET_API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    class: classSelect.value,
    section: sectionSelect.value,
    avgNoise: avgNoise,
    period: getCurrentPeriod()
  })
})
.then(res => res.text())
.then(data => console.log("Sheet response:", data))
.catch(err => console.error("Sheet error:", err));

  // Send to Google Sheet
  fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      class: classSelect.value,
      section: sectionSelect.value,
      avgNoise: avgNoise,
      period: period
    })
  }).catch(err => console.error("Sheet error:", err));

  // Reset counters
  sum15 = 0;
  count15 = 0;
;

// ---------- ADMIN ----------
document.getElementById("adminLogin").onclick = () => {
  const p = prompt("Enter Admin Password");
  if (p === ADMIN_PASS)
    document.getElementById("adminPanel").style.display = "block";
  else alert("Wrong password");
};

document.getElementById("changePass").onclick = () => {
  ADMIN_PASS = document.getElementById("newPass").value;
  localStorage.setItem("adminPass", ADMIN_PASS);
  alert("Password Updated");
};

// ---------- TIMETABLE ----------
document.getElementById("saveTT").onclick = () => {
  const lines = document.getElementById("timetableInput").value.split("\n");
  timetable = lines.map(l=>{
    const [t,name] = l.split(" ");
    const [s,e] = t.split("-");
    const sm = toMin(s), em = toMin(e);
    return [sm,em,name||"Period"];
  });
  localStorage.setItem("timetable", JSON.stringify(timetable));
  alert("Timetable Saved");
};

function toMin(t){
  const [h,m]=t.split(":"); return +h*60 + +m;
}

// ---------- DOWNLOAD ----------
document.getElementById("download").onclick = () => {
  let csv="Time,Avg dB\n";
  document.querySelectorAll("#dataTable tr").forEach(r=>{
    csv+=r.children[0].innerText+","+r.children[1].innerText+"\n";
  });
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv]));
  a.download="noise_report.csv";
  a.click();
};

// ---------- MODE ----------
document.getElementById("modeBtn").onclick =
()=>document.body.classList.toggle("dark");

// ---------- MOUSE EFFECT ----------
const bg=document.getElementById("mouse-bg");
document.addEventListener("mousemove",e=>{
  bg.style.left=e.clientX+"px";
  bg.style.top=e.clientY+"px";
});
