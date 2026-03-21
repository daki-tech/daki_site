// Apps Script for "Учет финансов" spreadsheet
// Spreadsheet ID: 1dOMtjAnxGwH-9CPDgFPG2lOzpR2eDrU5wiZFUVax410
// Columns: A=Дата, B=Описание / От кого, C=Валюта, D=Доход,
//          E=Личное, F=Зарплата, G=Фурнитура/кнопки, H=Ткань, I=Цех, J=Разработка новой коллекции
// Row 1: headers + summary labels (L-N for ₴, P-R for $)
// Row 2+: data; L2-N2 and P2-R2 have SUMIFS formulas

var CATEGORY_COLS = {
  "Личное": 5,
  "Зарплата": 6,
  "Фурнитура/кнопки": 7,
  "Ткань": 8,
  "Цех": 9,
  "Разработка новой коллекции": 10
};

var NUM_COLS = 10;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "addFinance") return addFinanceRecord(data);
    if (data.action === "getReport") return getFinanceReport();
    if (data.action === "deleteFinance") return deleteFinanceRecord(data);
    return respond({ ok: false, error: "Unknown action" });
  } catch (err) {
    return respond({ ok: false, error: err.message });
  }
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
  if (b1 !== "Описание / От кого") {
    setupHeaders(sheet);
  }

  var amount = Number(data.amount) || 0;
  var currency = data.currency || "грн";
  var isIncome = data.type !== "expense";
  var description = data.description || "";

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

  // Use column A to find last data row (getLastRow() counts formula cells in L-R columns)
  var lastDataRow = getLastDataRow(sheet);
  sheet.getRange(lastDataRow + 1, 1, 1, NUM_COLS).setValues([row]);

  return respond({ ok: true, sheet: sheet.getName() });
}

function getLastDataRow(sheet) {
  var colA = sheet.getRange("A:A").getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    if (colA[i][0] !== "") return i + 1;
  }
  return 1; // only header row
}

function setupHeaders(sheet) {
  sheet.getRange(1, 1, 2, 20).clear();

  var headers = ["Дата", "Описание / От кого", "Валюта", "Доход",
    "Личное", "Зарплата", "Фурнитура/кнопки", "Ткань", "Цех", "Разработка новой коллекции"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

  // ₴ totals: L(12), M(13), N(14)
  sheet.getRange(1, 12).setValue("Итого доход ₴");
  sheet.getRange(1, 13).setValue("Итого расход ₴");
  sheet.getRange(1, 14).setValue("Разница ₴");
  sheet.getRange(1, 12, 1, 3).setFontWeight("bold");

  sheet.getRange(2, 12).setFormula('=SUMIFS(D:D;C:C;"грн")');
  sheet.getRange(2, 13).setFormula('=SUMIFS(E:E;C:C;"грн")+SUMIFS(F:F;C:C;"грн")+SUMIFS(G:G;C:C;"грн")+SUMIFS(H:H;C:C;"грн")+SUMIFS(I:I;C:C;"грн")+SUMIFS(J:J;C:C;"грн")');
  sheet.getRange(2, 14).setFormula('=L2-M2');
  sheet.getRange(2, 12, 1, 3).setFontWeight("bold");

  // $ totals: P(16), Q(17), R(18)
  sheet.getRange(1, 16).setValue("Итого доход $");
  sheet.getRange(1, 17).setValue("Итого расход $");
  sheet.getRange(1, 18).setValue("Разница $");
  sheet.getRange(1, 16, 1, 3).setFontWeight("bold");

  sheet.getRange(2, 16).setFormula('=SUMIFS(D:D;C:C;"дол")');
  sheet.getRange(2, 17).setFormula('=SUMIFS(E:E;C:C;"дол")+SUMIFS(F:F;C:C;"дол")+SUMIFS(G:G;C:C;"дол")+SUMIFS(H:H;C:C;"дол")+SUMIFS(I:I;C:C;"дол")+SUMIFS(J:J;C:C;"дол")');
  sheet.getRange(2, 18).setFormula('=P2-Q2');
  sheet.getRange(2, 16, 1, 3).setFontWeight("bold");
}

function getFinanceReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheet = sheets[sheets.length - 1];
  var lastDataRow = getLastDataRow(sheet);

  if (lastDataRow < 2) {
    return respond({ ok: true, empty: true });
  }

  var data = sheet.getRange(2, 1, lastDataRow - 1, NUM_COLS).getValues();

  var totalIncome = 0, totalExpense = 0;
  var totalIncomeUsd = 0, totalExpenseUsd = 0;
  var incomeByPerson = {}, incomeByPersonUsd = {};
  var expenseByCategory = {}, expenseByCategoryUsd = {};
  var count = 0;
  var categoryNames = Object.keys(CATEGORY_COLS);

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var description = String(row[1] || "");
    var currency = String(row[2] || "грн");
    var incomeAmt = Number(row[3]) || 0;
    var isUsd = currency === "дол";

    var expenseAmt = 0;
    for (var j = 4; j < NUM_COLS; j++) {
      expenseAmt += Number(row[j]) || 0;
    }

    if (!description && !incomeAmt && !expenseAmt) continue;
    count++;

    if (incomeAmt > 0) {
      if (isUsd) {
        totalIncomeUsd += incomeAmt;
        if (description) incomeByPersonUsd[description] = (incomeByPersonUsd[description] || 0) + incomeAmt;
      } else {
        totalIncome += incomeAmt;
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
            expenseByCategoryUsd[catName] = (expenseByCategoryUsd[catName] || 0) + catAmt;
          } else {
            totalExpense += catAmt;
            expenseByCategory[catName] = (expenseByCategory[catName] || 0) + catAmt;
          }
        }
      }
    }
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
      for (var j = 4; j < NUM_COLS; j++) {
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
