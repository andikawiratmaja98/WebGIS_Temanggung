
(function(){
  if (typeof window.groupedLayers !== 'object') {
    console.error("groupedLayers tidak ditemukan. Pastikan layerConfig.js dimuat sebelum qgis2web.js");
    return;
  }

  if (L && L.Path && !L.Path.__patched) {
    L.Path.include({ bringToFront: function(){return this;}, bringToBack:function(){return this;} });
    L.Layer.include({ bringToFront: function(){return this;}, bringToBack:function(){return this;} });
    L.Path.__patched = true;
  }

  var map = L.map('map', { zoomControl:false }).setView([-7.33364,110.29063], 11);

  var baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:20}).addTo(map);
  var baseSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:20});
  var baseDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {maxZoom:20});
  L.control.layers({"OSM":baseOSM,"Esri Satellite":baseSat,"Carto Dark":baseDark}, {}, {position:"topright"}).addTo(map);

const sidepanelLeft = L.control.sidepanel('mySidepanelLeft', {
    tabsPosition: 'left',
    startTab: 'tab-layer'
}).addTo(map);

document.querySelector('.sidepanel-toggle-button').addEventListener('click', () => {
  sidepanelLeft.toggle();
});


  var layerCtl = document.getElementById('layerControl');
  var legendEl = document.getElementById('legendContent');
  var tableHeadRow = document.getElementById('table-head-row');
  var tableBody = document.getElementById('table-body');
  var layerRefs = {}, activeLayers = {}, layerOpacity = {};

  function zOrderByType(type){
    if (type === 'polygon') return 400;
    if (type === 'line') return 600;
    if (type === 'point') return 2600;
    return 300;
  }

  function applyZIndices(){
    Object.values(layerRefs).forEach(ref => {
      const pane = map.getPane(ref.paneId);
      if (pane) pane.style.zIndex = zOrderByType(ref.cfg.type);
    });
  }

  function ensureTableCleared(){
    while (tableHeadRow.firstChild) tableHeadRow.removeChild(tableHeadRow.firstChild);
    while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);
  }

function styleForFeature(feature, cfg, color) {
  // ambil nilai atribut dari feature (jaga case-sensitive)
  const val = cfg.field ? feature.properties[cfg.field] : null;

  // tentukan warna default (fallback merah jika tidak ditemukan)
  if (!color) {
    color = '#ff0000ff';
    if (Array.isArray(cfg.categories) && Array.isArray(cfg.colors) && cfg.categories.length) {
      const idx = cfg.categories.map(x => String(x).toLowerCase().trim())
                                .indexOf(String(val ?? '').toLowerCase().trim());
      if (idx >= 0) color = cfg.colors[idx];
    } else if (Array.isArray(cfg.breaks) && Array.isArray(cfg.colors) && cfg.breaks.length) {
      for (let i = 0; i < cfg.breaks.length; i++) {
        if (Number(val) <= Number(cfg.breaks[i])) { 
          color = cfg.colors[i]; 
          break; 
        } else {
          color = cfg.colors[cfg.colors.length - 1];
        }
      }
    } else if (Array.isArray(cfg.colors) && cfg.colors.length === 1) {
      // single-color layer
      color = cfg.colors[0];
    }
  }

  // ======== STYLE GARIS ========
  if (cfg.type === 'line') {
    // Determine feature category (if any)
    const kategori = cfg.field ? feature.properties[cfg.field] : null;
    const styleRule = cfg.styleByCategory && cfg.styleByCategory[kategori]
      ? cfg.styleByCategory[kategori]
      : {};

    return {
      color: styleRule.color || color || (cfg.colors && cfg.colors[0]) || '#333',
      weight: styleRule.weight || cfg.weight || 2,
      opacity: typeof styleRule.opacity !== 'undefined' ? styleRule.opacity : 1,
      dashArray: styleRule.dashArray || cfg.dashArray || null,
      lineCap: "round",
      lineJoin: "round"
    };
  }

  // ======== STYLE TITIK ========
  if (cfg.type === 'point') {
    if (cfg.iconByCategory) {
      const kategori = cfg.field ? feature.properties[cfg.field] : null;
      const iconUrl = cfg.iconByCategory[kategori] || cfg.defaultIcon || 'img/default.png';
      return L.icon({
        iconUrl: iconUrl,
        iconSize: cfg.iconSize || [28, 28],
        iconAnchor: cfg.iconAnchor || [14, 28],
        popupAnchor: cfg.popupAnchor || [0, -28]
      });
    }

    return { 
      radius: cfg.radius || 5, 
      color: cfg.strokeColor || '#333', 
      fillColor: color, 
      fillOpacity: typeof cfg.fillOpacity !== 'undefined' ? cfg.fillOpacity : 0.9, 
      weight: cfg.strokeWidth || 1 
    };
  }

  // ======== STYLE POLYGON ========
 if (cfg.type === 'polygon') {
  // === Kalau ada pattern ===
  if (cfg.pattern === 'hatch-green' && (typeof L.StripePattern === 'function' || typeof L.pattern === 'function')) {
  const Hatch = L.StripePattern || L.pattern;
  const hatchPattern = new Hatch({
    weight: 1.2,
    spaceWeight: 4,
    color: 'green',
    spaceColor: 'transparent',
    angle: 45
  });
  hatchPattern.addTo(map);

  return {
    color: 'green',
    weight: 1,
    fillPattern: hatchPattern,
    fillOpacity: 0.5
  };
}

  // === Default polygon biasa ===
  return { 
    color: cfg.strokeColor || '#333', 
    weight: cfg.weight || 1, 
    fillColor: color, 
    fillOpacity: typeof cfg.fillOpacity !== 'undefined' ? cfg.fillOpacity : 0.6 
  };
}




  // fallback (shouldn't happen)
  return {};
}

