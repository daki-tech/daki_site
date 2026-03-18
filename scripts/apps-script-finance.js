// Apps Script for "Учет финансов" spreadsheet
// Spreadsheet ID: 1dOMtjAnxGwH-9CPDgFPG2lOzpR2eDrU5wiZFUVax410
// Writes finance records to the LAST sheet (newest season)
// Columns: A=Дата, B=Тип, C=Описание, D=Доход, E=Расход
// Row 1 headers, F1=SUM(D:D), G1=SUM(E:E)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "addFinance") {
      return addFinanceRecord(data);
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
  // Use the last sheet (most recent season)
  var sheet = sheets[sheets.length - 1];

  // Check if headers exist, if not create them
  var firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== "Дата") {
    setupHeaders(sheet);
  }

  var typeLabels = {
    "income_cash": "\ud83d\udcb5 Наличка",
    "income_card": "\ud83d\udcb3 Карта",
    "expense": "\ud83d\udcc9 Расход"
  };

  var typeLabel = typeLabels[data.type] || data.type;
  var amount = Number(data.amount) || 0;
  var isIncome = data.type !== "expense";

  var row = [
    data.date || "",       // A: Дата
    typeLabel,             // B: Тип
    data.description || "",// C: Описание / От кого
    isIncome ? amount : "",// D: Доход
    isIncome ? "" : amount // E: Расход
  ];

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheet: sheet.getName() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupHeaders(sheet) {
  var headers = ["Дата", "Тип", "Описание / От кого", "Доход", "Расход"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.getRange(1, 1, 1, headers.length).setBackground("#4285f4");
  sheet.getRange(1, 1, 1, headers.length).setFontColor("#ffffff");

  // F1 = total income, G1 = total expense
  sheet.getRange(1, 6).setValue("Итого доход");
  sheet.getRange(1, 6).setFontWeight("bold");
  sheet.getRange(1, 6).setBackground("#34a853");
  sheet.getRange(1, 6).setFontColor("#ffffff");
  sheet.getRange(1, 7).setFormula('=SUM(D2:D)');
  sheet.getRange(1, 7).setFontWeight("bold");
  sheet.getRange(1, 7).setBackground("#34a853");
  sheet.getRange(1, 7).setFontColor("#ffffff");

  sheet.getRange(1, 8).setValue("Итого расход");
  sheet.getRange(1, 8).setFontWeight("bold");
  sheet.getRange(1, 8).setBackground("#ea4335");
  sheet.getRange(1, 8).setFontColor("#ffffff");
  sheet.getRange(1, 9).setFormula('=SUM(E2:E)');
  sheet.getRange(1, 9).setFontWeight("bold");
  sheet.getRange(1, 9).setBackground("#ea4335");
  sheet.getRange(1, 9).setFontColor("#ffffff");
}
