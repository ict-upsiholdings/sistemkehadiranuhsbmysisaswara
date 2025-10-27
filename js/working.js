// SESSION_API: tarik data jadual untuk QR
function doGet(e) {
  try {
    // Dapatkan parameter URL
    const urlParam = e.parameter.url;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");

    if (!sheet) throw new Error("Sheet 'Sheet1' tidak dijumpai.");

    // Baca semua data
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Buang header baris pertama

    // Tukar ke JSON
    const jsonData = data.map(row => {
      let obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });

    let result;

    // Jika ada ?url=..., tapis ikut URL
    if (urlParam) {
      result = jsonData.filter(item => item.url?.toString() === urlParam.toString());
      if (result.length === 0) {
        result = [{ status: "not_found", message: `Tiada data untuk URL: ${urlParam}` }];
      }
    } 
    // Jika tiada ?url=..., pulangkan semua
    else {
      result = jsonData;
    }

    // Return sebagai JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// NAMES_API: tarik data senarai nama kehadiran

function doGet(e) {
  // 1️⃣ Dapatkan spreadsheet aktif
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 2️⃣ Dapatkan sheet yang kamu nak (contoh: "Sheet1")
  const sheet = ss.getSheetByName("Sheet1");

  // 3️⃣ Ambil semua data dalam bentuk 2D array
  const data = sheet.getDataRange().getValues();

  // 4️⃣ Tukarkan kepada senarai objek (supaya senang guna JSON)
  const headers = data[0]; // baris pertama sebagai tajuk
  const rows = data.slice(1); // buang tajuk

  const result = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  // 5️⃣ Return JSON
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ENDPOINT_API: tarik data responses
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const params = e.parameter;

  // kalau nak fetch semua tab
  if (!params.sheet) {
    const sheets = ss.getSheets();
    const result = {};
    sheets.forEach(s => {
      const data = s.getDataRange().getValues();
      const headers = data.shift();
      const rows = data.map(r => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });
      result[s.getName()] = rows;
    });
    return sendJSON(result);
  }

  // kalau nak fetch tab tertentu sahaja (contoh: ?sheet=Senarai Modul)
  const sheet = ss.getSheetByName(params.sheet);
  if (!sheet) return sendJSON({ status: "error", message: "Sheet tidak dijumpai: " + params.sheet });

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const rows = data.map(r => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });

  return sendJSON(rows);
}

// Helper untuk output JSON
function sendJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ENDPOINT_POST_API: untuk post dalam responses
function doPost(e) {
  try {
    let data;

    // Cuba parse dari parameter.data (jika dihantar sebagai JSON string)
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } 
    // Fallback: jika dihantar terus sebagai JSON body
    else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } 
    // Fallback terakhir: jika dihantar sebagai form field
    else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error("Tiada data diterima");
    }

    Logger.log("Data diterima: " + JSON.stringify(data));

    // --- BACA PARAMETER URL (?url=1) ---
    const urlParam = e.parameter.url || data.url;
    if (!urlParam) throw new Error("Parameter 'url' tiada dalam request.");

    // --- SPREADSHEET A (Sumber rujukan) ---
    const sourceSS = SpreadsheetApp.openById("1DsIDnZua18x_IwaT2ZOuYKtRtduS5Au84wb0vOLKZow");
    const refSheet = sourceSS.getSheetByName("Sheet1");
    const refData = refSheet.getDataRange().getValues();
    const headers = refData.shift();
    const jsonData = refData.map(r => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });

    // --- CARI DATA BERDASARKAN URL ---
    const match = jsonData.find(item => item.url.toString() === urlParam.toString());
    if (!match) throw new Error("Tiada data dijumpai untuk URL: " + urlParam);

    const sesiName = "Sesi " + urlParam; // contoh: Sesi 4
    const modul = match.modul;
    const tarikhMasa = match.tarikhMasa;

    // --- SPREADSHEET B (Tempat simpan kehadiran) ---
    const targetSS = SpreadsheetApp.openById("16caQXsZKCCeWMBC8N157jGkY2oZQKNLftPkGB2rrHcY");
    let sesiSheet = targetSS.getSheetByName(sesiName);

    // Jika sheet belum wujud, cipta baru
    if (!sesiSheet) {
      sesiSheet = targetSS.insertSheet(sesiName);
      sesiSheet.appendRow(["Nama", "Jabatan", "Trainer/Trainee", "Sesi", "Modul", "Tarikh & Masa", "Masa Hantar"]);
    }

    // --- TAMBAH REKOD KEHADIRAN ---
    sesiSheet.appendRow([
      data.Nama || "",
      data.Jabatan || "",
      data["Trainer/Trainee"] || "",
      sesiName,
      modul,
      tarikhMasa,
      new Date()
    ]);

    return sendJSON({
      status: "success",
      message: `Kehadiran berjaya direkodkan untuk ${sesiName}`,
      modul: modul,
      tarikhMasa: tarikhMasa
    });

  } catch (err) {
    Logger.log("Error in doPost: " + err.toString());
    return sendJSON({
      status: "error",
      message: err.toString()
    });
  }
}

function sendJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}



const SESSION_API   = 'https://script.google.com/macros/s/AKfycbwtr25MW86o5xRG6QG_aoD2dyYYgyWWCHg84bkMewFKbb7KgQS696hJKsw-q34l2O9e/exec';
const NAMES_API     = 'https://script.google.com/macros/s/AKfycbyXpcRl33CyED-n1c1GFBMZhPCFLRZvlkg7x8XUaeycNphGn10iuJzbfMAXp6HTG8Ob/exec';
const ENDPOINT      = 'https://script.google.com/macros/s/AKfycbzcjKMhebb_aqZmeqNdNjqKtRMlaZFs0SC0IZ0Qnle75NkhKT-Bie-yMsMq7ue3a0ED/exec';
const ENDPOINT_POST = 'https://script.google.com/macros/s/AKfycbzRphUTTEXcD8EEkpLJwCa3x6zIjKlxwVlVHINRYwUVUmAKTtRZOHsRLa-azv7nPtGc/exec';