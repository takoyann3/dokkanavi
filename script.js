let target = null;
let deviceHeading = 0;
let currentPosition = null;
let prefecture = "";
let city = "";
let prefBox = null;
let cityBox = null;

// ===== 月5回制限 =====
let resetData = JSON.parse(localStorage.getItem("resetData")) || {
  month: new Date().getMonth(),
  count: 0
};

function checkMonthReset(){
  const now = new Date();
  if(now.getMonth() !== resetData.month){
    resetData.month = now.getMonth();
    resetData.count = 0;
    localStorage.setItem("resetData", JSON.stringify(resetData));
  }
}

function updateUsageDisplay(){
  const el = document.getElementById("usageInfo");
  if(el){
    el.innerText = `今月使用: ${resetData.count}/5`;
  }
}

function toRad(d){ return d*Math.PI/180 }

function distance(lat1, lon1, lat2, lon2){
  const R=6371000;
  const dLat=toRad(lat2-lat1);
  const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+
    Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*
    Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function bearing(lat1, lon1, lat2, lon2){
  const y=Math.sin(toRad(lon2-lon1))*Math.cos(toRad(lat2));
  const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2))-
    Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*
    Math.cos(toRad(lon2-lon1));
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}

// ===== 16方位 =====
function getCardinal16(deg){
  const directions = [
    "北","北北東","北東","東北東",
    "東","東南東","南東","南南東",
    "南","南南西","南西","西南西",
    "西","西北西","北西","北北西"
  ];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// ===== 都道府県・市区町村の正しい範囲取得 =====
function fetchBoundingBox(placeName, callback){
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}`)
    .then(res=>res.json())
    .then(data=>{
      if(data && data.length > 0){
        callback(data[0].boundingbox);
      }
    });
}

// ===== 現在地取得 =====
navigator.geolocation.getCurrentPosition(
  pos=>{
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    .then(res=>res.json())
    .then(data=>{
      const addr = data.address || {};

      prefecture =
        addr.state ||
        addr.region ||
        addr.province ||
        addr.county ||
        "不明";

      city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        "不明";

      const locEl = document.getElementById("locationInfo");
      if(locEl){
        locEl.innerText = `${prefecture} ${city}`;
      }

      // 範囲を取得
      fetchBoundingBox(prefecture, box=>{
        prefBox = box;
      });

      fetchBoundingBox(prefecture + " " + city, box=>{
        cityBox = box;
      });

    });
  },
  err=>{
    alert("位置情報取得失敗: " + err.message);
  },
  {
    enableHighAccuracy:true,
    timeout:10000,
    maximumAge:0
  }
);

// ===== GPS監視 =====
navigator.geolocation.watchPosition(
  pos=>{
    currentPosition = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude
    };
  },
  err=>{
    console.log(err);
  },
  {
    enableHighAccuracy:true,
    maximumAge:0,
    timeout:10000
  }
);

// ===== 目的地生成 =====
function generateTarget(){

  checkMonthReset();

  if(resetData.count >= 5){
    alert("今月の生成回数は5回までやで");
    return;
  }

  const mode = document.getElementById("mode").value;

  if(mode==="radius"){
    const radiusKm = parseFloat(document.getElementById("radius").value);
    const r = Math.random()*radiusKm*1000;
    const angle = Math.random()*2*Math.PI;

    const dx=r*Math.cos(angle);
    const dy=r*Math.sin(angle);

    const dLat = dy/111320;
    const dLon = dx/(111320*Math.cos(toRad(currentPosition.lat)));

    target={
      lat: currentPosition.lat+dLat,
      lon: currentPosition.lon+dLon
    };
  }

  if(mode==="pref" && prefBox){
    target = randomInBox(prefBox);
  }

  if(mode==="city" && cityBox){
    target = randomInBox(cityBox);
  }

  resetData.count++;
  localStorage.setItem("resetData", JSON.stringify(resetData));
  updateUsageDisplay();
}

function randomInBox(box){
  const south = parseFloat(box[0]);
  const north = parseFloat(box[1]);
  const west = parseFloat(box[2]);
  const east = parseFloat(box[3]);

  return {
    lat: south + Math.random()*(north-south),
    lon: west + Math.random()*(east-west)
  };
}

// ===== コンパス =====
window.addEventListener("deviceorientationabsolute", e=>{
  if(e.webkitCompassHeading){
    deviceHeading=e.webkitCompassHeading;
  }else if(e.alpha!==null){
    deviceHeading=360-e.alpha;
  }
});

// ===== フレーム更新 =====
function updateFrame(){

  if(target && currentPosition){

    const lat = currentPosition.lat;
    const lon = currentPosition.lon;

    const dist = distance(lat,lon,target.lat,target.lon);
    const deg = bearing(lat,lon,target.lat,target.lon);

    const distEl = document.getElementById("distance");
    const dirEl = document.getElementById("direction");

    if(distEl) distEl.innerText = Math.floor(dist)+" m";

    if(dirEl){
      const cardinal = getCardinal16(deg);
      dirEl.innerText = `${deg.toFixed(1)}°（${cardinal}）`;
    }

    let rotation=(deg-deviceHeading+360)%360;

    const arrowEl = document.getElementById("arrow");
    if(arrowEl){
      arrowEl.style.transform =
        `translateX(-50%) rotate(${rotation}deg)`;
    }
  }

  requestAnimationFrame(updateFrame);
}

requestAnimationFrame(updateFrame);

// ===== 開発者モード =====
let devTapCount = 0;
let devTimer = null;

document.addEventListener("DOMContentLoaded", ()=>{
  const arrowEl = document.getElementById("arrow");
  if(!arrowEl) return;

  arrowEl.addEventListener("click", ()=>{
    devTapCount++;

    clearTimeout(devTimer);
    devTimer = setTimeout(()=>{ devTapCount=0; },2000);

    if(devTapCount>=5){
      resetData.count=0;
      localStorage.setItem("resetData", JSON.stringify(resetData));
      updateUsageDisplay();
      alert("開発者モード: 回数リセット");
      devTapCount=0;
    }
  });
});

checkMonthReset();
updateUsageDisplay();