function updateLegend(layerName, cfg) {
  // inisialisasi
  let html = `<b>${layerName}</b><br/>`;

  // kalau layer line ber-kategori, kita skip menaruh di panel utama jika mau
  if (cfg.type === "line" && Array.isArray(cfg.categories) && cfg.categories.length) {
    // jika kamu tetap ingin menampilkan di panel kanan, comment out return
    console.log("SKIP updateLegend → memakai mini legend untuk kategori line:", layerName);
    return;
  }

  if (Array.isArray(cfg.categories) && Array.isArray(cfg.colors)) {
    cfg.categories.forEach((cat, i) => {
      const color = cfg.colors[i] || '#cccccc';

      // === STYLE LINE ===
      if (cfg.type === 'line') {
        const styleRule = cfg.styleByCategory?.[cat] || {};
        const weight = styleRule.weight || cfg.weight || 2;
        const dash = styleRule.dashArray || cfg.dashArray || '';

        html += `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <svg width="30" height="10">
              <line x1="0" y1="5" x2="30" y2="5"
                stroke="${color}"
                stroke-width="${weight}"
                stroke-dasharray="${dash}"
                stroke-linecap="round" />
            </svg>
            <span>${cat}</span>
          </div>`;
      }

      // === STYLE POINT DENGAN ICON PNG ===
      else if (cfg.type === 'point' && cfg.iconByCategory && cfg.iconByCategory[cat]) {
        const iconByCategory = cfg.iconByCategory[cat];
        html += `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <img src="${iconByCategory}" width="20" height="20" style="vertical-align:middle;border:1px solid #ccc;border-radius:3px;" />
            <span>${cat}</span>
          </div>`;
      }

else {
  let shapeHTML;

  // === jika polygon punya pola arsiran hijau ===
  if (cfg.type === 'polygon' && cfg.pattern === 'hatch-green') {
    shapeHTML = `
      <svg width="16" height="16">
        <defs>
          <pattern id="hatch_${layerName.replace(/\W/g, '_')}_${i}"
            patternUnits="userSpaceOnUse"
            width="4" height="4"
            patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="green" stroke-width="1" />
          </pattern>
        </defs>
        <rect width="16" height="16" fill="url(#hatch_${layerName.replace(/\W/g, '_')}_${i})" stroke="#777"/>
      </svg>`;
  }

  // === polygon biasa tanpa pola ===
  else if (cfg.type === 'polygon') {
    shapeHTML = `<span style="width:14px;height:14px;background:${color};border:1px solid #777;display:inline-block;"></span>`;
  }

  // === point biasa ===
  else if (cfg.type === 'point') {
    shapeHTML = `<span style="width:14px;height:14px;background:${color};border:1px solid #777;border-radius:50%;display:inline-block;"></span>`;
  }

  // === fallback ===
  else {
    shapeHTML = `<span style="width:14px;height:14px;background:${color};border:1px solid #777;display:inline-block;"></span>`;
  }

  row.innerHTML = `
    <input type="checkbox" id="${id}" checked style="cursor:pointer;">
    <label for="${id}" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
      ${shapeHTML}
      <span>${cat}</span>
    </label>`;
}


    });
  } else {
    html += '<i>Tidak ada legenda</i>';
  }

  legendEl.innerHTML = html;
}


  function buildPopup(props, cfg){
    let html = '<div class="popup-card">';

    if (cfg.popupFields && cfg.popupFields.length) {
      cfg.popupFields.forEach(p => {
        let val = props[p.field];
        if (p.transform && typeof window[p.transform] === 'function') val = window[p.transform](val);
        html += `<div class="popup-row"><span class="popup-label">${p.label}</span><span class="popup-value">${val ?? ''}</span></div>`;
      });
    }

    html += '</div>'; 
    return html;
  }

