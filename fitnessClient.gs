// https://lowreal.net/2018/03/07/1
class FitnessClient {
  static get API_DATASOURCES() { return 'https://www.googleapis.com/fitness/v1/users/me/dataSources'; }
  constructor(dataStreamName, application, device) {
    Object.assign(this, {dataStreamName, application, device, accessToken:ScriptApp.getOAuthToken()});
  }
  getDataSources() {
    try {
      return JSON.parse(UrlFetchApp.fetch(`${FitnessClient.API_DATASOURCES}?access_token=${this.accessToken}`).getContentText()).dataSource;
    } catch(e) {
      return [];
    }
  }
  getDataSourceWithCreation() {
    const dataSource = (() => {
      try {
        return this.getDataSources().filter((dataSource) => (dataSource.dataStreamName === this.dataStreamName && dataSource.application.name === this.application.name))[0];
      } catch(e) {
        throw new Error('Failed to get DataSources');
      }
    })();
    if (dataSource !== undefined) { return dataSource; }

    // Create DataSource
    const options = {
      method:'POST'
    , payload:JSON.stringify({application:this.application, device:this.device, dataStreamName:this.dataStreamName, type:'raw', dataType:{name:'com.google.weight', field:[{name:'weight', format:'floatPoint'}]}})
    , headers:{'Authorization':['Bearer', this.accessToken].join(' '), 'Content-Type':'application/json;encoding=utf-8'}
    };
    const response = JSON.parse(UrlFetchApp.fetch(FitnessClient.API_DATASOURCES, options).getContentText());
    console.log(response);
    return response;
  }
  patchDataSets(dataPoints) {
    const dataSourceId = this.getDataSourceWithCreation().dataStreamId;
    const [minStartTimeNs, maxEndTimeNs] = [Math.min(...dataPoints.map((data) => data.ns)), Math.max(...dataPoints.map((data) => data.ns))];
    const options = {
      method:'PATCH'
    , payload:JSON.stringify({
        dataSourceId:dataSourceId
      , minStartTimeNs:minStartTimeNs
      , maxEndTimeNs:maxEndTimeNs
      , point:dataPoints.sort((a, b) => (a.ns < b.ns ? 1 : -1)).map((data) => ({dataTypeName:'com.google.weight', originDataSourceId:'', startTimeNanos:data.ns, endTimeNanos:data.ns, value:[{fpVal:data.weight}]}))
      })
    , headers:{'Authorization':['Bearer', this.accessToken].join(' '), 'Content-Type':'application/json;encoding=utf-8'}
    };
    const response = JSON.parse(UrlFetchApp.fetch(`${FitnessClient.API_DATASOURCES}/${dataSourceId}/datasets/${[minStartTimeNs, maxEndTimeNs].join('-')}`, options).getContentText());
    console.log(response);
    return response;
  }
}