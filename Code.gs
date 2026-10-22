/** Agranusa Villa Aset - Code.gs (backend v3: satu baris = satu unit, dihitung per model). Runtime: V8 */
var APP_NAME = 'Agranusa Signature Villa Asset';
var TZ = 'Asia/Jakarta';
var JENIS = ['Electronic', 'Machine', 'HVAC', 'Civil Equipment'];
var SHEETS = {
  Master: ['Kode', 'Nama Barang', 'Model', 'Nomor Seri', 'Tanggal Datang', 'Penerima', 'Jenis', 'Lokasi Simpan', 'Harga', 'Garansi', 'Status', 'Lokasi', 'Dibuat', 'Kondisi'],
  Terima: ['Waktu', 'Kode', 'Nama Barang', 'Model', 'Nomor Seri', 'Jenis', 'Tanggal Datang', 'Penerima', 'Lokasi Simpan', 'Harga', 'Garansi'],
  Pasang: ['Waktu', 'Kode', 'Nama Barang', 'Model', 'Nomor Seri', 'Jenis', 'Lokasi', 'Tanggal Pasang', 'Pemasang', 'Catatan'],
  Pindah: ['Waktu', 'Kode', 'Nama Barang', 'Model', 'Nomor Seri', 'Jenis', 'Dari', 'Ke', 'Tanggal Pindah', 'Pemindah', 'Alasan'],
  Ganti: ['Waktu', 'Kode Lama', 'Nama Lama', 'Serial Lama', 'Lokasi', 'Kode Baru', 'Nama Baru', 'Model Baru', 'Serial Baru', 'Jenis', 'Tanggal Ganti', 'Harga Baru', 'Garansi', 'Penggati', 'Catatan'],
  Rusak: ['Waktu', 'Kode', 'Nama Barang', 'Model', 'Nomor Seri', 'Jenis', 'Tanggal Rusak', 'Pelapor', 'Lokasi', 'Status'],
  Riwayat: ['Waktu', 'Kode', 'Nama Barang', 'Nomor Seri', 'Aksi', 'Detail', 'Oleh'],
  Jenis: ['Jenis'],
  Kondisi: ['Kondisi', 'Status']
};
var LABEL = { kode: 'Barang', nama: 'Nama barang', model: 'Model / tipe', serial: 'Nomor seri', tgl: 'Tanggal', penerima: 'Penerima', jenis: 'Jenis barang',
  lokSimpan: 'Lokasi penyimpanan', harga: 'Harga', garansi: 'Garansi', lokasi: 'Lokasi', oleh: 'Nama petugas', ke: 'Tujuan', alasan: 'Alasan',
  nama2: 'Nama barang baru', model2: 'Model barang baru', serial2: 'Serial barang baru', status: 'Status', kondisi: 'Kondisi aset' };
var ssMemo_ = null, shMemo_ = {};
var KONDISI = [{ k: 'Baik, terpakai', s: 'Terpakai' }, { k: 'Baik, tersimpan', s: 'Tersimpan' }, { k: 'Rusak', s: 'Rusak' }];