function renderTable(geojsonLayer, cfg) {
  ensureTableCleared();
  if (!geojsonLayer) return;

  const data = [];
  geojsonLayer.eachLayer(l => data.push(l.feature.properties));
  if (!data.length) return;

  // ✅ Ambil daftar field dari popupFields, bukan dari semua atribut
  const popupFields = cfg && cfg.popupFields ? cfg.popupFields : [];

  // Kalau popupFields kosong, fallback ke semua kolom lama (biar aman)
  const fields = popupFields.length
    ? popupFields.map(f => (typeof f === 'string' ? f : f.field))
    : Object.keys(data[0]);
}


  function getPaneId(name){return 'pane_'+name.replace(/[\W]/g,'_');}

// === Fungsi addLayer versi lengkap ===
function addLayer(name, cfg) {
  const paneId = getPaneId(name);
  if (!map.getPane(paneId)) map.createPane(paneId);
  map.getPane(paneId).style.zIndex = zOrderByType(cfg.type);

  // Validasi data
  if (!cfg.data || !cfg.data.features || cfg.data.features.length === 0) {
    console.warn(`Layer ${name} tidak memiliki fitur valid`);
    return;
  }

  const geo = L.geoJSON(cfg.data, {
    pane: paneId,
    style: f => styleForFeature(f, cfg),

    pointToLayer: (f, ll) => {
      const styleOrIcon = styleForFeature(f, cfg);
      if (styleOrIcon instanceof L.Icon) {
        return L.marker(ll, { icon: styleOrIcon });
      } else {
        return L.circleMarker(ll, styleOrIcon);
      }
    },

onEachFeature: (f, l) => {
  if (!f.geometry || !f.geometry.coordinates) return;
  l.bindPopup(buildPopup(f.properties, cfg));

  const kategori = f.properties[cfg.field];
  const styleRule = cfg.styleByCategory && cfg.styleByCategory[kategori]
    ? cfg.styleByCategory[kategori]
    : {};

  if (styleRule.showPatternX) {
    l.setText(' × ', {
      repeat: true,
      center: false,
      offset: 0,
      attributes: {
        'font-weight': 'bold',
        'font-size': '14px',
        fill: styleRule.patternColor || '#000000',
        stroke: '#ffffff',
        'stroke-width': 1
      }
    });
  }



      // === Popup dasar ===
      l.bindPopup(buildPopup(f.properties, cfg));

    }
  }).addTo(map);

  // === Simpan referensi dan tampilkan ===
  layerRefs[name] = { cfg: cfg, geojson: geo, paneId: paneId };
  activeLayers[name] = geo;

  // Simpan object Leaflet untuk legend
  cfg.layer = geo;


  // showLegendInSidebar(name, cfg, geo);
setTimeout(() => {
    addMiniLegendUnderLayer(name, cfg, geo);
}, 50);


  // Render tabel atribut
  renderTable(geo, cfg);

  return geo;
}


