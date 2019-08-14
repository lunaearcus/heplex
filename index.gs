// Classes
function HealthPlanetClient(clientId, clientSecret){
  const self = this;
  this.clientId = clientId;
  this.clientSecret = clientSecret;
  this.getService = function(){
    self.service = self.service || OAuth2.createService('healthPlanet')
      .setAuthorizationBaseUrl('https://www.healthplanet.jp/oauth/auth')
      .setTokenUrl('https://www.healthplanet.jp/oauth/token')
      .setClientId(this.clientId)
      .setClientSecret(this.clientSecret)
      .setCallbackFunction('healthPlanetAuthorizationCallback')
      .setPropertyStore(PropertiesService.getUserProperties())
      .setScope('innerscan');
    return self.service;
  };
  this.resetService = function(){
    OAuth2.createService('healthPlanet').setPropertyStore(PropertiesService.getUserProperties()).reset();
  };
  this.createAuthorizationPage = function(){
    const authorizationUrl = self.getService().getAuthorizationUrl();
    const template = HtmlService.createTemplate('<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a><br><pre><?= authorizationUrl.replace(/^.+(&state=[^&]+).*$/, "$1") ?></pre>');
    template.authorizationUrl = authorizationUrl;
    return template.evaluate();
  };
  this.fetchInnerscan = function(params){
    // https://www.healthplanet.jp/apis/api.html
    params.access_token = self.getService().getAccessToken();
    const searchParams = Object.keys(params).map(function(k){ return [k, params[k]].join('='); }).join('&');
    const response = UrlFetchApp.fetch('https://www.healthplanet.jp/status/innerscan.json?' + searchParams).getContentText('Shift_JIS');
    try{
      return JSON.parse(response);
    } catch(e) {
      throw new Error(response);
    }
  }
}

// Global Variables
this.applicationSettings = this.applicationSettings || {
  dataSheet:{
    name:'data'
  , defaultColumns: ['Process', 'Date', '体重 (kg)', '体脂肪率 (%)', '筋肉量 (kg)', '筋肉スコア', '内臓脂肪レベル2', '内臓脂肪レベル', '基礎代謝量 (kcal)', '体内年齢 (才)', '推定骨量 (kg)' ]
  }
, processColumn:{ range:'A:A', index:1 }
, dateColumn:{ range:'B:B', index:2 }
};
this.healthPlanetClient = this.healthPlanetClient || new HealthPlanetClient(
  PropertiesService.getScriptProperties().getProperty('HEALTH_PLANET_CLIENT_ID')
, PropertiesService.getScriptProperties().getProperty('HEALTH_PLANET_CLIENT_SECRET')
);

// Initialize
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Functions')
    .addItem('LoadHealthPlanetData', 'loadHealthPlanetData')
    .addItem('ProcessWeightData', 'processWeightData')
    .addSeparator()
    .addItem('AuthorizeHealthPlanetClient', 'authorizeHealthPlanetClient')
    .addItem('ResetHealthPlanetClient', 'resetHealthPlanetClient')
    .addToUi();
}

// Callbacks
function healthPlanetAuthorizationCallback(request) {
  const isAuthorized = healthPlanetClient.getService().handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}

// Invoked from Menu
function authorizeHealthPlanetClient(){
  SpreadsheetApp.getUi().showModalDialog(healthPlanetClient.createAuthorizationPage(), 'Authorization Required');
}

function resetHealthPlanetClient(){
  healthPlanetClient.resetService();
}

function processWeightData(){
  const sheet = getSheetWithCreation(applicationSettings.dataSheet.name);
  const lastDataRow = getLastRow(sheet, applicationSettings.dateColumn.range);
  const lastProcessRow = getLastRow(sheet, applicationSettings.processColumn.range);
  if (lastDataRow <= lastProcessRow) { return false; }
  const target = sheet.getRange(lastProcessRow + 1, applicationSettings.processColumn.index, lastDataRow - lastProcessRow, 1);
  target.setValues(target.getValues().map(function(){ return [(new Date()).getTime()]; }));
  // Test Access
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(UrlFetchApp.fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources?access_token=' + ScriptApp.getOAuthToken(),{muteHttpExceptions:true}).getContentText()), 'Output');
}

function loadHealthPlanetData(){
  const sheet = getSheetWithCreation(applicationSettings.dataSheet.name);
  const lastRow = getLastRow(sheet, applicationSettings.dateColumn.range);
  const fromDate = (((parseInt(sheet.getRange(lastRow, 2).getValue().toString().replace(/[^0-9]/g, ''), 10) || 0) + 1).toString(10) + '00000000000000').substr(0, 14);
  const tags = [6021, 6022, 6023, 6024, 6025, 6026, 6027, 6028, 6029];
  const data = {};
  try{
    const params = {date:0, tag:tags.join(',')};
    // First Time Export (3 months)
    if (fromDate !== '10000000000000') {
      params.from =fromDate;
    }
    healthPlanetClient.fetchInnerscan(params).data.forEach(function(v){
      data[v.date] = data[v.date] || {};
      data[v.date][v.tag] = v.keydata;
    });
  } catch(e) {
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(e.message), 'Error');
    return false;
  }
  const rows = Object.keys(data).sort().map(function(v){
    const row = tags.map(function(t){ return data[v][t] || ''; });
    row.unshift(v);
    return row;
  });
  if (rows.length > 0){
    sheet.getRange(lastRow + 1, applicationSettings.dateColumn.index, rows.length, rows[0].length).setValues(rows); 
  }
}

// Utility
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

// Not Used
function doGet(request) {
  if (!healthPlanetClient.getService().hasAccess()) {
    return HtmlService.createHtmlOutput(healthPlanetClient.createAuthorizationPage());
  } else {
    return HtmlService.createHtmlOutput('OK');
  }
}