function doGet() {
  try {
    return HtmlService.createHtmlOutputFromFile('Index').setTitle(APP_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput('<div style="font-family:sans-serif;padding:24px"><h3>' + APP_NAME + '</h3><p>Layanan API aktif.</p>' +
      '<p style="color:#666;font-size:13px">Tampilan Apps Script (file Index) tidak ditemukan. Ini normal jika Anda memakai versi Vercel / APK. Detail: ' +
      String(err.message || err).replace(/</g, '&lt;') + '</p></div>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/**
 * Pintu API untuk aplikasi yang di-hosting di luar Apps Script (Vercel, GitHub, APK).
 * Permintaan: POST teks JSON {fn, args, kode}. Jawaban: {result} atau {error, pesan}.
 * Jika properti skrip KODE_AKSES diisi, setiap permintaan wajib membawa kode yang sama.
 */
function doPost(e) {
  var out;
  try {
    var kodeSet = PropertiesService.getScriptProperties().getProperty('KODE_AKSES');
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (kodeSet && String(req.kode || '') !== String(kodeSet)) {
      out = { error: 'KODE_AKSES', pesan: req.kode ? 'Kode akses salah.' : 'Masukkan kode akses.' };
    } else {
      var daftar = { api_lookup: api_lookup, api_dashboard: api_dashboard, api_search: api_search, api_models: api_models, api_gudang: api_gudang,
        api_katalog: api_katalog, api_byDate: api_byDate, api_history: api_history, api_logs: api_logs, api_addMaster: api_addMaster,
        api_asetLama: api_asetLama, api_pasang: api_pasang, api_pindah: api_pindah, api_ganti: api_ganti, api_rusak: api_rusak };
      var fn = String(req.fn || '');
      if (!Object.prototype.hasOwnProperty.call(daftar, fn)) throw new Error('Fungsi tidak dikenal.');
      var args = Object.prototype.toString.call(req.args) === '[object Array]' ? req.args : [];
      out = { result: daftar[fn].apply(null, args) };
    }
  } catch (err) { out = { error: String(err.message || err), pesan: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
/** Jalankan sekali dari editor. */
function setup() {
  Object.keys(SHEETS).forEach(sheet_);
  var s = ss_(), d = s.getSheetByName('Sheet1') || s.getSheetByName('Lembar1');
  if (d && s.getSheets().length > 1 && d.getLastRow() === 0) s.deleteSheet(d);
  Logger.log('Database: ' + s.getUrl());
}

/** Uji cepat dari editor: pilih cekSistem lalu Jalankan. Hasil langkah demi langkah tampil di Log eksekusi. */
function cekSistem() {
  var hasil = [];
  function langkah(nama, fn) {
    try { hasil.push('OK     ' + nama + (fn() || '')); }
    catch (e) { hasil.push('GAGAL  ' + nama + ': ' + String(e.message || e)); }
  }
  langkah('Buka database', function () { return ' (' + ss_().getUrl() + ')'; });
  Object.keys(SHEETS).forEach(function (n) {
    langkah('Sheet ' + n, function () { return ' (' + Math.max(sheet_(n).getLastRow() - 1, 0) + ' baris data)'; });
  });
  langkah('Dashboard', function () { return ' (total ' + api_dashboard(true).total + ' unit)'; });
  langkah('Cache', function () {
    var c = CacheService.getScriptCache(); c.put('uji', '1', 10);
    if (c.get('uji') !== '1') throw new Error('Cache tidak menyimpan data.');
  });
  langkah('Kunci (Lock)', function () { var l = LockService.getScriptLock(); l.waitLock(5000); l.releaseLock(); });
  langkah('File Index', function () { return ' (' + HtmlService.createHtmlOutputFromFile('Index').getContent().length + ' karakter)'; });
  Logger.log(hasil.join('\n'));
  return hasil.join('\n');
}

/* ---------- helpers ---------- */
function ss_() {
  if (ssMemo_) return ssMemo_;
  var a = SpreadsheetApp.getActiveSpreadsheet();
  if (a) { ssMemo_ = a; return a; }
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('SS_ID');
  if (id) { ssMemo_ = SpreadsheetApp.openById(id); return ssMemo_; }
  var n = SpreadsheetApp.create('Agranusa Signature Villa Asset - Database');
  p.setProperty('SS_ID', n.getId());
  ssMemo_ = n; return n;
}
function head_(sh, h) {
  sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#C9A24B').setFontColor('#1b1408');
  sh.setFrozenRows(1);
}
/** Header kosong/berbeda diperbaiki; kolom baru di ujung ditambahkan tanpa menghapus data lama. */
function perbaikiHeader_(sh, h) {
  var cur = sh.getRange(1, 1, 1, h.length).getValues()[0], k = 0, i;
  while (k < h.length && cur[k] === h[k]) k++;
  if (k === h.length) return;
  if (sh.getLastRow() <= 1) { sh.clear(); head_(sh, h); return; }
  for (i = k; i < h.length; i++) if (cur[i] !== '') return;
  sh.getRange(1, k + 1, 1, h.length - k).setValues([h.slice(k)]).setFontWeight('bold').setBackground('#C9A24B').setFontColor('#1b1408');
}
function sheet_(name) {
  if (shMemo_[name]) return shMemo_[name];
  var s = ss_(), sh = s.getSheetByName(name), h = SHEETS[name], cache = CacheService.getScriptCache(), kunci = 'hdr4:' + name;
  if (!sh) { sh = s.insertSheet(name); head_(sh, h); cache.put(kunci, '1', 21600); }
  else if (!cache.get(kunci)) { try { perbaikiHeader_(sh, h); } catch (e) {} cache.put(kunci, '1', 21600); }
  shMemo_[name] = sh;
  return sh;
}
function toObjs_(v, h) {
  return v.filter(function (r) { return r[0] !== ''; }).map(function (r) { var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o; });
}
function rows_(name) { var v = sheet_(name).getDataRange().getDisplayValues(), h = v.shift(); return toObjs_(v, h); }
function tail_(name, n) {
  var sh = sheet_(name), last = sh.getLastRow(), h = SHEETS[name];
  if (last < 2) return [];
  var st = Math.max(2, last - n + 1);
  return toObjs_(sh.getRange(st, 1, last - st + 1, h.length).getDisplayValues(), h);
}
function append_(name, row) {
  var sh = sheet_(name), rg = sh.getRange(sh.getLastRow() + 1, 1, 1, row.length);
  rg.setNumberFormat('@'); rg.setValues([row]);
}
function now_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function txt_(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 300); }
function money_(v) { var x = Number(String(v).replace(',', '.')); if (isNaN(x) || x < 0) throw new Error('Harga tidak valid.'); return x; }
function need_(d, keys) {
  keys.forEach(function (k) { if (!txt_(d[k])) throw new Error('"' + LABEL[k] + '" wajib diisi.'); });
  if (d.tgl && !/^\d{4}-\d{2}-\d{2}$/.test(d.tgl)) throw new Error('Format tanggal tidak valid.');
}
function run_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); var r = fn(); var ch = CacheService.getScriptCache(); ch.remove('dash'); ch.remove('lists'); ch.remove('kat'); return r; }
  catch (e) { return { ok: false, msg: String(e.message || e) }; }
  finally { try { lock.releaseLock(); } catch (x) {} }
}
/* model yang sama (huruf besar/kecil diabaikan) dihitung sebagai satu kelompok */
function mkey_(it) { return String(it['Model'] || '').trim().toLowerCase(); }
function stats_(list) {
  var m = {};
  list.forEach(function (r) {
    var k = mkey_(r), o = m[k] || (m[k] = { t: 0, Tersimpan: 0, Terpakai: 0, Rusak: 0, Diganti: 0 });
    o.t++; if (o[r['Status']] != null) o[r['Status']]++;
  });
  return m;
}
function view_(it, st) {
  var o = {}, k; for (k in it) o[k] = it[k];
  st = st || stats_(rows_('Master'));
  var s = st[mkey_(it)] || { t: 1, Tersimpan: 0, Terpakai: 0, Rusak: 0, Diganti: 0 };
  o.MTotal = s.t; o.MTerpasang = s.Terpakai; o.MTersimpan = s.Tersimpan; o.MRusak = s.Rusak; o.MDiganti = s.Diganti;
  o.MInfo = s.Terpakai + ' terpasang dari ' + s.t + ' unit';
  return o;
}
function findIn_(list, q) {
  q = txt_(q).toLowerCase(); if (!q) return null;
  var i;
  for (i = 0; i < list.length; i++) if (list[i]['Kode'].toLowerCase() === q) return list[i];
  for (i = 0; i < list.length; i++) if (list[i]['Nomor Seri'].toLowerCase() === q) return list[i];
  return null;
}
function findSerial_(list, s) {
  s = txt_(s).toLowerCase();
  for (var i = 0; i < list.length; i++) if (list[i]['Nomor Seri'].toLowerCase() === s) return list[i];
  return null;
}
function mustItem_(kode) { var it = findIn_(rows_('Master'), kode); if (!it) throw new Error('Barang tidak ditemukan.'); return it; }
function saveItem_(it) {
  var sh = sheet_('Master'), h = SHEETS.Master, col = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getDisplayValues();
  for (var i = 0; i < col.length; i++) if (col[i][0] === it['Kode']) {
    var rg = sh.getRange(i + 2, 1, 1, h.length); rg.setNumberFormat('@');
    rg.setValues([h.map(function (x) { return it[x] == null ? '' : String(it[x]); })]); return;
  }
  throw new Error('Barang tidak ditemukan.');
}
function log_(it, aksi, detail, oleh) { append_('Riwayat', [now_(), it['Kode'], it['Nama Barang'], it['Nomor Seri'], aksi, detail, oleh]); }
function newKode_(list) {
  var ex = {}, k; list.forEach(function (r) { ex[r['Kode']] = 1; });
  var p = 'AVA-' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-', n = list.length + 1;
  do { k = p + ('0000' + n).slice(-4); n++; } while (ex[k]);
  return k;
}
function jenisList_() {
  var l = JENIS.slice();
  rows_('Jenis').forEach(function (r) { if (l.indexOf(r['Jenis']) < 0) l.push(r['Jenis']); });
  return l;
}
function jenis_(j) {
  j = txt_(j, 40); if (!j) throw new Error('Jenis barang wajib diisi.');
  var l = jenisList_();
  for (var i = 0; i < l.length; i++) if (l[i].toLowerCase() === j.toLowerCase()) return l[i];
  append_('Jenis', [j]); return j;
}
/** Daftar jenis dan kondisi (di-cache supaya dashboard cepat). */
function daftar_() {
  var ch = CacheService.getScriptCache(), h = ch.get('lists');
  if (h) return JSON.parse(h);
  var k = KONDISI.slice();
  rows_('Kondisi').forEach(function (r) {
    var ada = k.some(function (x) { return x.k.toLowerCase() === r['Kondisi'].toLowerCase(); });
    if (!ada && ['Terpakai', 'Tersimpan', 'Rusak'].indexOf(r['Status']) > -1) k.push({ k: r['Kondisi'], s: r['Status'] });
  });
  var o = { jenis: jenisList_(), kondisi: k };
  ch.put('lists', JSON.stringify(o), 21600);
  return o;
}
/** Kondisi dikenal -> status sesuai daftar. Kondisi baru disimpan dengan status pilihan pengguna. */
function kondisiStatus_(kon, pilih) {
  if (!kon) throw new Error('"Kondisi aset" wajib diisi.');
  var all = daftar_().kondisi, i;
  for (i = 0; i < all.length; i++) if (all[i].k.toLowerCase() === kon.toLowerCase()) return { k: all[i].k, s: all[i].s };
  if (['Terpakai', 'Tersimpan', 'Rusak'].indexOf(pilih) < 0) throw new Error('Pilih status untuk kondisi baru.');
  append_('Kondisi', [kon, pilih]);
  return { k: kon, s: pilih };
}

/** Model kosong: pakai model terbaru dari nama yang sama; jika belum ada, buat kode MDL-0001 dan seterusnya. */
function modelOtomatis_(list, nama) {
  var k = String(nama || '').toLowerCase().trim(), terbaru = '', maks = 0, i, x;
  for (i = 0; i < list.length; i++) {
    if (list[i]['Nama Barang'].toLowerCase().trim() === k && list[i]['Model']) terbaru = list[i]['Model'];
    x = /^MDL-(\d+)$/i.exec(list[i]['Model']);
    if (x) maks = Math.max(maks, parseInt(x[1], 10));
  }
  if (terbaru) return { m: terbaru, baru: false };
  return { m: 'MDL-' + ('0000' + (maks + 1)).slice(-4), baru: true };
}
function infoModel_(it) {
  return it.ModelOto === 'baru' ? ' Model dibuat otomatis: ' + it['Model'] + '.' : it.ModelOto === 'ada' ? ' Model diisi otomatis sesuai data yang sudah ada: ' + it['Model'] + '.' : '';
}
/** Daftarkan satu unit (satu nomor seri). Dipakai form master baru dan penggantian. */
function create_(d, status, lokasi) {
  need_(d, ['nama', 'serial', 'tgl', 'penerima', 'jenis', 'lokSimpan', 'harga', 'garansi']);
  var serial = txt_(d.serial, 100);
  if (serial.indexOf(',') > -1) throw new Error('Isi satu nomor seri untuk satu barang.');
  var list = rows_('Master'), dup = findSerial_(list, serial);
  if (dup) throw new Error('Nomor seri ' + serial + ' sudah terdaftar (' + dup['Kode'] + ').');
  var model = txt_(d.model, 100), oto = '';
  if (!model) { var mo = modelOtomatis_(list, d.nama); model = mo.m; oto = mo.baru ? 'baru' : 'ada'; }
  var it = { 'Kode': newKode_(list), 'Nama Barang': txt_(d.nama), 'Model': model, 'Nomor Seri': serial, 'Tanggal Datang': d.tgl,
    'Penerima': txt_(d.penerima), 'Jenis': jenis_(d.jenis), 'Lokasi Simpan': txt_(d.lokSimpan), 'Harga': money_(d.harga), 'Garansi': txt_(d.garansi, 40),
    'Status': status, 'Lokasi': lokasi, 'Dibuat': now_(), 'Kondisi': '' };
  append_('Master', SHEETS.Master.map(function (h) { return it[h] == null ? '' : String(it[h]); }));
  append_('Terima', [now_(), it['Kode'], it['Nama Barang'], it['Model'], it['Nomor Seri'], it['Jenis'], it['Tanggal Datang'], it['Penerima'], it['Lokasi Simpan'], it['Harga'], it['Garansi']]);
  it.ModelOto = oto;
  return it;
}

/* ---------- API ---------- */
function api_lookup(q) {
  var l = rows_('Master'), it = findIn_(l, q);
  return { ok: true, found: !!it, item: it ? view_(it, stats_(l)) : null };
}

function api_dashboard(force) {
  var c = CacheService.getScriptCache();
  if (!force) { var h = c.get('dash'); if (h) return JSON.parse(h); }
  var lst = daftar_(), m = rows_('Master'), n = { Tersimpan: 0, Terpakai: 0, Rusak: 0, Diganti: 0 }, keys = {};
  m.forEach(function (x) { if (n[x['Status']] != null) n[x['Status']]++; keys[mkey_(x)] = 1; });
  var res = { ok: true, total: m.length, terpakai: n.Terpakai, tersimpan: n.Tersimpan, rusak: n.Rusak, diganti: n.Diganti,
    model: Object.keys(keys).length, jenis: lst.jenis, kondisi: lst.kondisi, recent: tail_('Riwayat', 8).reverse() };
  c.put('dash', JSON.stringify(res), 120);
  return res;
}

function api_search(q, status) {
  q = txt_(q).toLowerCase();
  var all = rows_('Master'), st = stats_(all);
  var l = all.filter(function (r) {
    if (status && r['Status'] !== status) return false;
    return !q || [r['Kode'], r['Nama Barang'], r['Model'], r['Nomor Seri'], r['Lokasi'], r['Lokasi Simpan'], r['Jenis']].join(' ').toLowerCase().indexOf(q) > -1;
  });
  return { ok: true, total: l.length, items: l.reverse().slice(0, 60).map(function (r) { return view_(r, st); }) };
}

/** Rekap per model: berapa unit, berapa terpasang/tersimpan/rusak. */
function api_models(q) {
  q = txt_(q).toLowerCase();
  var g = {}, ord = [];
  rows_('Master').forEach(function (r) {
    var k = mkey_(r), o = g[k];
    if (!o) { o = g[k] = { Nama: r['Nama Barang'], Model: r['Model'], Jenis: r['Jenis'], Total: 0, Tersimpan: 0, Terpakai: 0, Rusak: 0, Diganti: 0, units: [] }; ord.push(k); }
    o.Total++; if (o[r['Status']] != null) o[r['Status']]++;
    o.units.push({ Kode: r['Kode'], Serial: r['Nomor Seri'], Status: r['Status'], Lokasi: r['Lokasi'], LokSimpan: r['Lokasi Simpan'], Datang: r['Tanggal Datang'], Penerima: r['Penerima'], Harga: r['Harga'], Garansi: r['Garansi'], Kondisi: r['Kondisi'] });
  });
  var out = ord.map(function (k) { return g[k]; }).filter(function (m) {
    return !q || [m.Nama, m.Model, m.Jenis].concat(m.units.map(function (u) { return u.Serial; })).join(' ').toLowerCase().indexOf(q) > -1;
  });
  out.sort(function (a, b) { return a.Nama.localeCompare(b.Nama); });
  return { ok: true, models: out.slice(0, 80) };
}

/** Gudang Aset: semua unit dikelompokkan per kategori (jenis). */
function api_gudang() {
  var all = rows_('Master'), g = {}, ord = [];
  all.forEach(function (r) {
    var k = r['Jenis'] || 'Lainnya', o = g[k];
    if (!o) { o = g[k] = { Jenis: k, Total: 0, Tersimpan: 0, Terpakai: 0, Rusak: 0, Diganti: 0, items: [] }; ord.push(k); }
    o.Total++; if (o[r['Status']] != null) o[r['Status']]++;
    o.items.push({ Kode: r['Kode'], Nama: r['Nama Barang'], Model: r['Model'], Serial: r['Nomor Seri'], Status: r['Status'], Lokasi: r['Lokasi'], LokSimpan: r['Lokasi Simpan'], Harga: r['Harga'], Datang: r['Tanggal Datang'], Penerima: r['Penerima'], Garansi: r['Garansi'], Kondisi: r['Kondisi'] });
  });
  ord.sort(function (a, b) { return a.localeCompare(b); });
  return { ok: true, total: all.length, groups: ord.map(function (k) {
    g[k].items.sort(function (a, b) { return (a.Nama + a.Serial).localeCompare(b.Nama + b.Serial); });
    return g[k];
  }) };
}

/** Katalog nama dan model yang sudah terdaftar (untuk rekomendasi saat mengetik nama barang). */
function api_katalog() {
  var ch = CacheService.getScriptCache(), h = ch.get('kat');
  if (h) return JSON.parse(h);
  var g = {}, ord = [];
  rows_('Master').forEach(function (r) {
    var k = (r['Nama Barang'] + '|' + r['Model']).toLowerCase(), o = g[k];
    if (!o) { o = g[k] = { n: r['Nama Barang'], m: r['Model'], j: r['Jenis'], c: 0, t: '' }; ord.push(k); }
    o.c++; if ((r['Dibuat'] || '') > o.t) o.t = r['Dibuat'] || '';
  });
  var res = { ok: true, items: ord.map(function (k) { return g[k]; }) };
  try { ch.put('kat', JSON.stringify(res), 21600); } catch (e) {}
  return res;
}

var DATE_MAP = {
  Terima: ['Datang', function (r) { return { d: r['Tanggal Datang'], k: r['Kode'], n: r['Nama Barang'], m: r['Model'], s: r['Nomor Seri'], t: 'Diterima ' + r['Penerima'] + ', simpan di ' + r['Lokasi Simpan'] }; }],
  Pasang: ['Pasang', function (r) { return { d: r['Tanggal Pasang'], k: r['Kode'], n: r['Nama Barang'], m: r['Model'], s: r['Nomor Seri'], t: 'Dipasang di ' + r['Lokasi'] + ' oleh ' + r['Pemasang'] }; }],
  Pindah: ['Pindah', function (r) { return { d: r['Tanggal Pindah'], k: r['Kode'], n: r['Nama Barang'], m: r['Model'], s: r['Nomor Seri'], t: r['Dari'] + ' ke ' + r['Ke'] + '. ' + r['Alasan'] }; }],
  Ganti: ['Ganti', function (r) { return { d: r['Tanggal Ganti'], k: r['Kode Lama'], n: r['Nama Lama'], m: '', s: r['Serial Lama'], t: 'Diganti ' + r['Nama Baru'] + ' (SN ' + r['Serial Baru'] + ') di ' + r['Lokasi'] }; }],
  Rusak: ['Rusak', function (r) { return { d: r['Tanggal Rusak'], k: r['Kode'], n: r['Nama Barang'], m: r['Model'], s: r['Nomor Seri'], t: 'Rusak di ' + r['Lokasi'] + ', ' + r['Status'] + '. Pelapor ' + r['Pelapor'] }; }]
};
/** Cari kegiatan berdasarkan tanggal (tipe kosong = semua jenis kegiatan). */
function api_byDate(tipe, dari, ke) {
  var re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dari) || !re.test(ke)) return { ok: false, msg: 'Tanggal tidak valid.' };
  var types = tipe ? [tipe] : Object.keys(DATE_MAP), out = [];
  types.forEach(function (t) {
    if (!DATE_MAP[t]) return;
    rows_(t).forEach(function (r) {
      var x = DATE_MAP[t][1](r);
      if (x.d >= dari && x.d <= ke) out.push({ Tipe: DATE_MAP[t][0], Tanggal: x.d, Kode: x.k, Nama: x.n, Model: x.m, Serial: x.s, Detail: x.t });
    });
  });
  out.sort(function (a, b) { return a.Tanggal < b.Tanggal ? 1 : -1; });
  return { ok: true, rows: out.slice(0, 200) };
}

function api_history(kode) {
  var l = rows_('Master'), it = findIn_(l, kode);
  if (!it) return { ok: false, msg: 'Barang tidak ditemukan.' };
  return { ok: true, item: view_(it, stats_(l)), history: rows_('Riwayat').filter(function (r) { return r['Kode'] === it['Kode']; }).reverse() };
}

function api_logs(name) {
  if (['Terima', 'Pasang', 'Pindah', 'Ganti', 'Rusak'].indexOf(name) < 0) return { ok: false, msg: 'Log tidak dikenal.' };
  return { ok: true, rows: rows_(name).reverse().slice(0, 150) };
}

function api_addMaster(d) {
  return run_(function () {
    var it = create_(d, 'Tersimpan', txt_(d.lokSimpan)), v = view_(it);
    log_(it, 'Terima barang', it['Model'] + ' diterima ' + it['Penerima'] + ' pada ' + it['Tanggal Datang'], it['Penerima']);
    return { ok: true, msg: 'Master barang tersimpan. Model ini sekarang ' + v.MTotal + ' unit.' + infoModel_(it), item: v, printable: true };
  });
}

/** Tambah aset lama: langsung masuk Gudang Aset (Master). Nomor seri kosong dibuat otomatis. Kondisi bisa ditambah sendiri. */
function api_asetLama(d) {
  return run_(function () {
    need_(d, ['nama', 'jenis', 'lokasi', 'kondisi']);
    var list = rows_('Master'), serial = txt_(d.serial, 100), otomatis = !serial;
    if (serial.indexOf(',') > -1) throw new Error('Isi satu nomor seri untuk satu aset.');
    if (serial && findSerial_(list, serial)) throw new Error('Nomor seri ' + serial + ' sudah terdaftar (' + findSerial_(list, serial)['Kode'] + ').');
    var kode = newKode_(list), lok = txt_(d.lokasi), model = txt_(d.model, 100), oto = '';
    if (!model) { var mo = modelOtomatis_(list, d.nama); model = mo.m; oto = mo.baru ? 'baru' : 'ada'; }
    if (otomatis) {
      var dasar = 'AL-' + kode.slice(4), n = 0; serial = dasar;
      while (findSerial_(list, serial)) { n++; serial = dasar + '-' + n; }
    }
    var harga = txt_(d.harga) ? money_(d.harga) : '';
    var kon = kondisiStatus_(txt_(d.kondisi, 40), d.kondisiStatus), status = kon.s;
    var it = { 'Kode': kode, 'Nama Barang': txt_(d.nama), 'Model': model, 'Nomor Seri': serial, 'Tanggal Datang': '-',
      'Penerima': '-', 'Jenis': jenis_(d.jenis), 'Lokasi Simpan': status === 'Tersimpan' ? lok : '-', 'Harga': harga, 'Garansi': '-',
      'Status': status, 'Lokasi': lok, 'Dibuat': now_(), 'Kondisi': kon.k };
    append_('Master', SHEETS.Master.map(function (h) { return it[h] == null ? '' : String(it[h]); }));
    log_(it, 'Aset lama ditambahkan', kon.k + ' di ' + lok + (otomatis ? ' (nomor seri otomatis)' : ''), '-');
    var v = view_(it);
    return { ok: true, msg: 'Aset lama tersimpan di Gudang Aset.' + (otomatis ? ' Nomor seri dibuat otomatis: ' + serial + '.' : '') + ' Model ini sekarang ' + v.MTotal + ' unit.' + (oto === 'baru' ? ' Model dibuat otomatis: ' + model + '.' : oto === 'ada' ? ' Model diisi otomatis sesuai data yang sudah ada: ' + model + '.' : ''), item: v, printable: true };
  });
}

function api_pasang(d) {
  return run_(function () {
    need_(d, ['kode', 'lokasi', 'tgl', 'oleh']);
    var it = mustItem_(d.kode), lok = txt_(d.lokasi);
    if (it['Status'] !== 'Tersimpan') throw new Error('Barang berstatus ' + it['Status'] + '. Hanya barang Tersimpan yang bisa dipasang.');
    it['Status'] = 'Terpakai'; it['Lokasi'] = lok; saveItem_(it);
    append_('Pasang', [now_(), it['Kode'], it['Nama Barang'], it['Model'], it['Nomor Seri'], it['Jenis'], lok, d.tgl, txt_(d.oleh), txt_(d.catatan, 1000)]);
    log_(it, 'Pasang barang', 'Dipasang di ' + lok + ' pada ' + d.tgl + (d.catatan ? '. ' + txt_(d.catatan, 300) : ''), txt_(d.oleh));
    var v = view_(it);
    return { ok: true, msg: 'Pemasangan tercatat. Model ini: ' + v.MInfo + '.', item: v };
  });
}

function api_pindah(d) {
  return run_(function () {
    need_(d, ['kode', 'tgl', 'oleh', 'ke', 'alasan']);
    var it = mustItem_(d.kode), ke = txt_(d.ke), dari = it['Lokasi'];
    if (it['Status'] !== 'Terpakai') throw new Error('Hanya barang yang sedang terpakai yang bisa dipindah.');
    if (dari === ke) throw new Error('Lokasi tujuan sama dengan lokasi sekarang.');
    it['Lokasi'] = ke; saveItem_(it);
    append_('Pindah', [now_(), it['Kode'], it['Nama Barang'], it['Model'], it['Nomor Seri'], it['Jenis'], dari, ke, d.tgl, txt_(d.oleh), txt_(d.alasan, 1000)]);
    log_(it, 'Pindah barang', dari + ' ke ' + ke + ' pada ' + d.tgl + '. Alasan: ' + txt_(d.alasan, 300), txt_(d.oleh));
    return { ok: true, msg: 'Pemindahan tercatat.', item: view_(it) };
  });
}

function api_ganti(d) {
  return run_(function () {
    need_(d, ['kode', 'nama2', 'serial2', 'jenis', 'tgl', 'harga', 'oleh', 'garansi']);
    var old = mustItem_(d.kode), lok = old['Lokasi'], nu = null;
    if (['Terpakai', 'Rusak'].indexOf(old['Status']) < 0) throw new Error('Hanya barang terpakai atau rusak yang bisa diganti.');
    money_(d.harga);
    if (d.kode2) {
      nu = mustItem_(d.kode2);
      if (nu['Kode'] === old['Kode'] || nu['Status'] !== 'Tersimpan') throw new Error('Barang pengganti harus berstatus Tersimpan.');
    } else if (findSerial_(rows_('Master'), d.serial2)) throw new Error('Nomor seri pengganti sudah terdaftar.');
    old['Status'] = 'Diganti'; old['Lokasi'] = '-'; saveItem_(old);
    if (nu) { nu['Status'] = 'Terpakai'; nu['Lokasi'] = lok; saveItem_(nu); }
    else nu = create_({ nama: d.nama2, model: d.model2, serial: d.serial2, tgl: d.tgl, penerima: d.oleh, jenis: d.jenis, lokSimpan: '-', harga: d.harga, garansi: d.garansi }, 'Terpakai', lok);
    append_('Ganti', [now_(), old['Kode'], old['Nama Barang'], old['Nomor Seri'], lok, nu['Kode'], nu['Nama Barang'], nu['Model'], nu['Nomor Seri'], nu['Jenis'], d.tgl, money_(d.harga), txt_(d.garansi, 40), txt_(d.oleh), txt_(d.catatan, 1000)]);
    log_(old, 'Diganti', 'Digantikan ' + nu['Kode'] + ' (SN ' + nu['Nomor Seri'] + ') di ' + lok + ' pada ' + d.tgl, txt_(d.oleh));
    log_(nu, 'Pasang pengganti', 'Menggantikan ' + old['Kode'] + ' di ' + lok + ' pada ' + d.tgl, txt_(d.oleh));
    return { ok: true, msg: 'Penggantian tercatat. Barang pengganti sudah terdata.', item: view_(nu), printable: true };
  });
}

function api_rusak(d) {
  return run_(function () {
    need_(d, ['kode', 'tgl', 'oleh', 'lokasi', 'status']);
    if (['Belum diganti', 'Sudah diganti'].indexOf(d.status) < 0) throw new Error('Status tidak valid.');
    var it = mustItem_(d.kode), lok = txt_(d.lokasi);
    if (['Terpakai', 'Tersimpan'].indexOf(it['Status']) < 0) throw new Error('Barang sudah berstatus ' + it['Status'] + '.');
    var baru = d.status === 'Sudah diganti' ? 'Diganti' : 'Rusak';
    it['Status'] = baru; it['Lokasi'] = baru === 'Rusak' ? lok : '-'; saveItem_(it);
    append_('Rusak', [now_(), it['Kode'], it['Nama Barang'], it['Model'], it['Nomor Seri'], it['Jenis'], d.tgl, txt_(d.oleh), lok, d.status]);
    log_(it, 'Barang rusak', 'Rusak di ' + lok + ' pada ' + d.tgl + '. ' + d.status, txt_(d.oleh));
    return { ok: true, msg: 'Laporan kerusakan tercatat.', item: view_(it) };
  });
}
