// Apps Script for "Заказы / склад" spreadsheet
// Spreadsheet ID: 1WOadxglA7O1NqHFtCVrCKB65tB2Lawl39X7JqNc2bo0
// Handles two actions:
//   1. appendOrder — add order rows to "Заказы" tab
//   2. updateStock — overwrite "Склад" tab with matrix format per model
//
// onEdit trigger sends stock changes back to Supabase via API
// Set script property STOCK_API_URL = https://www.dakifashion.com/api/stock/update-from-sheet
// Set script property STOCK_API_SECRET = (same as STOCK_SYNC_SECRET env var on Vercel)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "appendOrder";

    if (action === "updateStock") {
      return updateStock(data);
    }

    return appendOrder(data);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appendOrder(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Заказы");
  if (!sheet) {
    sheet = ss.insertSheet("Заказы");
    var headers = [
      "№ заказа", "Дата", "Фамилия", "Имя",
      "Телефон", "Почта", "Модель", "Размер", "Цвет",
      "Количество", "Сумма", "Область", "Город", "Отделение",
      "Оплата", "Связаться", "Заметки", "Тип заказа"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.getRange(1, 1, 1, headers.length).setBackground("#4285f4");
    sheet.getRange(1, 1, 1, headers.length).setFontColor("#ffffff");
  }

  var rows = data.rows || [];
  if (rows.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: "No rows" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var values = rows.map(function(r) {
    return [
      r.orderId || "",
      r.date || "",
      r.lastName || "",
      r.firstName || "",
      r.phone || "",
      r.email || "",
      r.model || "",
      r.size || "",
      r.color || "",
      r.quantity || "",
      r.amount || "",
      r.oblast || "",
      r.city || "",
      r.branch || "",
      r.payment || "",
      r.contactMe || "",
      r.notes || "",
      r.orderType || ""
    ];
  });

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, values.length, values[0].length).setValues(values);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, added: values.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateStock(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Склад");
  if (!sheet) {
    sheet = ss.insertSheet("Склад");
  }

  // Clear existing data
  sheet.clear();
  sheet.clearFormats();

  var models = data.models || [];
  if (models.length === 0) {
    sheet.getRange(1, 1).setValue("Нет данных о складе");
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: "No stock data" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var currentRow = 1;

  for (var m = 0; m < models.length; m++) {
    var model = models[m];
    var colors = model.colors || [];
    var sizes = model.sizes || [];

    if (colors.length === 0 || sizes.length === 0) continue;

    // Row 1: Model name (merged across all color columns + 1 for size label)
    var totalCols = colors.length + 1; // 1 for "Размер" column + N color columns
    sheet.getRange(currentRow, 1, 1, totalCols).merge();
    sheet.getRange(currentRow, 1).setValue(model.name + " (" + model.sku + ")");
    sheet.getRange(currentRow, 1).setFontWeight("bold");
    sheet.getRange(currentRow, 1).setFontSize(12);
    sheet.getRange(currentRow, 1).setBackground("#4285f4");
    sheet.getRange(currentRow, 1).setFontColor("#ffffff");
    sheet.getRange(currentRow, 1).setHorizontalAlignment("center");
    currentRow++;

    // Row 2: Headers — "Размер" | Color1 | Color2 | ...
    var headerRow = ["Размер"];
    for (var c = 0; c < colors.length; c++) {
      headerRow.push(colors[c].colorName);
    }
    sheet.getRange(currentRow, 1, 1, headerRow.length).setValues([headerRow]);
    sheet.getRange(currentRow, 1, 1, headerRow.length).setFontWeight("bold");
    sheet.getRange(currentRow, 1, 1, headerRow.length).setBackground("#e8eaf6");
    sheet.getRange(currentRow, 1, 1, headerRow.length).setHorizontalAlignment("center");
    currentRow++;

    var dataStartRow = currentRow; // remember where data rows start

    // Data rows — one per size
    for (var s = 0; s < sizes.length; s++) {
      var dataRow = [sizes[s]];
      for (var c2 = 0; c2 < colors.length; c2++) {
        var qty = (colors[c2].stockPerSize && colors[c2].stockPerSize[sizes[s]]) || 0;
        dataRow.push(qty);
      }
      sheet.getRange(currentRow, 1, 1, dataRow.length).setValues([dataRow]);
      sheet.getRange(currentRow, 1).setFontWeight("bold"); // size label bold
      sheet.getRange(currentRow, 2, 1, colors.length).setHorizontalAlignment("center");
      currentRow++;
    }

    var dataEndRow = currentRow - 1; // last data row

    // ИТОГО row — use SUM formulas for auto-calculation
    sheet.getRange(currentRow, 1).setValue("ИТОГО");
    for (var c3 = 0; c3 < colors.length; c3++) {
      var colLetter = getColumnLetter(c3 + 2); // +2 because col 1 is "Размер"
      var formula = "=SUM(" + colLetter + dataStartRow + ":" + colLetter + dataEndRow + ")";
      sheet.getRange(currentRow, c3 + 2).setFormula(formula);
    }
    sheet.getRange(currentRow, 1, 1, totalCols).setFontWeight("bold");
    sheet.getRange(currentRow, 1, 1, totalCols).setBackground("#f0f0f0");
    sheet.getRange(currentRow, 2, 1, colors.length).setHorizontalAlignment("center");
    currentRow++;

    // Empty row between models
    currentRow++;
  }

  // Auto-resize columns
  var maxCols = sheet.getLastColumn();
  for (var col = 1; col <= maxCols; col++) {
    sheet.autoResizeColumn(col);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, models: models.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper: column number to letter (1=A, 2=B, ... 27=AA)
function getColumnLetter(colNum) {
  var letter = "";
  while (colNum > 0) {
    colNum--;
    letter = String.fromCharCode(65 + (colNum % 26)) + letter;
    colNum = Math.floor(colNum / 26);
  }
  return letter;
}

// ========== BIDIRECTIONAL SYNC: Sheets → Supabase ==========
// Install this as an onEdit trigger:
//   1. In Apps Script editor, go to Triggers (clock icon)
//   2. Add trigger: onStockEdit → From spreadsheet → On edit

function onStockEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "Склад") return; // only track Склад edits

  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();

  // Ignore column A (size labels) and row 1
  if (col < 2 || row < 2) return;

  // Find the model header row (search upward for blue merged row with SKU)
  var modelName = "";
  var sku = "";
  var headerRow = -1;
  for (var r = row; r >= 1; r--) {
    var cellValue = String(sheet.getRange(r, 1).getValue());
    if (cellValue === "Размер") {
      headerRow = r;
      continue;
    }
    // Model header contains "(SKU)" pattern
    var skuMatch = cellValue.match(/\((\d+)\)$/);
    if (skuMatch) {
      sku = skuMatch[1];
      modelName = cellValue;
      break;
    }
    if (cellValue === "ИТОГО") return; // editing ИТОГО row — ignore (it's a formula)
  }

  if (!sku || headerRow === -1) return; // couldn't find context

  // Get the size label from column A of the edited row
  var sizeLabel = String(sheet.getRange(row, 1).getValue());
  if (!sizeLabel || sizeLabel === "Размер" || sizeLabel === "ИТОГО") return;

  // Get the color name from the header row
  var colorName = String(sheet.getRange(headerRow, col).getValue());
  if (!colorName || colorName === "Размер") return;

  // Get the new quantity
  var newQty = Number(e.value) || 0;

  // Send to API
  var apiUrl = PropertiesService.getScriptProperties().getProperty("STOCK_API_URL");
  var apiSecret = PropertiesService.getScriptProperties().getProperty("STOCK_API_SECRET");

  if (!apiUrl || !apiSecret) {
    Logger.log("Missing STOCK_API_URL or STOCK_API_SECRET in script properties");
    return;
  }

  try {
    var response = UrlFetchApp.fetch(apiUrl, {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify({
        secret: apiSecret,
        sku: sku,
        color: colorName,
        size: sizeLabel,
        quantity: newQty
      }),
      muteHttpExceptions: true
    });
    Logger.log("Stock sync response: " + response.getContentText());
  } catch (err) {
    Logger.log("Stock sync error: " + err.message);
  }
}
