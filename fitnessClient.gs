function FitnessClient(dataStreamName, application, device){
  // https://lowreal.net/2018/03/07/1
  const self = this;
  this.dataStreamName = dataStreamName;
  this.application = application;
  this.device = device;
  this.accessToken = ScriptApp.getOAuthToken();
  this.getDataSources = function(){
    try {
      return JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources?access_token=' + self.accessToken).getContentText()).dataSource;
    } catch(e) {
      return [];
    }
  };
  this.getDataSourceWithCreation = function(){
    var dataSource;
    try {
      dataSource = self.getDataSources().filter(function(d) { return (d.dataStreamName = self.dataStreamName && d.application.name === self.application.name); })[0];
    } catch(e) {
      throw new Error('Failed to get DataSources');
    }
    if (dataSource === undefined) {
      // Create DataSource
      const options = {
        method:'POST'
      , payload:JSON.stringify({
          application:self.application
        , device:self.device
        , dataStreamName:self.dataStreamName
        , type:'raw'
        , dataType:{ name:'com.google.weight', field:[{ name:'weight', format:'floatPoint' }] }
        })
      , headers:{
          'Authorization':['Bearer', self.accessToken].join(' ')
        , 'Content-Type':'application/json;encoding=utf-8'
        }
      };
      dataSource = JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources', options).getContentText());
      Logger.log(dataSource);
    }
    return dataSource;
  };
  this.patchDataSets = function(dataPoints){
    const dataSourceId = self.getDataSourceWithCreation().dataStreamId;
    const minStartTimeNs = Math.min.apply(null, dataPoints.map(function(d){ return d.ns; }));
    const maxEndTimeNs = Math.max.apply(null, dataPoints.map(function(d){ return d.ns; }));
    const options = {
      method:'PATCH'
    , payload:JSON.stringify({
        dataSourceId:dataSourceId
      , minStartTimeNs:minStartTimeNs
      , maxEndTimeNs:maxEndTimeNs
      , point:dataPoints.sort(function(a, b){ return (a.ns < b.ns) ? 1 : -1; }).map(function(d){ return {
          dataTypeName:'com.google.weight'
        , originDataSourceId:''
        , startTimeNanos: d.ns
        , endTimeNanos: d.ns
        , value:[{ fpVal: d.weight }]
        }; })
      })
    , headers:{
        'Authorization':['Bearer', self.accessToken].join(' ')
      , 'Content-Type':'application/json;encoding=utf-8'
      }
    };
    Logger.log(JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources/' + dataSourceId + '/datasets/' + [minStartTimeNs, maxEndTimeNs].join('-'), options).getContentText()));
  };
}