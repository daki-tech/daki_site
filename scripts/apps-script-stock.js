// Apps Script for "Склад" spreadsheet (standalone)
// Spreadsheet ID: 11MDGrimwYodp0kJKtsN6AmgwtEKzcJ4U4r_A0tnVroQ
// Handles updateStock action — matrix format per model on first sheet
//
// onEdit trigger sends stock changes back to Supabase via API
// Set script property STOCK_API_URL = https://www.dakifashion.com/api/stock/update-from-sheet
// Set script property STOCK_API_SECRET = (same as STOCK_SYNC_SECRET env var on Vercel)

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "updateStock") {
      return updateStock(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateStock(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // Use first sheet

  var models = data.models || [];
  if (models.length === 0) {
    sheet.clear();
    sheet.getRange(1, 1).setValue("Нет данных о складе");
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: "No stock data" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Build the complete grid in memory first, then write in one batch
  var allRows = [];
  var merges = [];
  var formulas = [];
  var maxCols = 1;

  for (var m = 0; m < models.length; m++) {
    var model = models[m];
    var colors = model.colors || [];
    var sizes = model.sizes || [];

    if (colors.length === 0 || sizes.length === 0) continue;

    var totalCols = colors.length + 1;
    if (totalCols > maxCols) maxCols = totalCols;

    // Model header row
    var modelRow = [model.name + " (" + model.sku + ")"];
    for (var p = 1; p < totalCols; p++) modelRow.push("");
    merges.push({ row: allRows.length + 1, cols: totalCols });
    allRows.push(modelRow);

    // Color header row
    var headerRow = ["Размер"];
    for (var c = 0; c < colors.length; c++) {
      headerRow.push(colors[c].colorName);
    }
    allRows.push(headerRow);

    var dataStartRow = allRows.length + 1;

    // Data rows
    for (var s = 0; s < sizes.length; s++) {
      var dataRow = [sizes[s]];
      for (var c2 = 0; c2 < colors.length; c2++) {
        var qty = (colors[c2].stockPerSize && colors[c2].stockPerSize[sizes[s]]) || 0;
        dataRow.push(qty);
      }
      allRows.push(dataRow);
    }

    var dataEndRow = allRows.length;

    // ИТОГО row
    var itogoRow = ["ИТОГО"];
    for (var c3 = 0; c3 < colors.length; c3++) {
      var colLetter = getColumnLetter(c3 + 2);
      formulas.push({
        row: allRows.length + 1,
        col: c3 + 2,
        formula: "=SUM(" + colLetter + dataStartRow + ":" + colLetter + dataEndRow + ")"
      });
      itogoRow.push(0);
    }
    allRows.push(itogoRow);

    // Empty separator row
    allRows.push([""]);
  }

  // Pad all rows to maxCols width
  for (var i = 0; i < allRows.length; i++) {
    while (allRows[i].length < maxCols) {
      allRows[i].push("");
    }
  }

  // Determine current sheet dimensions
  var oldLastRow = sheet.getLastRow();
  var oldLastCol = sheet.getLastColumn();

  // Unmerge all existing merged cells
  if (oldLastRow > 0 && oldLastCol > 0) {
    var existingMerges = sheet.getRange(1, 1, Math.max(oldLastRow, 1), Math.max(oldLastCol, maxCols)).getMergedRanges();
    for (var em = 0; em < existingMerges.length; em++) {
      existingMerges[em].breakApart();
    }
  }

  // Write all data in one batch
  var newLastRow = allRows.length;
  sheet.getRange(1, 1, newLastRow, maxCols).setValues(allRows);

  // Clear extra rows below
  if (oldLastRow > newLastRow) {
    sheet.getRange(newLastRow + 1, 1, oldLastRow - newLastRow, Math.max(oldLastCol, maxCols)).clearContent();
    sheet.getRange(newLastRow + 1, 1, oldLastRow - newLastRow, Math.max(oldLastCol, maxCols)).clearFormat();
  }

  // Clear extra columns to the right
  if (oldLastCol > maxCols) {
    sheet.getRange(1, maxCols + 1, Math.max(oldLastRow, newLastRow), oldLastCol - maxCols).clearContent();
    sheet.getRange(1, maxCols + 1, Math.max(oldLastRow, newLastRow), oldLastCol - maxCols).clearFormat();
  }

  // Reset formatting
  sheet.getRange(1, 1, newLastRow, maxCols).setFontWeight("normal");
  sheet.getRange(1, 1, newLastRow, maxCols).setFontSize(10);
  sheet.getRange(1, 1, newLastRow, maxCols).setBackground(null);
  sheet.getRange(1, 1, newLastRow, maxCols).setFontColor(null);
  sheet.getRange(1, 1, newLastRow, maxCols).setHorizontalAlignment(null);

  // Apply formatting per model block
  var currentRow = 1;
  for (var m2 = 0; m2 < models.length; m2++) {
    var model2 = models[m2];
    var colors2 = model2.colors || [];
    var sizes2 = model2.sizes || [];
    if (colors2.length === 0 || sizes2.length === 0) continue;

    var totalCols2 = colors2.length + 1;

    // Model header
    sheet.getRange(currentRow, 1, 1, totalCols2).merge();
    sheet.getRange(currentRow, 1).setFontWeight("bold");
    sheet.getRange(currentRow, 1).setFontSize(12);
    sheet.getRange(currentRow, 1).setBackground("#4285f4");
    sheet.getRange(currentRow, 1).setFontColor("#ffffff");
    sheet.getRange(currentRow, 1).setHorizontalAlignment("center");
    currentRow++;

    // Color headers
    sheet.getRange(currentRow, 1, 1, totalCols2).setFontWeight("bold");
    sheet.getRange(currentRow, 1, 1, totalCols2).setBackground("#e8eaf6");
    sheet.getRange(currentRow, 1, 1, totalCols2).setHorizontalAlignment("center");
    currentRow++;

    // Data rows
    for (var s2 = 0; s2 < sizes2.length; s2++) {
      sheet.getRange(currentRow, 1).setFontWeight("bold");
      sheet.getRange(currentRow, 2, 1, colors2.length).setHorizontalAlignment("center");
      currentRow++;
    }

    // ИТОГО row
    sheet.getRange(currentRow, 1, 1, totalCols2).setFontWeight("bold");
    sheet.getRange(currentRow, 1, 1, totalCols2).setBackground("#f0f0f0");
    sheet.getRange(currentRow, 2, 1, colors2.length).setHorizontalAlignment("center");
    currentRow++;

    currentRow++; // Empty row
  }

  // Apply formulas
  for (var f = 0; f < formulas.length; f++) {
    sheet.getRange(formulas[f].row, formulas[f].col).setFormula(formulas[f].formula);
  }

  // Auto-resize columns
  for (var col = 1; col <= maxCols; col++) {
    sheet.autoResizeColumn(col);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, models: models.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

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
function onStockEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var row = range.getRow();
  var col = range.getColumn();

  if (col < 2 || row < 2) return;

  var sku = "";
  var headerRow = -1;
  for (var r = row; r >= 1; r--) {
    var cellValue = String(sheet.getRange(r, 1).getValue());
    if (cellValue === "Размер") {
      headerRow = r;
      continue;
    }
    var skuMatch = cellValue.match(/\((\d+)\)$/);
    if (skuMatch) {
      sku = skuMatch[1];
      break;
    }
    if (cellValue === "ИТОГО") return;
  }

  if (!sku || headerRow === -1) return;

  var sizeLabel = String(sheet.getRange(row, 1).getValue());
  if (!sizeLabel || sizeLabel === "Размер" || sizeLabel === "ИТОГО") return;

  var colorName = String(sheet.getRange(headerRow, col).getValue());
  if (!colorName || colorName === "Размер") return;

  var newQty = Number(e.value) || 0;

  var apiUrl = PropertiesService.getScriptProperties().getProperty("STOCK_API_URL");
  var apiSecret = PropertiesService.getScriptProperties().getProperty("STOCK_API_SECRET");

  if (!apiUrl || !apiSecret) {
    Logger.log("Missing STOCK_API_URL or STOCK_API_SECRET");
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