// === Fungsi hapus layer ===
function removeLayer(name) {
  if (activeLayers[name]) {
    map.removeLayer(activeLayers[name]); // ✅ hapus layer yang benar
    delete activeLayers[name];
    document.querySelectorAll(`.mini-legend[data-layer='${name}']`).forEach(el => el.remove());
  }
}

  function buildUI(){
    layerCtl.innerHTML='';
    Object.keys(window.groupedLayers).forEach(groupName=>{
      const groupObj=window.groupedLayers[groupName];
      const div=document.createElement('div');
      div.className='q2w-group';

      const header=document.createElement('div');
      header.className='q2w-group-header';
      header.innerHTML='<strong>'+groupName+'</strong>';
      header.style.cssText='background:#0a2540;color:#fff;padding:6px 8px;border-radius:6px;margin:6px 0;cursor:pointer;';
      div.appendChild(header);

      const list=document.createElement('div');
      list.className='q2w-layer-list';
      div.appendChild(list);

      list.style.display = /administrasi/i.test(groupName) ? 'block' : 'none';

      header.addEventListener('click',()=>{
        list.style.display=(list.style.display==='none')?'block':'none';
      });

      Object.keys(groupObj).forEach(layerName=>{
        const cfg=groupObj[layerName];
        const row=document.createElement('div');
        row.className='q2w-layer';
        row.style.cssText='display:flex;align-items:center;gap:8px;padding:4px 6px;border:1px solid #ddd;border-radius:4px;margin:4px 0;background:#fff;';

        const cid='chk_'+Math.random().toString(36).slice(2);
        const sld='sld_'+Math.random().toString(36).slice(2);
        row.innerHTML=`<label for="${cid}" style="display:flex;gap:6px;align-items:center;"><input id="${cid}" type="checkbox"><span>${layerName}</span></label><input id="${sld}" type="range" min="0" max="1" step="0.1" value="1" style="margin-left:auto;width:80px;">`;

        row.querySelector('#'+cid).addEventListener('change',e=>{
          e.target.checked?addLayer(layerName,cfg):removeLayer(layerName);
        });

        row.querySelector('#'+sld).addEventListener('input',e=>{
          layerOpacity[layerName]=parseFloat(e.target.value);
          const lyr=activeLayers[layerName];
          if(lyr)lyr.eachLayer(l=>l.setStyle&&l.setStyle({opacity:e.target.value,fillOpacity:e.target.value}));
        });

        list.appendChild(row);
      });
      layerCtl.appendChild(div);
    });
  }

  buildUI();
  applyZIndices();

  Object.keys(window.groupedLayers).forEach(groupName => {
    if (/administrasi/i.test(groupName)) {
      const groupObj = window.groupedLayers[groupName];
      Object.keys(groupObj).forEach(layerName => {
        const cfg = groupObj[layerName];
        addLayer(layerName, cfg);
        const inputs = document.querySelectorAll('#layerControl input[type=checkbox]');
        inputs.forEach(inp => {
          if (inp.nextSibling && inp.nextSibling.textContent.trim() === layerName) inp.checked = true;
        });
      });
    }
  });

// === Layer Label Kecamatan (tidak interaktif) ===
map.createPane("labelPane");
map.getPane("labelPane").style.zIndex = 250; // lebih rendah dari overlay pane
map.getPane("labelPane").style.pointerEvents = "none"; // biar bisa klik layer lain

// 
L.geoJSON(json_BatasKecamatan_AR, {
  pane: "labelPane",
  style: {
    color: "#333333ff", // garis batas
    weight: 0,
    dashArray: "4 3",
    fill: false,
    interactive: false
  },
  onEachFeature: function (feature, layer) {
    if (!feature.properties) return;

    const center = layer.getBounds().getCenter();

    const label = L.divIcon({
      className: "kecamatan-label",
      html: `
        <div style="
          background: rgba(255,255,255,0.6);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: bold;
          color: #000;
          text-align: center;
          box-shadow: 0 0 2px rgba(0,0,0,0.3);
        ">
          ${feature.properties.namobj}
        </div>`,
      iconSize: [100, 24]
    });

    L.marker(center, { icon: label, pane: "labelPane", interactive: false }).addTo(map);
  }
}).addTo(map);

  try{
    L.Control.geocoder({defaultMarkGeocode:true,placeholder:'Cari lokasi...'}).on('markgeocode',e=>map.setView(e.geocode.center,16)).addTo(map);
  }catch(e){console.warn('Geocoder gagal:',e);}

  L.control.zoom({ position: 'topright' }).addTo(map);

