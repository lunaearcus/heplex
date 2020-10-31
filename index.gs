/**
 * @OnlyCurrentDoc
 */
'use strict';
// Global Variables
this.applicationSettings = this.applicationSettings || {
  dataSheet:{
    name:'data'
  , defaultColumns:['Process', 'Date', '体重 (kg)', '体脂肪率 (%)', '筋肉量 (kg)', '筋肉スコア', '内臓脂肪レベル2', '内臓脂肪レベル', '基礎代謝量 (kcal)', '体内年齢 (才)', '推定骨量 (kg)' ]
  }
, processColumn:{ range:'A:A', index:1 }
, dateColumn:{ range:'B:B', index:2 }
, fitness:{
    dataSourceName:'BC-768 Weight by heplex'
  , application:{
      name:'heplex'
    , detailsUrl:'https://github.com/lunaearcus/heplex'
    , version:'1'
    }
  , device:{
      manufacturer:'TANITA'
    , model:'BC-768'
    , type:'scale'
    , uid:PropertiesService.getScriptProperties().getProperty('SCALE_UID')
    , version:'1.0'
    }
  }
};
this.healthPlanetClient = this.healthPlanetClient || new HealthPlanetClient(
  PropertiesService.getScriptProperties().getProperty('HEALTH_PLANET_CLIENT_ID')
, PropertiesService.getScriptProperties().getProperty('HEALTH_PLANET_CLIENT_SECRET')
);
this.fitnessClient = this.fitnessClient || new FitnessClient(
  this.applicationSettings.fitness.dataSourceName
, this.applicationSettings.fitness.application
, this.applicationSettings.fitness.device
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

// Invoked from Menu
function resetHealthPlanetClient(){
  healthPlanetClient.resetService();
}

function authorizeHealthPlanetClient(){
  SpreadsheetApp.getUi().showModalDialog(healthPlanetClient.createAuthorizationPage(), 'Authorization Required');
}

function processWeightData(){
  const sheet = getSheetWithCreation(applicationSettings.dataSheet.name);
  const lastDataRow = getLastRow(sheet, applicationSettings.dateColumn.range);
  const lastProcessRow = getLastRow(sheet, applicationSettings.processColumn.range);
  if (lastDataRow <= lastProcessRow) { return false; }
  const source = sheet.getRange(lastProcessRow + 1, applicationSettings.dateColumn.index, lastDataRow - lastProcessRow, 2);
  const target = sheet.getRange(lastProcessRow + 1, applicationSettings.processColumn.index, lastDataRow - lastProcessRow, 1);
  fitnessClient.patchDataSets(source.getValues().map(function(d){ return {
    ns:((function(ds){
      return (new Date([ds.substring(0, 4), ds.substring(4, 6), ds.substring(6, 8)].join('-') + 'T' + [ds.substring(8, 10), ds.substring(10, 12), '00'].join(':') + 'Z')).getTime();
    })(d[0].toString()) - 9 * 60 * 60 * 1000) * 1000000
  , weight:parseFloat(d[1].toString())
  }; }));
  target.setValues(target.getValues().map(function(){ return [(new Date()).toISOString()]; }));
}

function loadHealthPlanetData(){
  const sheet = getSheetWithCreation(applicationSettings.dataSheet.name);
  const lastRow = getLastRow(sheet, applicationSettings.dateColumn.range);
  const lastRowDate = sheet.getRange(lastRow, applicationSettings.dateColumn.index).getValue().toString();
  const fromDate = (((parseInt(lastRowDate.replace(/[^0-9]/g, ''), 10) || 0) + 1).toString(10) + '00000000000000').substring(0, 14);
  const oldestThreshold = (new Date(Date.now() - 1000 * 3600 * 24 * 89)).toISOString().replace(/[^0-9]/g, '').substring(0, 14);
  const tags = [6021, 6022];
  const data = {};
  try{
    const params = {date:0, tag:tags.join(',')};
    // First Time Export (3 months) or There is 3 months or over Blank.
    if (fromDate !== '10000000000000' && fromDate >= oldestThreshold) {
      params.from = fromDate;
    }
    const response = healthPlanetClient.fetchInnerscan(params);
    // console.log(response);
    response.data.forEach(function(v){
      data[v.date] = data[v.date] || {};
      data[v.date][v.tag] = v.keydata;
    });
  } catch(e) {
    SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(e.message), 'Error');
    return false;
  }
  const rows = Object.keys(data).filter(function(v){ return (v !== lastRowDate); }).sort().map(function(v){
    const row = tags.map(function(t){ return data[v][t] || ''; });
    row.unshift(v);
    return row;
  });
  if (rows.length > 0){
    sheet.getRange(lastRow + 1, applicationSettings.dateColumn.index, rows.length, rows[0].length).setValues(rows); 
  }
}

// For Trigger
function loadAndProcess(){
  loadHealthPlanetData();
  Utilities.sleep(1000);
  processWeightData();
}

// Not Used
function doGet(request) {
  if (!healthPlanetClient.getService().hasAccess()) {
    return HtmlService.createHtmlOutput(healthPlanetClient.createAuthorizationPage());
  } else {
    return HtmlService.createHtmlOutput('OK');
  }
}