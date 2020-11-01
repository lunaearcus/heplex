class SheetUtil {
  static getLastRow(sheet, range){
    return sheet.getRange(range).getValues().filter(String).length;
  }
  static getSheetWithCreation(name, defaultColumns){
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name) || ((name) => {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
      sheet.setName(name);
      sheet.getRange(1, 1, 1, defaultColumns.length).setValues([defaultColumns]);
      return sheet;
    })(name);
  }
}

class DateUtil {
  static toDate(dateString) {
    const dateNumber = parseInt(dateString.toString().replace(/[^0-9]/g, ''), 10) || 0;
    const dateNumberString = dateNumber.toString(10).padEnd(14, '0');
    return (dateNumber > 0) ? new Date(dateNumberString.replace(/^([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, '$1-$2-$3T$4:$5:$6Z')) : undefined;
  }
  static toDateNumberString(date) {
    const dateString = (date instanceof Date) ? date.toISOString() : date.toString();
    return dateString.replace(/[^0-9]/g, '').padEnd(14, '0').substring(0, 14);
  }
  static addSecondsToDateNumberString(date, seconds) {
    const dateObject = DateUtil.toDate(DateUtil.toDateNumberString(date));
    return dateObject ? DateUtil.toDateNumberString(new Date(dateObject.getTime() + seconds * 1000)) : undefined;
  }
}
