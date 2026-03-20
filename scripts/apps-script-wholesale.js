// Apps Script for "Заказы ОПТ" spreadsheet
// Spreadsheet ID: 15juRzlxEtHdZmtg4NbEAMn0MhNZ4cjburpPgZQVAElE
// Handles appendWholesaleOrder action — add wholesale order rows

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "appendWholesaleOrder") {
      return appendWholesaleOrder(data);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function appendWholesaleOrder(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Опт");
  if (!sheet) {
    sheet = ss.insertSheet("Опт");
    var headers = [
      "№ заказа", "Дата", "Покупатель", "Модель", "Название", "Цвет",
      "Ростовок", "Размеров", "Цена за ед.", "Сумма за цвет", "Итого заказ"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.getRange(1, 1, 1, headers.length).setBackground("#7c3aed");
    sheet.getRange(1, 1, 1, headers.length).setFontColor("#ffffff");
    // Format order number column as plain text to prevent date auto-formatting
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat("@");
  }

  var rows = data.rows || [];
  if (rows.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, message: "No rows" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var values = rows.map(function(r) {
    return [
      r.orderNumber || "",
      r.date || "",
      r.buyer || "",
      r.model || "",
      r.modelName || "",
      r.color || "",
      r.rostovokCount || 0,
      r.sizesCount || 0,
      r.pricePerUnit || 0,
      r.colorTotal || 0,
      r.totalAmount || ""
    ];
  });

  var lastRow = sheet.getLastRow();
  var dataRange = sheet.getRange(lastRow + 1, 1, values.length, values[0].length);
  // Format order number column as text to prevent date auto-formatting
  sheet.getRange(lastRow + 1, 1, values.length, 1).setNumberFormat("@");
  dataRange.setValues(values);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, added: values.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
