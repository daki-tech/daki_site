// Apps Script for "Учет финансов" spreadsheet
// Spreadsheet ID: 1dOMtjAnxGwH-9CPDgFPG2lOzpR2eDrU5wiZFUVax410
// Columns: A=Дата, B=Описание / От кого, C=Валюта, D=Доход, E=Расход
// Row 1: headers + summary labels (G1-I1 for ₴, K1-M1 for $)
// Row 2+: data starts here; G2-I2 and K2-M2 have SUMIFS formulas

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "addFinance") {
      return addFinanceRecord(data);
    }

    if (data.action === "getReport") {
      return getFinanceReport();
    }

    if (data.action === "deleteFinance") {
      return deleteFinanceRecord(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addFinanceRecord(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];

  // Setup headers if needed
  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "Дата") {
    setupHeaders(sheet);
  }

  var amount = Number(data.amount) || 0;
  var isIncome = data.type !== "expense";
  var currency = data.currency || "грн";

  var row = [
    data.date || "",           // A: Дата (dd.mm.yyyy)
    data.description || "",    // B: Описание / От кого
    currency,                  // C: Валюта
    isIncome ? amount : "",    // D: Доход
    isIncome ? "" : amount     // E: Расход
  ];

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheet: sheet.getName() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupHeaders(sheet) {
  // Data headers: A=Дата, B=Описание / От кого, C=Валюта, D=Доход, E=Расход
  var headers = ["Дата", "Описание / От кого", "Валюта", "Доход", "Расход"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

  // ₴ totals: G1 label, G2 formula
  sheet.getRange(1, 7).setValue("Итого доход ₴");
  sheet.getRange(1, 7).setFontWeight("bold");
  sheet.getRange(1, 8).setValue("Итого расход ₴");
  sheet.getRange(1, 8).setFontWeight("bold");
  sheet.getRange(1, 9).setValue("Разница ₴");
  sheet.getRange(1, 9).setFontWeight("bold");

  sheet.getRange(2, 7).setFormula('=SUMIFS(D:D,C:C,"грн")');
  sheet.getRange(2, 7).setFontWeight("bold");
  sheet.getRange(2, 8).setFormula('=SUMIFS(E:E,C:C,"грн")');
  sheet.getRange(2, 8).setFontWeight("bold");
  sheet.getRange(2, 9).setFormula('=G2-H2');
  sheet.getRange(2, 9).setFontWeight("bold");

  // $ totals: K1 label, K2 formula
  sheet.getRange(1, 11).setValue("Итого доход $");
  sheet.getRange(1, 11).setFontWeight("bold");
  sheet.getRange(1, 12).setValue("Итого расход $");
  sheet.getRange(1, 12).setFontWeight("bold");
  sheet.getRange(1, 13).setValue("Разница $");
  sheet.getRange(1, 13).setFontWeight("bold");

  sheet.getRange(2, 11).setFormula('=SUMIFS(D:D,C:C,"дол")');
  sheet.getRange(2, 11).setFontWeight("bold");
  sheet.getRange(2, 12).setFormula('=SUMIFS(E:E,C:C,"дол")');
  sheet.getRange(2, 12).setFontWeight("bold");
  sheet.getRange(2, 13).setFormula('=K2-L2');
  sheet.getRange(2, 13).setFontWeight("bold");
}

// ── Read all data from Google Sheet and return aggregated report ──
function getFinanceReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true, empty: true
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // A=Дата, B=Описание, C=Валюта, D=Доход, E=Расход (5 columns)
  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  var totalIncome = 0;
  var totalExpense = 0;
  var totalIncomeUsd = 0;
  var totalExpenseUsd = 0;
  var incomeByPerson = {};
  var expenseByCategory = {};
  var incomeByPersonUsd = {};
  var expenseByCategoryUsd = {};
  var count = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var description = String(row[1] || "");
    var currency = String(row[2] || "грн");
    var incomeAmt = Number(row[3]) || 0;
    var expenseAmt = Number(row[4]) || 0;

    if (!description && !incomeAmt && !expenseAmt) continue;
    count++;

    if (currency === "дол") {
      if (incomeAmt > 0) {
        totalIncomeUsd += incomeAmt;
        if (description) incomeByPersonUsd[description] = (incomeByPersonUsd[description] || 0) + incomeAmt;
      }
      if (expenseAmt > 0) {
        totalExpenseUsd += expenseAmt;
        if (description) expenseByCategoryUsd[description] = (expenseByCategoryUsd[description] || 0) + expenseAmt;
      }
    } else {
      if (incomeAmt > 0) {
        totalIncome += incomeAmt;
        if (description) incomeByPerson[description] = (incomeByPerson[description] || 0) + incomeAmt;
      }
      if (expenseAmt > 0) {
        totalExpense += expenseAmt;
        if (description) expenseByCategory[description] = (expenseByCategory[description] || 0) + expenseAmt;
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
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
    count: count
  })).setMimeType(ContentService.MimeType.JSON);
}

// ── Delete a finance record by matching date+description+amount ──
function deleteFinanceRecord(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, deleted: 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // A=Дата, B=Описание, C=Валюта, D=Доход, E=Расход
  var rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var deleted = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    var match = true;
    if (data.date && String(rows[i][0]) !== data.date) match = false;
    if (data.description && String(rows[i][1]) !== data.description) match = false;
    if (data.amount) {
      var amt = Number(data.amount);
      var incomeAmt = Number(rows[i][3]) || 0;
      var expenseAmt = Number(rows[i][4]) || 0;
      if (incomeAmt !== amt && expenseAmt !== amt) match = false;
    }
    if (match) {
      sheet.deleteRow(i + 2);
      deleted++;
      if (!data.deleteAll) break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, deleted: deleted }))
    .setMimeType(ContentService.MimeType.JSON);
}
