// Class
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

// Callback
function healthPlanetAuthorizationCallback(request) {
  const isAuthorized = healthPlanetClient.getService().handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}