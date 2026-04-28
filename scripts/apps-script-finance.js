// Apps Script for "Учет финансов" spreadsheet
// Spreadsheet ID: 1dOMtjAnxGwH-9CPDgFPG2lOzpR2eDrU5wiZFUVax410
// Columns: A=Дата, B=Описание / От кого, C=Валюта, D=Доход,
//          E=Зарплата, F=Фурнитура/кнопки, G=Ткань, H=Цех,
//          I=Разработка новой коллекции, J=Способ оплаты (наличка/безнал)
// Row 1: headers + summary labels (K-M for ₴, O-Q for $)
// Row 2: overall totals
// Row 3-4: cash totals (label + formula)
// Row 5-6: bank totals (label + formula)

var CATEGORY_COLS = {
  "Зарплата": 5,
  "Фурнитура/кнопки": 6,
  "Ткань": 7,
  "Цех": 8,
  "Разработка новой коллекции": 9
};

var PAYMENT_COL = 10; // J

var NUM_COLS = 10;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "addFinance") return addFinanceRecord(data);
    if (data.action === "getReport") return getFinanceReport(data);
    if (data.action === "deleteFinance") return deleteFinanceRecord(data);
    return respond({ ok: false, error: "Unknown action" });
  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
}

/** Parse "DD.MM.YYYY" → Date object at midnight, or null. */
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

function addFinanceRecord(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];

  // Setup headers if structure doesn't match
  var b1 = sheet.getRange(1, 2).getValue();
  var j1 = sheet.getRange(1, 10).getValue();
  if (b1 !== "Описание / От кого" || j1 !== "Способ оплаты") {
    setupHeaders(sheet);
  }

  var amount = Number(data.amount) || 0;
  var currency = data.currency || "грн";
  var isIncome = data.type !== "expense";
  var description = data.description || "";
  var paymentMethod = data.paymentMethod || "безнал";

  var row = [];
  for (var i = 0; i < NUM_COLS; i++) row.push("");

  row[0] = data.date || "";
  row[1] = description;
  row[2] = currency;

  if (isIncome) {
    row[3] = amount;
  } else if (data.category) {
    var col = CATEGORY_COLS[data.category];
    if (col) row[col - 1] = amount;
  }

  row[PAYMENT_COL - 1] = paymentMethod;

  // Use column A to find last data row (getLastRow() counts formula cells)
  var lastDataRow = getLastDataRow(sheet);
  sheet.getRange(lastDataRow + 1, 1, 1, NUM_COLS).setValues([row]);

  // Backfill old empty payment-method cells with "безнал" + recreate summary formulas if missing
  ensureFormulas(sheet);

  return respond({ ok: true, sheet: sheet.getName() });
}

