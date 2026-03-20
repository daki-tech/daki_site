// Apps Script for "Заказы" spreadsheet (orders only)
// Spreadsheet ID: 1WOadxglA7O1NqHFtCVrCKB65tB2Lawl39X7JqNc2bo0
// Handles appendOrder action — add order rows to "Заказы" tab

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "deleteOrder") {
      return deleteOrderRows(data.orderNumber, "Заказы");
    }
    return appendOrder(data);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteOrderRows(orderNumber, sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "Sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  var deleted = 0;

  // Iterate from bottom to top to preserve row indices
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(orderNumber)) {
      sheet.deleteRow(i + 1);
      deleted++;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true, deleted: deleted }))
    .setMimeType(ContentService.MimeType.JSON);
}

function appendOrder(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Заказы");
  if (!sheet) {
    sheet = ss.insertSheet("Заказы");
    var headers = [
      "№ заказа", "Дата", "Источник", "Фамилия", "Имя",
      "Телефон", "Почта", "Модель", "Размер", "Цвет",
      "Количество", "Сумма", "Область", "Город", "Отделение",
      "Оплата", "Связаться", "Заметки"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.getRange(1, 1, 1, headers.length).setBackground("#4285f4");
    sheet.getRange(1, 1, 1, headers.length).setFontColor("#ffffff");
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, 1).setNumberFormat("@");
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
      r.source || "",
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
      r.notes || ""
    ];
  });

  var lastRow = sheet.getLastRow();
  var dataRange = sheet.getRange(lastRow + 1, 1, values.length, values[0].length);
  sheet.getRange(lastRow + 1, 1, values.length, 1).setNumberFormat("@");
  dataRange.setValues(values);

  return ContentService.createTextOutput(JSON.stringify({ ok: true, added: values.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
