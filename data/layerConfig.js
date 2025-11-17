// layerConfig.js
// Konfigurasi lengkap layer untuk qgis2web.js 

function toTitleCase(str) {
  return str
    ? str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';
}

window.groupedLayers = {
  "Administrasi": {
    "Batas Kecamatan": {
      type: "line",
      weight: 1.2,
      dashArray: "4 3",
      colors: ["#333333ff"],
      showLegend: true,
      data: window.json_BatasKecamatan_LN,
      popupFields: [
        { field: "namobj", label: "Nama Kecamatan" }
      ]
    }
  },
  
  "Kecamatan Pringsurat": {
    "Jaringan Transportasi": {
    type: "category",
    field: "NAMOBJ",
    categories: [
      "Jalan Tol",
      "Jalan Arteri Primer",
      "Jalan Kolektor Primer",
      "Jaringan Jalur Kereta Api Antarkota",
      "Jalan Arteri Sekunder",
      "Jalan Lokal Primer",
      "Jalan Lokal Sekunder",
      "Jalan Lingkungan Primer",
      "Jalan Lingkungan Sekunder"
    ],
    colors: [
      "#f50000", // Jalan Tol
      "#ff5100", // Jalan Arteri Primer
      "#ff6011", // Jalan Kolektor Primer
      "#868686", // Jalur Kereta Api
      "#f58c00", // Jalan Arteri Sekunder
      "#9b5aff", // Jalan Lokal Primer
      "#b2b2ff", // Jalan Lokal Sekunder
      "#828282",  // Jalan Lingkungan Primer
      "#9c9c9c" // Jalan Lingkungan Sekunder
    ],
    // style global default
    weight: 2,
    dashArray: "", 
    legend: { field: "NAMOBJ", type: "line" },
    showLegend: true,
    data: window.json_Jalan,
    popupFields: [
      { field: "REMARK", label: "Nama Jalan" },
      { field: "NAMOBJ", label: "Fungsi" },
      { field: "SBDATA", label: "Sumber Data" }
    ],
    // tambahkan aturan styling manual per kategori:
    styleByCategory: {
      "Jalan Tol": { weight: 1.8, dashArray: "" },
      "Jaringan Jalur Kereta Api Antarkota": { weight: 2, dashArray: "5,2" },
      "Jalan Arteri Primer": { weight: 4, dashArray: "" },
      "Jalan Kolektor Primer": { weight: 3, dashArray: "" },
      "Jalan Arteri Sekunder": { weight: 1.7, dashArray: "" },
      "Jalan Lokal Primer": { weight: 1.5, dashArray: "" },
      "Jalan Lokal Sekunder": { weight: 1, dashArray: "" },
      "Jalan Lingkungan Primer": { weight: 1, dashArray: "" },
      "Jalan Lingkungan Sekunder": { weight: 0.6, dashArray: "" }
    }
  },

"Jaringan Energi": {
  type: "line",
  field: "NAMOBJ",
  categories: [
    "Saluran Udara Tegangan Rendah (SUTR)",
    "Saluran Udara Tegangan Tinggi (SUTT)"
  ],
  colors: ["#ffd21e", "#d39031"],
  legend: { field: "NAMOBJ", type: "line" },
  showLegend: true,
  data: window.json_JaringanEnergi,
  popupFields: [
    { field: "NAMOBJ", label: "Nama Jaringan" },
    { field: "SBDATA", label: "Sumber Data" }
  ],
  styleByCategory: {
    "Saluran Udara Tegangan Rendah (SUTR)": {
      color: "#ffd21e",
      weight: 3,
      dashArray: "8 8",
      showPatternX: true,
      patternColor: "#ff0000" // X merah
    },
    "Saluran Udara Tegangan Tinggi (SUTT)": {
      color: "#d39031",
      weight: 4,
      dashArray: "8 8",
      showPatternX: true,
      patternColor: "#007bff" // X biru
    }
  }
},

      "Jaringan Irigasi": {
      type: "category",
      field: "NAMOBJ",
      categories: ["Jaringan Irigasi Primer","Jaringan Irigasi Sekunder", "Jaringan Irigasi Tersier"],
      colors: ["#1f78b4","#a6cee3","#8aacdfff"],
      legend: { field: "NAMOBJ", type: "line" },
      showLegend: true,
      data: window.json_JaringanIrigasi,
      popupFields: [
        { field: "REMARK", label: "Nama Jaringan" },
        { field: "NAMOBJ", label: "Status" },
        { field: "SBDATA", label: "Sumber Data" }
      ]
    },

    "Titik Sumber Daya Air": {
        type: "point",
        field: "NAMOBJ",
        categories: ["Bangunan Sumber Daya Air", "Bangunan Pengendalian Banjir"],
        colors: ["#1f78b4", "#a6cee3"],
        legend: { field: "NAMOBJ", type: "point" },
        showLegend: true,
        data: window.json_SumberDayaAir_PT,
        popupFields: [
          {field: "NAMOBJ", label: "Nama Bangunan" },
          {field: "REMARK", label: "Nama"},
          {field: "SBDATA", label: "Sumber Data"}
        ]
    },
    

  
    "Zona Nilai Tanah": {
      type: "category",
      field: "rangenilai",
      categories: ["< 100.000", "100.000 - 200.000", "200.000 - 500.000", "500.000 - 1.000.000", "1.000.000 - 2.000.000", "2.000.000 - 5.000.000"],
      colors: ["#edf8e9", // < 100.000 (hijau muda)
               "#bae4b3", // 100.000 - 200.000
               "#74c476", // 200.000 - 500.000
               "#31a354", // 500.000 - 1.000.000
               "#006d2c", // 1.000.000 - 2.000.000
               "#fc8d59"],  // 2.000.000 - 5.000.000
      legend: { field: "rangenilai", type: "category" },
      showLegend: true,
      data: window.json_NilaiTanah,
      popupFields: [
        { field: "rangenilai", label: "Rentang Nilai"}
      ]
  },

  "KP2B": {
  type: "category",
  colors: ["rgba(151, 219, 242,1)"],
  pattern: "hatch-green", // 💚 pola arsiran hijau
  legend: { field: "cek", type: "polygon" },
  showLegend: true,
  data: window.json_KP2B,
  popupFields: [
    { field: "cek", label: "Status"}
  ]
},

  "Zona Investasi": {
  type: "category",
  field: "NAMOBJ",
  categories: ["Tanaman Pangan", "Perkebunan", "Perdagangan", "Industri"],
  colors: ["#c8f546", "#afaf37", "#f59b1e", "#690000"],
  legend: { field: "NAMOBJ", type: "category" },
  showLegend: true,
  data: window.json_ZonaInvest,
  popupFields: [
    { field: "NAMOBJ", label: "Zona Investasi"},
    {field: "Luas (ha)", label: "Luas (ha)"}
  ]
},

    "Bidang Tanah": {
      type: "category",
      field: "Kelas Luas",
      categories: ["< 1 ha", "1 - 3 ha", "3 - 5 ha", "> 5 ha"],
      colors: ["#c9eac2","#7bc77c","#2a924b","#00441b"],
      legend: { field: "Kelas Luas", type: "category" },
      showLegend: true,
      data: window.json_BidangTanah,
      popupFields: [
        { field: "WADMKC", label: "Kecamatan"},
        { field: "WADMKD", label: "Desa"},
        { field: "Kelas Luas", label: "Kelas Luas"},
      ]
    },

    "Pola Ruang": {
      type: "category",
      field: "NAMOBJ",
      categories: ["Badan Air", "Kawasan Hutan Lindung", "Kawasan Hutan Produksi Terbatas", "Kawasan Hutan Produksi Tetap", "Kawasan Perlindungan Setempat", "Kawasan Permukiman Perdesaan", "Kawasan Permukiman Perkotaan", "Kawasan Peruntukan Industri", "Kawasan Peruntungan Pertambangan Batuan", "Kawasan Tanaman Pangan","Kawasan Perkebunan"],
      colors: ["rgba(151, 219, 242,1)","rgba(50 ,95 ,40,1)","rgba(75 ,155 ,55,1)","rgba(125 ,180 ,55,1)","rgba(5 ,215 ,215,1)", "rgba(235 ,155 ,60,1)", "rgba(245 ,155 ,30,1)", "rgba(105 ,0 ,0,1)","rgba(95 ,115 ,145,1)","rgba(200 ,245 ,70,1)","#afaf37"],
      legend: { field: "NAMOBJ", type: "category" },
      showLegend: true,
      data: window.json_PolaRuang,
      popupFields: [
        { field: "NAMOBJ", label: "Pola Ruang"}
      ]
    }
  }
};
