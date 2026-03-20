// Apps Script for "Учет финансов" spreadsheet
// Spreadsheet ID: 1dOMtjAnxGwH-9CPDgFPG2lOzpR2eDrU5wiZFUVax410
// New format (no "Тип" column):
// Columns: A=Дата, B=Описание / От кого, C=Доход, D=Расход
// Row 1 headers, F1="Итого доход", G1="Итого расход", H1="Разница"
// Row 2 formulas: F2=SUM(C2:C), G2=SUM(D2:D), H2=F2-G2

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

  var row = [
    data.date || "",           // A: Дата (dd.mm.yyyy)
    data.description || "",    // B: Описание / От кого
    isIncome ? amount : "",    // C: Доход
    isIncome ? "" : amount     // D: Расход
  ];

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheet: sheet.getName() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupHeaders(sheet) {
  // Set proper headers: A=Дата, B=Описание / От кого, C=Доход, D=Расход
  var headers = ["Дата", "Описание / От кого", "Доход", "Расход"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.getRange(1, 1, 1, headers.length).setBackground("#4285f4");
  sheet.getRange(1, 1, 1, headers.length).setFontColor("#ffffff");

  // F1 = "Итого доход" label, F2 = SUM formula
  sheet.getRange(1, 6).setValue("Итого доход");
  sheet.getRange(1, 6).setFontWeight("bold");
  sheet.getRange(1, 6).setBackground("#34a853");
  sheet.getRange(1, 6).setFontColor("#ffffff");
  sheet.getRange(2, 6).setFormula('=SUM(C2:C)');
  sheet.getRange(2, 6).setFontWeight("bold");
  sheet.getRange(2, 6).setBackground("#34a853");
  sheet.getRange(2, 6).setFontColor("#ffffff");

  // G1 = "Итого расход" label, G2 = SUM formula
  sheet.getRange(1, 7).setValue("Итого расход");
  sheet.getRange(1, 7).setFontWeight("bold");
  sheet.getRange(1, 7).setBackground("#ea4335");
  sheet.getRange(1, 7).setFontColor("#ffffff");
  sheet.getRange(2, 7).setFormula('=SUM(D2:D)');
  sheet.getRange(2, 7).setFontWeight("bold");
  sheet.getRange(2, 7).setBackground("#ea4335");
  sheet.getRange(2, 7).setFontColor("#ffffff");

  // H1 = "Разница" label, H2 = F2-G2 formula
  sheet.getRange(1, 8).setValue("Разница");
  sheet.getRange(1, 8).setFontWeight("bold");
  sheet.getRange(1, 8).setBackground("#fbbc04");
  sheet.getRange(1, 8).setFontColor("#ffffff");
  sheet.getRange(2, 8).setFormula('=F2-G2');
  sheet.getRange(2, 8).setFontWeight("bold");
  sheet.getRange(2, 8).setBackground("#fbbc04");
  sheet.getRange(2, 8).setFontColor("#ffffff");
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

  // New format: A=Дата, B=Описание, C=Доход, D=Расход (4 columns)
  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

  var totalIncome = 0;
  var totalExpense = 0;
  var incomeByPerson = {};
  var expenseByCategory = {};
  var count = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var description = String(row[1] || "");
    var incomeAmt = Number(row[2]) || 0;
    var expenseAmt = Number(row[3]) || 0;

    if (!description && !incomeAmt && !expenseAmt) continue;
    count++;

    if (incomeAmt > 0) {
      totalIncome += incomeAmt;
      if (description) {
        incomeByPerson[description] = (incomeByPerson[description] || 0) + incomeAmt;
      }
    }
    if (expenseAmt > 0) {
      totalExpense += expenseAmt;
      if (description) {
        expenseByCategory[description] = (expenseByCategory[description] || 0) + expenseAmt;
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

  // New format: A=Дата, B=Описание, C=Доход, D=Расход
  var rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var deleted = 0;

  for (var i = rows.length - 1; i >= 0; i--) {
    var match = true;
    if (data.date && String(rows[i][0]) !== data.date) match = false;
    if (data.description && String(rows[i][1]) !== data.description) match = false;
    if (data.amount) {
      var amt = Number(data.amount);
      var incomeAmt = Number(rows[i][2]) || 0;
      var expenseAmt = Number(rows[i][3]) || 0;
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
