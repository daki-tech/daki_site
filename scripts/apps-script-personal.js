// Apps Script for "Личные расходы" spreadsheet
// Spreadsheet ID: 1e35Rh9zxgPhNdx81bMj7VvhcoPzrJlcTPMKIETN-4kU
// Columns: A=Дата, B=Описание, C=Валюта, D=Сумма

var NUM_COLS = 4;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "addFinance") return addPersonalRecord(data);
    if (data.action === "getReport") return getPersonalReport(data);
    return respond({ ok: false, error: "Unknown action" });
  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
}

/** Parse "DD.MM.YYYY" → Date at midnight, or null. */
function parseDateString(s) {
  if (!s) return null;
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  var parts = String(s).split(".");
  if (parts.length !== 3) return null;
  var d = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m, d);
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function addPersonalRecord(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];

  var b1 = sheet.getRange(1, 2).getValue();
  if (b1 !== "Описание") {
    setupHeaders(sheet);
  }

  var amount = Number(data.amount) || 0;
  var currency = data.currency || "грн";
  var description = data.description || "";

  var row = [data.date || "", description, currency, amount];

  var lastDataRow = getLastDataRow(sheet);
  sheet.getRange(lastDataRow + 1, 1, 1, NUM_COLS).setValues([row]);

  return respond({ ok: true });
}

function getLastDataRow(sheet) {
  var colA = sheet.getRange("A:A").getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    if (colA[i][0] !== "") return i + 1;
  }
  return 1;
}

function setupHeaders(sheet) {
  var headers = ["Дата", "Описание", "Валюта", "Сумма"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

  // Totals
  sheet.getRange(1, 6).setValue("Итого ₴");
  sheet.getRange(1, 7).setValue("Итого $");
  sheet.getRange(1, 6, 1, 2).setFontWeight("bold");

  sheet.getRange(1, 9).setValue("грн");
  sheet.getRange(2, 9).setValue("дол");
  sheet.getRange(2, 6).setFormula("=SUMIFS(D:D,C:C,I1)");
  sheet.getRange(2, 7).setFormula("=SUMIFS(D:D,C:C,I2)");
}

function getPersonalReport(req) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var lastDataRow = getLastDataRow(sheet);

  if (lastDataRow < 2) {
    return respond({ ok: true, empty: true });
  }

  var fromDate = req && req.fromDate ? parseDateString(req.fromDate) : null;
  var toDate = req && req.toDate ? parseDateString(req.toDate) : null;

  var data = sheet.getRange(2, 1, lastDataRow - 1, NUM_COLS).getValues();
  var totalExpense = 0, totalExpenseUsd = 0;
  var count = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    if (fromDate || toDate) {
      var rowDate = parseDateString(row[0]);
      if (!rowDate) continue;
      if (fromDate && rowDate < fromDate) continue;
      if (toDate && rowDate > toDate) continue;
    }

    var amount = Number(row[3]) || 0;
    if (amount <= 0) continue;
    count++;
    if (String(row[2]) === "дол") {
      totalExpenseUsd += amount;
    } else {
      totalExpense += amount;
    }
  }

  if (count === 0) {
    return respond({ ok: true, empty: true });
  }

  return respond({
    ok: true,
    empty: false,
    totalExpense: totalExpense,
    totalExpenseUsd: totalExpenseUsd,
    count: count
  });
}