function ensureFormulas(sheet) {
  // Backfill empty J cells in data rows (≥ row 2) with "безнал"
  var lastDataRow = getLastDataRow(sheet);
  if (lastDataRow >= 2) {
    var jRange = sheet.getRange(2, PAYMENT_COL, lastDataRow - 1, 1);
    var jValues = jRange.getValues();
    var changed = false;
    for (var i = 0; i < jValues.length; i++) {
      if (!jValues[i][0]) {
        jValues[i][0] = "безнал";
        changed = true;
      }
    }
    if (changed) jRange.setValues(jValues);
  }

  // Check if K2 has a formula; if so, summary cells are intact — nothing to do
  var k2 = sheet.getRange(2, 11).getFormula();
  if (k2) return;

  // Row 1 labels
  sheet.getRange(1, 11).setValue("Итого доход ₴");
  sheet.getRange(1, 12).setValue("Итого расход ₴");
  sheet.getRange(1, 13).setValue("Разница ₴");
  sheet.getRange(1, 15).setValue("Итого доход $");
  sheet.getRange(1, 16).setValue("Итого расход $");
  sheet.getRange(1, 17).setValue("Разница $");
  sheet.getRange(1, 11, 1, 7).setFontWeight("bold");

  // Helper to build the 5-category SUMIFS expression (E..I)
  // with optional currency + payment-method criteria, all hard-coded.
  function expenseSum(currencyText, paymentText) {
    var cols = ["E", "F", "G", "H", "I"];
    var parts = [];
    for (var i = 0; i < cols.length; i++) {
      var formula = 'SUMIFS(' + cols[i] + ':' + cols[i] + ',C:C,"' + currencyText + '"';
      if (paymentText) formula += ',J:J,"' + paymentText + '"';
      formula += ')';
      parts.push(formula);
    }
    return "=" + parts.join("+");
  }

  // Row 2: overall totals (all payment methods)
  sheet.getRange(2, 11).setFormula('=SUMIFS(D:D,C:C,"грн")');
  sheet.getRange(2, 12).setFormula(expenseSum("грн", null));
  sheet.getRange(2, 13).setFormula("=K2-L2");
  sheet.getRange(2, 15).setFormula('=SUMIFS(D:D,C:C,"дол")');
  sheet.getRange(2, 16).setFormula(expenseSum("дол", null));
  sheet.getRange(2, 17).setFormula("=O2-P2");

  // Row 3 labels (cash)
  sheet.getRange(3, 11).setValue("💵 Нал доход ₴");
  sheet.getRange(3, 12).setValue("💵 Нал расход ₴");
  sheet.getRange(3, 15).setValue("💵 Нал доход $");
  sheet.getRange(3, 16).setValue("💵 Нал расход $");
  sheet.getRange(3, 11, 1, 7).setFontWeight("bold");

  // Row 4: cash formulas (J = "наличка")
  sheet.getRange(4, 11).setFormula('=SUMIFS(D:D,C:C,"грн",J:J,"наличка")');
  sheet.getRange(4, 12).setFormula(expenseSum("грн", "наличка"));
  sheet.getRange(4, 15).setFormula('=SUMIFS(D:D,C:C,"дол",J:J,"наличка")');
  sheet.getRange(4, 16).setFormula(expenseSum("дол", "наличка"));

  // Row 5 labels (bank)
  sheet.getRange(5, 11).setValue("💳 Безнал доход ₴");
  sheet.getRange(5, 12).setValue("💳 Безнал расход ₴");
  sheet.getRange(5, 15).setValue("💳 Безнал доход $");
  sheet.getRange(5, 16).setValue("💳 Безнал расход $");
  sheet.getRange(5, 11, 1, 7).setFontWeight("bold");

  // Row 6: bank formulas (J = "безнал")
  sheet.getRange(6, 11).setFormula('=SUMIFS(D:D,C:C,"грн",J:J,"безнал")');
  sheet.getRange(6, 12).setFormula(expenseSum("грн", "безнал"));
  sheet.getRange(6, 15).setFormula('=SUMIFS(D:D,C:C,"дол",J:J,"безнал")');
  sheet.getRange(6, 16).setFormula(expenseSum("дол", "безнал"));
}

function getLastDataRow(sheet) {
  var colA = sheet.getRange("A:A").getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    if (colA[i][0] !== "") return i + 1;
  }
  return 1; // only header row
}

