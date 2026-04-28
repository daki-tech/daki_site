// Apps Script for "Личные расходы" spreadsheet
// Spreadsheet ID: 1e35Rh9zxgPhNdx81bMj7VvhcoPzrJlcTPMKIETN-4kU
// Columns: A=Дата, B=Описание, C=Валюта, D=Сумма, E=Способ оплаты (наличка/безнал)
// Row 1: headers
// Row 2: overall totals (F=₴, G=$)
// Row 3-4: cash/bank breakdown labels + formulas

var NUM_COLS = 5;
var PAYMENT_COL = 5; // E

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
  var e1 = sheet.getRange(1, 5).getValue();
  if (b1 !== "Описание" || e1 !== "Способ оплаты") {
    setupHeaders(sheet);
  }

  var amount = Number(data.amount) || 0;
  var currency = data.currency || "грн";
  var description = data.description || "";
  var paymentMethod = data.paymentMethod || "безнал";

  var row = [data.date || "", description, currency, amount, paymentMethod];

  var lastDataRow = getLastDataRow(sheet);
  sheet.getRange(lastDataRow + 1, 1, 1, NUM_COLS).setValues([row]);

  // Backfill old empty payment-method cells + ensure summary formulas
  ensureFormulas(sheet);

  return respond({ ok: true });
}

function getLastDataRow(sheet) {
  var colA = sheet.getRange("A:A").getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    if (colA[i][0] !== "") return i + 1;
  }
  return 1;
}

function ensureFormulas(sheet) {
  // Backfill empty E cells in data rows with "безнал"
  var lastDataRow = getLastDataRow(sheet);
  if (lastDataRow >= 2) {
    var eRange = sheet.getRange(2, PAYMENT_COL, lastDataRow - 1, 1);
    var eValues = eRange.getValues();
    var changed = false;
    for (var i = 0; i < eValues.length; i++) {
      if (!eValues[i][0]) {
        eValues[i][0] = "безнал";
        changed = true;
      }
    }
    if (changed) eRange.setValues(eValues);
  }

  // Already set up?
  var f2 = sheet.getRange(2, 6).getFormula();
  if (f2) return;

  // Row 1: Итого ₴ / Итого $
  sheet.getRange(1, 6).setValue("Итого ₴");
  sheet.getRange(1, 7).setValue("Итого $");
  sheet.getRange(1, 6, 1, 2).setFontWeight("bold");

  // Row 2: overall (all payment methods)
  sheet.getRange(2, 6).setFormula('=SUMIFS(D:D,C:C,"грн")');
  sheet.getRange(2, 7).setFormula('=SUMIFS(D:D,C:C,"дол")');

  // Row 3: cash labels
  sheet.getRange(3, 6).setValue("💵 Нал ₴");
  sheet.getRange(3, 7).setValue("💵 Нал $");
  sheet.getRange(3, 6, 1, 2).setFontWeight("bold");

  // Row 4: cash formulas
  sheet.getRange(4, 6).setFormula('=SUMIFS(D:D,C:C,"грн",E:E,"наличка")');
  sheet.getRange(4, 7).setFormula('=SUMIFS(D:D,C:C,"дол",E:E,"наличка")');

  // Row 5: bank labels
  sheet.getRange(5, 6).setValue("💳 Безнал ₴");
  sheet.getRange(5, 7).setValue("💳 Безнал $");
  sheet.getRange(5, 6, 1, 2).setFontWeight("bold");

  // Row 6: bank formulas
  sheet.getRange(6, 6).setFormula('=SUMIFS(D:D,C:C,"грн",E:E,"безнал")');
  sheet.getRange(6, 7).setFormula('=SUMIFS(D:D,C:C,"дол",E:E,"безнал")');
}

function setupHeaders(sheet) {
  // Clear summary area + headers
  sheet.getRange(1, 1, 6, 9).clear();

  var headers = ["Дата", "Описание", "Валюта", "Сумма", "Способ оплаты"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

  ensureFormulas(sheet);
}

function getPersonalReport(req) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var lastDataRow = getLastDataRow(sheet);

  if (lastDataRow < 2) return respond({ ok: true, empty: true });

  var fromDate = req && req.fromDate ? parseDateString(req.fromDate) : null;
  var toDate = req && req.toDate ? parseDateString(req.toDate) : null;

  var data = sheet.getRange(2, 1, lastDataRow - 1, NUM_COLS).getValues();
  var totalExpense = 0, totalExpenseUsd = 0;
  var expenseCash = 0, expenseBank = 0, expenseCashUsd = 0, expenseBankUsd = 0;
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

    var paymentMethod = String(row[PAYMENT_COL - 1] || "безнал").toLowerCase();
    var isCash = paymentMethod === "наличка" || paymentMethod === "cash";
    var isUsd = String(row[2]) === "дол";

    if (isUsd) {
      totalExpenseUsd += amount;
      if (isCash) expenseCashUsd += amount; else expenseBankUsd += amount;
    } else {
      totalExpense += amount;
      if (isCash) expenseCash += amount; else expenseBank += amount;
    }
  }

  if (count === 0) return respond({ ok: true, empty: true });

  return respond({
    ok: true,
    empty: false,
    totalExpense: totalExpense,
    totalExpenseUsd: totalExpenseUsd,
    expenseCash: expenseCash,
    expenseBank: expenseBank,
    expenseCashUsd: expenseCashUsd,
    expenseBankUsd: expenseBankUsd,
    count: count
  });
}
