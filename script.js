let target = null;
let deviceHeading = 0;
let currentLat, currentLon;
let prefecture = "";
let city = "";
let prefBox = null;
let cityBox = null;

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

// ===== 現在地取得 =====
navigator.geolocation.getCurrentPosition(pos=>{
  currentLat = pos.coords.latitude;
  currentLon = pos.coords.longitude;

  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}`)
  .then(res=>res.json())
  .then(data=>{
    const addr = data.address;
    prefecture = addr.state;
    city = addr.city || addr.town || addr.village;

    document.getElementById("locationInfo").innerText =
      prefecture + " " + city;

    prefBox = data.boundingbox;
    cityBox = data.boundingbox;
  });
});

// ===== 目的地生成 =====
function generateTarget(){
  const mode = document.getElementById("mode").value;

  if(mode==="radius"){
    const radiusKm = parseFloat(document.getElementById("radius").value);
    const r = Math.random()*radiusKm*1000;
    const angle = Math.random()*2*Math.PI;

    const dx=r*Math.cos(angle);
    const dy=r*Math.sin(angle);

    const dLat = dy/111320;
    const dLon = dx/(111320*Math.cos(toRad(currentLat)));

    target={
      lat: currentLat+dLat,
      lon: currentLon+dLon
    };
  }

  if(mode==="pref" && prefBox){
    target = randomInBox(prefBox);
  }

  if(mode==="city" && cityBox){
    target = randomInBox(cityBox);
  }
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

// ===== ナビ更新 =====
navigator.geolocation.watchPosition(pos=>{
  if(!target) return;

  const lat=pos.coords.latitude;
  const lon=pos.coords.longitude;

  const dist=distance(lat,lon,target.lat,target.lon);
  const deg=bearing(lat,lon,target.lat,target.lon);

  document.getElementById("distance").innerText =
    Math.floor(dist)+" m";

  document.getElementById("direction").innerText =
    deg.toFixed(1)+"°";

  let rotation=(deg-deviceHeading+360)%360;

  document.getElementById("arrow").style.transform =
    `translateX(-50%) rotate(${rotation}deg)`;
});