function setupHeaders(sheet) {
  // Clear all summary area + headers
  sheet.getRange(1, 1, 6, 20).clear();

  var headers = ["Дата", "Описание / От кого", "Валюта", "Доход",
    "Зарплата", "Фурнитура/кнопки", "Ткань", "Цех",
    "Разработка новой коллекции", "Способ оплаты"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

  // Forces ensureFormulas to recreate everything below
  ensureFormulas(sheet);
}

function getFinanceReport(req) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];
  var lastDataRow = getLastDataRow(sheet);

  if (lastDataRow < 2) {
    return respond({ ok: true, empty: true });
  }

  var fromDate = req && req.fromDate ? parseDateString(req.fromDate) : null;
  var toDate = req && req.toDate ? parseDateString(req.toDate) : null;

  var data = sheet.getRange(2, 1, lastDataRow - 1, NUM_COLS).getValues();

  var totalIncome = 0, totalExpense = 0;
  var totalIncomeUsd = 0, totalExpenseUsd = 0;
  var incomeCash = 0, incomeBank = 0, expenseCash = 0, expenseBank = 0;
  var incomeCashUsd = 0, incomeBankUsd = 0, expenseCashUsd = 0, expenseBankUsd = 0;
  var incomeByPerson = {}, incomeByPersonUsd = {};
  var expenseByCategory = {}, expenseByCategoryUsd = {};
  var count = 0;
  var categoryNames = Object.keys(CATEGORY_COLS);

  for (var i = 0; i < data.length; i++) {
    var row = data[i];

    // Filter by date range if requested
    if (fromDate || toDate) {
      var rowDate = parseDateString(row[0]);
      if (!rowDate) continue;
      if (fromDate && rowDate < fromDate) continue;
      if (toDate && rowDate > toDate) continue;
    }

    var description = String(row[1] || "");
    var currency = String(row[2] || "грн");
    var incomeAmt = Number(row[3]) || 0;
    var paymentMethod = String(row[PAYMENT_COL - 1] || "безнал").toLowerCase();
    var isCash = paymentMethod === "наличка" || paymentMethod === "cash";
    var isUsd = currency === "дол";

    var expenseAmt = 0;
    for (var j = 4; j < 9; j++) { // expense category cols E..I (indexes 4..8)
      expenseAmt += Number(row[j]) || 0;
    }

    if (!description && !incomeAmt && !expenseAmt) continue;
    count++;

    if (incomeAmt > 0) {
      if (isUsd) {
        totalIncomeUsd += incomeAmt;
        if (isCash) incomeCashUsd += incomeAmt; else incomeBankUsd += incomeAmt;
        if (description) incomeByPersonUsd[description] = (incomeByPersonUsd[description] || 0) + incomeAmt;
      } else {
        totalIncome += incomeAmt;
        if (isCash) incomeCash += incomeAmt; else incomeBank += incomeAmt;
        if (description) incomeByPerson[description] = (incomeByPerson[description] || 0) + incomeAmt;
      }
    }

    if (expenseAmt > 0) {
      for (var k = 0; k < categoryNames.length; k++) {
        var catName = categoryNames[k];
        var colIdx = CATEGORY_COLS[catName] - 1;
        var catAmt = Number(row[colIdx]) || 0;
        if (catAmt > 0) {
          if (isUsd) {
            totalExpenseUsd += catAmt;
            if (isCash) expenseCashUsd += catAmt; else expenseBankUsd += catAmt;
            expenseByCategoryUsd[catName] = (expenseByCategoryUsd[catName] || 0) + catAmt;
          } else {
            totalExpense += catAmt;
            if (isCash) expenseCash += catAmt; else expenseBank += catAmt;
            expenseByCategory[catName] = (expenseByCategory[catName] || 0) + catAmt;
          }
        }
      }
    }
  }

  if (count === 0) {
    return respond({ ok: true, empty: true });
  }

  return respond({
    ok: true,
    empty: false,
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    incomeByPerson: incomeByPerson,
    expenseByCategory: expenseByCategory,
    totalIncomeUsd: totalIncomeUsd,
    totalExpenseUsd: totalExpenseUsd,
    incomeByPersonUsd: incomeByPersonUsd,
    expenseByCategoryUsd: expenseByCategoryUsd,
    incomeCash: incomeCash,
    incomeBank: incomeBank,
    expenseCash: expenseCash,
    expenseBank: expenseBank,
    incomeCashUsd: incomeCashUsd,
    incomeBankUsd: incomeBankUsd,
    expenseCashUsd: expenseCashUsd,
    expenseBankUsd: expenseBankUsd,
    count: count
  });
}

function deleteFinanceRecord(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];
  var lastDataRow = getLastDataRow(sheet);

  if (lastDataRow < 2) {
    return respond({ ok: true, deleted: 0 });
  }

  var rows = sheet.getRange(2, 1, lastDataRow - 1, NUM_COLS).getValues();
  var deleted = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    var match = true;
    if (data.date && String(rows[i][0]) !== data.date) match = false;
    if (data.description && String(rows[i][1]) !== data.description) match = false;
    if (data.amount) {
      var amt = Number(data.amount);
      var found = false;
      if (Number(rows[i][3]) === amt) found = true;
      for (var j = 4; j < 9; j++) {
        if (Number(rows[i][j]) === amt) found = true;
      }
      if (!found) match = false;
    }
    if (match) {
      sheet.deleteRow(i + 2);
      deleted++;
      if (!data.deleteAll) break;
    }
  }

  return respond({ ok: true, deleted: deleted });
}
