function getLastRow(sheet, range){
  return sheet.getRange(range).getValues().filter(String).length;
}

function getSheetWithCreation(name){
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name) || (function(name){
    const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
    sheet.setName(name);
    sheet.getRange(1, 1, 1, applicationSettings.dataSheet.defaultColumns.length).setValues([applicationSettings.dataSheet.defaultColumns]);
    return sheet;
  })(name);
}