// Legend
 function generateLeafletHTMLLegend(layerName, cfg, layerObj) {
    if (!cfg.categories || !cfg.colors) return null;

    let elements = cfg.categories.map((cat, i) => {
        let color = cfg.colors[i] || "#ccc";

        return {
            label: cat,
            html: `
                <span style="
                    width:14px;height:14px;display:inline-block;
                    background:${color};border:1px solid #333;">
                </span>`
        };
    });

    let legendPlugin = L.control.htmllegend({
        collapseSimple: true,
        detectStretched: true,
        legends: [{
            name: layerName,
            layer: layerObj,
            elements: elements
        }]
    });

    // plugin onAdd menghasilkan DOM element
    return legendPlugin.onAdd(map);
}
function insertLegendUnderLayer(layerName, legendDiv) {
    const allLayerDivs = document.querySelectorAll("#layerControl .q2w-layer");
    allLayerDivs.forEach(div => {
        const label = div.querySelector("label span");
        if (label && label.textContent.trim() === layerName) {
            div.insertAdjacentElement("afterend", legendDiv);
        }
    });
}

function addMiniLegendUnderLayer(layerName, cfg, layerObj) {
  console.log("LEGEND DEBUG →", layerName, {
    categories: cfg.categories,
    colors: cfg.colors,
    field: cfg.field,
    type: cfg.type,
    layersCount: (layerObj && layerObj.getLayers) ? layerObj.getLayers().length : 0
  });

  // hapus legend lama
  document.querySelectorAll(`.mini-legend[data-layer='${layerName}']`).forEach(el => el.remove());

  // kalau layerObj belum berisi fitur, tunggu sedikit (retry kecil)
  if (layerObj && typeof layerObj.getLayers === 'function' && layerObj.getLayers().length === 0) {
    // lakukan retry singkat (hingga 5x)
    let tries = 0;
    const waiter = setInterval(() => {
      tries++;
      if (layerObj.getLayers().length > 0 || tries >= 5) {
        clearInterval(waiter);
        // panggil ulang fungsi untuk benar-benar merender legend
        addMiniLegendUnderLayer(layerName, cfg, layerObj);
      }
    }, 80);
    return;
  }

  const legendDiv = document.createElement("div");
  legendDiv.className = "mini-legend";
  legendDiv.dataset.layer = layerName;
  legendDiv.style.cssText = `
        margin-left: 24px;
        margin-top: 4px;
        margin-bottom: 6px;
        font-size: 12px;
        background: rgba(255,255,255,0.9);
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 4px 6px;
    `;
// Normalisasi: jika type = 'category', deteksi otomatis berdasarkan data geometry
if (cfg.type === 'category' && cfg.data && cfg.data.features && cfg.data.features.length) {
  const geomType = cfg.data.features[0].geometry.type.toLowerCase();
  if (geomType.includes('line')) cfg.type = 'line';
  else if (geomType.includes('point')) cfg.type = 'point';
  else cfg.type = 'polygon';
}

  // if this layer has categories -> build categorical legend
  if (Array.isArray(cfg.categories) && cfg.categories.length && Array.isArray(cfg.colors)) {
    // build line / polygon / point categorical entries
    cfg.categories.forEach((cat, i) => {
      const color = cfg.colors[i] || '#ccc';
      const id = `chk_${layerName.replace(/\W/g, '_')}_${i}`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';

      if (cfg.type === 'line') {
        const styleRule = cfg.styleByCategory?.[cat] || {};
        const weight = styleRule.weight || cfg.weight || 2;
        const dash = styleRule.dashArray || cfg.dashArray || '';
        row.innerHTML = `
          <input type="checkbox" id="${id}" checked style="cursor:pointer;">
          <label for="${id}" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <svg width="40" height="10">
              <line x1="0" y1="5" x2="40" y2="5"
                stroke="${color}"
                stroke-width="${weight}"
                stroke-dasharray="${dash}"
                stroke-linecap="round" />
            </svg>
            <span>${cat}</span>
          </label>`;
      } else if (cfg.type === 'point' && cfg.iconByCategory && cfg.iconByCategory[cat]) {
        row.innerHTML = `
          <input type="checkbox" id="${id}" checked style="cursor:pointer;">
          <label for="${id}" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <img src="${cfg.iconByCategory[cat]}" width="18" height="18" style="border:1px solid #ccc;border-radius:3px;">
            <span>${cat}</span>
          </label>`;
      } else {
        row.innerHTML = `
          <input type="checkbox" id="${id}" checked style="cursor:pointer;">
          <label for="${id}" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <span style="width:14px;height:14px;background:${color};border:1px solid #777;display:inline-block;"></span>
            <span>${cat}</span>
          </label>`;
      }

      legendDiv.appendChild(row);

      // filter handler: show/hide fitur berdasarkan kategori match (trim + toString)
      row.querySelector(`#${id}`).addEventListener('change', e => {
        const geo = activeLayers[layerName];
        if (!geo) return;
        geo.eachLayer(l => {
          const val = l.feature && l.feature.properties ? l.feature.properties[cfg.field] : undefined;
          const match = String(val ?? '').trim() === String(cat).trim();
          if (match) {
            e.target.checked ? l.addTo(map) : map.removeLayer(l);
          }
        });
      });
    });

    insertLegendUnderLayer(layerName, legendDiv);
    return;
  }

// === SINGLE-STYLE LEGEND TANPA CATEGORY ===
if (cfg.type === 'line') {
  const color = (Array.isArray(cfg.colors) && cfg.colors[0]) || cfg.color || '#333';
  const weight = cfg.weight || 2;
  const dash = cfg.dashArray || '';
  legendDiv.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <svg width="40" height="10">
        <line x1="0" y1="5" x2="40" y2="5"
          stroke="${color}"
          stroke-width="${weight}"
          stroke-dasharray="${dash}"
          stroke-linecap="round" />
      </svg>
      <span>${layerName}</span>
    </div>`;
  insertLegendUnderLayer(layerName, legendDiv);
  return;
}

if (cfg.type === 'point') {
  // pakai icon default kalau tersedia
  if (cfg.defaultIcon) {
    legendDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="${cfg.defaultIcon}" width="18" height="18"
             style="border:1px solid #ccc;border-radius:3px;">
        <span>${layerName}</span>
      </div>`;
  } else {
    const color = (Array.isArray(cfg.colors) && cfg.colors[0]) || '#333';
    legendDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:14px;height:14px;background:${color};
                     border:1px solid #777;border-radius:50%;
                     display:inline-block;"></span>
        <span>${layerName}</span>
      </div>`;
  }
  insertLegendUnderLayer(layerName, legendDiv);
  return;
}

if (cfg.type === 'polygon') {
  // jika pattern hatch-green
  if (cfg.pattern === 'hatch-green') {
    legendDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <svg width="16" height="16">
          <defs>
            <pattern id="hatch_${layerName.replace(/\W/g, '_')}" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="green" stroke-width="1" />
            </pattern>
          </defs>
          <rect width="16" height="16" fill="url(#hatch_${layerName.replace(/\W/g, '_')})" stroke="#555"/>
        </svg>
        <span>${layerName}</span>
      </div>`;
  } else {
    const color = (Array.isArray(cfg.colors) && cfg.colors[0]) || cfg.fillColor || '#999';
    legendDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="width:16px;height:16px;background:${color};
                     border:1px solid #555;display:inline-block;"></span>
        <span>${layerName}</span>
      </div>`;
  }

  insertLegendUnderLayer(layerName, legendDiv);
  return;
}



// fallback
legendDiv.innerHTML = `<i style="color:#777;">Tidak ada legenda</i>`;
insertLegendUnderLayer(layerName, legendDiv);
}


})();
