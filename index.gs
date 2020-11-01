/**
 * @OnlyCurrentDoc
 */
'use strict';
class ApplicationSettings {
  static get dataSheet() { return {
      name:'data'
    , defaultColumns:['Process', 'Date', '体重 (kg)', '体脂肪率 (%)', '筋肉量 (kg)', '筋肉スコア', '内臓脂肪レベル2', '内臓脂肪レベル', '基礎代謝量 (kcal)', '体内年齢 (才)', '推定骨量 (kg)']
    };
  };
  static get healthPlanet() { return {
      tags:[6021, 6022]
    };
  };
  static get processColumn() { return { range:'A:A', index:1 }; }
  static get dateColumn() { return { range:'B:B', index:2 }; }
  static get fitness() { return {
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
    };
  }
};

class Application {
  constructor() {
    this.healthPlanetClient = new HealthPlanetClient(...['HEALTH_PLANET_CLIENT_ID', 'HEALTH_PLANET_CLIENT_SECRET'].map((key) => PropertiesService.getScriptProperties().getProperty(key)), 'healthPlanetAuthorizationCallback');
    this.fitnessClient = new FitnessClient(...['dataSourceName', 'application', 'device'].map((key) => ApplicationSettings.fitness[key]));
  }
  // Invoked from Menu
  authorizeHealthPlanetClient() {
    SpreadsheetApp.getUi().showModalDialog(this.healthPlanetClient.createAuthorizationPage(), 'Authorization Required');
  }
  processWeightData() {
    // Sheet の取得
    const sheet = SheetUtil.getSheetWithCreation(...['name', 'defaultColumns'].map((key) => ApplicationSettings.dataSheet[key]));
    // 要登録データと登録済みデータの最終行の取得
    const [lastDataRow, lastProcessRow] = ['dateColumn', 'processColumn'].map((key) => SheetUtil.getLastRow(sheet, ApplicationSettings[key].range));
    if (lastDataRow <= lastProcessRow) { return false; }
    // 要登録データは date, weight の組を取得
    const source = sheet.getRange(lastProcessRow + 1, ApplicationSettings.dateColumn.index, lastDataRow - lastProcessRow, 2);
    const target = sheet.getRange(lastProcessRow + 1, ApplicationSettings.processColumn.index, lastDataRow - lastProcessRow, 1);
    // 登録
    this.fitnessClient.patchDataSets(source.getValues().map((data) => ({ns:(DateUtil.toDate(data[0]).getTime() - 540 * 60000) * 1000000, weight:parseFloat(data[1].toString())})));
    // 成否にかかわらず登録済みとする
    target.setValues(target.getValues().map(() => [(new Date()).toISOString()]));
  }
  loadHealthPlanetData() {
    // Sheet の取得
    const sheet = SheetUtil.getSheetWithCreation(...['name', 'defaultColumns'].map((key) => ApplicationSettings.dataSheet[key]));
    // 取得済みデータの最終行の取得
    const lastRow = SheetUtil.getLastRow(sheet, ApplicationSettings.dateColumn.range);
    const lastRowDate = sheet.getRange(lastRow, ApplicationSettings.dateColumn.index).getValue().toString();
    // 最終取得データの 60 秒後から取得
    const fromDate = DateUtil.addSecondsToDateNumberString(lastRowDate, 60);
    const tags = ApplicationSettings.healthPlanet.tags;
    const data = {};
    const params = {date:0, tag:tags.join(',')};
    // 最終取得データがない場合はデフォルト（3か月前から現在）
    if (fromDate !== undefined) {
      params.from = fromDate;
      params.to = DateUtil.addSecondsToDateNumberString(lastRowDate, 3600 * 24 * 89);
    }
    try{
      const response = this.healthPlanetClient.fetchInnerscan(params);
      response.data.forEach((v) => {
        data[v.date] = data[v.date] || {};
        data[v.date][v.tag] = v.keydata;
      });
    } catch(e) {
      console.log(e);
      SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(e.message), 'Error');
      return false;
    }
    const rows = Object.keys(data).sort().map((date) => [date, ...tags.map((tag) => (data[date][tag] || ''))]);
    if (rows.length > 0){
      sheet.getRange(lastRow + 1, ApplicationSettings.dateColumn.index, rows.length, rows[0].length).setValues(rows); 
    }
  }
}

// Callback
function healthPlanetAuthorizationCallback(request) {
  const isAuthorized = (new Application()).healthPlanetClient.service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}

// Initialize
const menuSeparator = Symbol('Separator');
const menuFunctions = {
  loadHealthPlanetData: () => (new Application()).loadHealthPlanetData()
, processWeightData: () => (new Application()).processWeightData()
, separator1: menuSeparator
, authorizeHealthPlanetClient: () => (new Application()).authorizeHealthPlanetClient()
, resetHealthPlanetClient: () => HealthPlanetClient.resetService()
};

function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu('Functions');
  Object.entries(menuFunctions).forEach((item) => {
    (item[1] === menuSeparator) ? menu.addSeparator() : menu.addItem(item[0], `menuFunctions.${item[0]}`);
  });
  menu.addToUi();
}

// For Trigger
function loadAndProcess(){
  const application = new Application();
  application.loadHealthPlanetData();
  Utilities.sleep(1000);
  application.processWeightData();
}
