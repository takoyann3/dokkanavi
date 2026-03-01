let savedTarget = JSON.parse(localStorage.getItem("target"));
let target = savedTarget || null;

let goalCount = parseInt(localStorage.getItem("goalCount")) || 0;
let resetData = JSON.parse(localStorage.getItem("resetData")) || {
  month: new Date().getMonth(),
  count: 0
};

document.getElementById("goalCount").innerText = "Goal: " + goalCount;
updateResetInfo();

function toRad(d){ return d * Math.PI/180 }

function distance(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function bearing(lat1, lon1, lat2, lon2){
  const y = Math.sin(toRad(lon2-lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*
            Math.cos(toRad(lon2-lon1));
  return (Math.atan2(y,x)*180/Math.PI + 360)%360;
}

function getDirection(deg){
  const dirs = ["北","北東","東","南東","南","南西","西","北西"];
  return dirs[Math.round(deg/45)%8];
}

function generateTarget(){
  let now = new Date();
  if(now.getMonth() !== resetData.month){
    resetData.month = now.getMonth();
    resetData.count = 0;
  }

  if(resetData.count >= 3){
    alert("今月の新規作成は3回まで");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos=>{
    const radiusKm = parseFloat(document.getElementById("radius").value);
    const maxR = radiusKm * 1000;

    const r = Math.random() * maxR;
    const angle = Math.random() * 2 * Math.PI;

    const dx = r * Math.cos(angle);
    const dy = r * Math.sin(angle);

    const dLat = dy / 111320;
    const dLon = dx / (111320 * Math.cos(toRad(pos.coords.latitude)));

    target = {
      lat: pos.coords.latitude + dLat,
      lon: pos.coords.longitude + dLon
    };

    localStorage.setItem("target", JSON.stringify(target));

    resetData.count++;
    localStorage.setItem("resetData", JSON.stringify(resetData));
    updateResetInfo();
  });
}

function updateResetInfo(){
  document.getElementById("resetInfo").innerText =
    "今月使用: " + resetData.count + "/3";
}

let deviceHeading = 0;

window.addEventListener("deviceorientationabsolute", e => {
  if (e.webkitCompassHeading) {
    deviceHeading = e.webkitCompassHeading;
  } else if (e.absolute === true || e.alpha !== null) {
    deviceHeading = 360 - e.alpha;
  }
});

navigator.geolocation.watchPosition(pos=>{
  if(!target) return;

  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;

  const dist = distance(lat,lon,target.lat,target.lon);
  const deg = bearing(lat,lon,target.lat,target.lon);

  document.getElementById("distance").innerText =
    Math.floor(dist) + " m";
  document.getElementById("direction").innerText =
    getDirection(deg);

  let rotation = deg - deviceHeading;
  rotation = (rotation + 360) % 360;

  document.getElementById("arrow").style.transform =
    `translateX(-50%) rotate(${rotation}deg)`;

  if(dist < 10){
    goalCount++;
    localStorage.setItem("goalCount", goalCount);
    document.getElementById("goalCount").innerText =
      "Goal: " + goalCount;
    generateTarget();
  }
});

function toggleTheme(){
  document.body.classList.toggle("dark");
}

// ===== 開発者モード（矢印5回タップで使用回数リセット） =====
let devTapCount = 0;
let devTapTimer = null;

document.getElementById("arrow").addEventListener("click", () => {
  devTapCount++;

  clearTimeout(devTapTimer);
  devTapTimer = setTimeout(() => {
    devTapCount = 0;
  }, 2000); // 2秒以内に連続タップ

  if (devTapCount >= 5) {
    resetData.count = 0;
    localStorage.setItem("resetData", JSON.stringify(resetData));
    updateResetInfo();
    alert("開発者モード: 使用回数をリセットしました");
    devTapCount = 0;
  }
});
