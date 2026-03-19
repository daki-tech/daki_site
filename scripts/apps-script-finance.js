// Apps Script for "Учет финансов" spreadsheet
// Spreadsheet ID: 1dOMtjAnxGwH-9CPDgFPG2lOzpR2eDrU5wiZFUVax410
// Writes finance records to the LAST sheet (newest season)
// Columns: A=Дата, B=Тип, C=Описание, D=Доход, E=Расход
// Row 1 headers, G1="Итого доход", H1="Итого расход", I1="Разница"
// Row 2 formulas: G2=SUM(D2:D), H2=SUM(E2:E), I2=G2-H2

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

  // Check if headers need fixing (old format had "Сумма" in column D)
  var firstCell = sheet.getRange(1, 1).getValue();
  var colD = sheet.getRange(1, 4).getValue();
  if (!firstCell || firstCell !== "Дата" || colD === "Сумма") {
    migrateAndSetupHeaders(sheet);
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
    data.date || "",       // A: Дата (dd.mm.yyyy)
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

function migrateAndSetupHeaders(sheet) {
  // Check if old format with "Сумма" column exists — need to migrate data
  var colD = String(sheet.getRange(1, 4).getValue());
  if (colD === "Сумма") {
    // Old format: A=Дата, B=Тип, C=Описание, D=Сумма, E=Доход, F=Расход
    // Need to: delete column D (Сумма), shift E→D, F→E
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      // Move existing data: read old data rows, rewrite without Сумма column
      var dataRange = sheet.getRange(2, 1, lastRow - 1, 6);
      var oldData = dataRange.getValues();
      var newData = oldData.map(function(row) {
        // row[0]=Дата, row[1]=Тип, row[2]=Описание, row[3]=Сумма(skip), row[4]=Доход, row[5]=Расход
        var dateVal = row[0];
        // Fix date format: convert Date objects or yyyy-mm-dd strings to dd.mm.yyyy
        if (dateVal instanceof Date) {
          var d = dateVal.getDate();
          var m = dateVal.getMonth() + 1;
          var y = dateVal.getFullYear();
          dateVal = (d < 10 ? "0" + d : d) + "." + (m < 10 ? "0" + m : m) + "." + y;
        } else {
          dateVal = String(dateVal);
          var dateMatch = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (dateMatch) {
            dateVal = dateMatch[3] + "." + dateMatch[2] + "." + dateMatch[1];
          }
        }
        // If the old data has amount in Сумма but not in Доход/Расход, migrate it
        var income = row[4] || "";
        var expense = row[5] || "";
        if (!income && !expense && row[3]) {
          // Determine from type if it's income or expense
          var typeStr = String(row[1]);
          if (typeStr.indexOf("Расход") >= 0) {
            expense = Number(row[3]) || 0;
          } else {
            income = Number(row[3]) || 0;
          }
        }
        return [dateVal, row[1], row[2], income, expense];
      });
      // Clear old data area (6 columns)
      sheet.getRange(2, 1, lastRow - 1, 6).clearContent();
      // Write migrated data (5 columns)
      if (newData.length > 0) {
        sheet.getRange(2, 1, newData.length, 5).setValues(newData);
      }
    }
    // Clear old header columns F and beyond
    var lastCol = sheet.getLastColumn();
    if (lastCol > 5) {
      sheet.getRange(1, 6, 1, lastCol - 5).clearContent();
      sheet.getRange(1, 6, 1, lastCol - 5).clearFormat();
    }
  }

  // Set proper headers
  var headers = ["Дата", "Тип", "Описание / От кого", "Доход", "Расход"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.getRange(1, 1, 1, headers.length).setBackground("#4285f4");
  sheet.getRange(1, 1, 1, headers.length).setFontColor("#ffffff");

  // G1 = "Итого доход" label, G2 = SUM formula
  sheet.getRange(1, 7).setValue("Итого доход");
  sheet.getRange(1, 7).setFontWeight("bold");
  sheet.getRange(1, 7).setBackground("#34a853");
  sheet.getRange(1, 7).setFontColor("#ffffff");
  sheet.getRange(2, 7).setFormula('=SUM(D2:D)');
  sheet.getRange(2, 7).setFontWeight("bold");
  sheet.getRange(2, 7).setBackground("#34a853");
  sheet.getRange(2, 7).setFontColor("#ffffff");

  // H1 = "Итого расход" label, H2 = SUM formula
  sheet.getRange(1, 8).setValue("Итого расход");
  sheet.getRange(1, 8).setFontWeight("bold");
  sheet.getRange(1, 8).setBackground("#ea4335");
  sheet.getRange(1, 8).setFontColor("#ffffff");
  sheet.getRange(2, 8).setFormula('=SUM(E2:E)');
  sheet.getRange(2, 8).setFontWeight("bold");
  sheet.getRange(2, 8).setBackground("#ea4335");
  sheet.getRange(2, 8).setFontColor("#ffffff");

  // I1 = "Разница" label, I2 = G2-H2 formula
  sheet.getRange(1, 9).setValue("Разница");
  sheet.getRange(1, 9).setFontWeight("bold");
  sheet.getRange(1, 9).setBackground("#fbbc04");
  sheet.getRange(1, 9).setFontColor("#ffffff");
  sheet.getRange(2, 9).setFormula('=G2-H2');
  sheet.getRange(2, 9).setFontWeight("bold");
  sheet.getRange(2, 9).setBackground("#fbbc04");
  sheet.getRange(2, 9).setFontColor("#ffffff");
}
