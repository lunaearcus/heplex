class HealthPlanetClient {
  static get SERVICE_NAME() { return 'healthPlanet'; }
  static get API_INNERSCAN() { return 'https://www.healthplanet.jp/status/innerscan'; }
  constructor(clientId, clientSecret, callbackFunctionName) {
    this.service = OAuth2.createService(HealthPlanetClient.SERVICE_NAME)
      .setAuthorizationBaseUrl('https://www.healthplanet.jp/oauth/auth')
      .setTokenUrl('https://www.healthplanet.jp/oauth/token')
      .setClientId(clientId)
      .setClientSecret(clientSecret)
      .setCallbackFunction(callbackFunctionName)
      .setPropertyStore(PropertiesService.getUserProperties())
      .setScope('innerscan');

    // Refresh Token
    (() => {
      const payload = {
        refresh_token: this.service.getToken().refresh_token,
        client_id: this.service.clientId_,
        client_secret: this.service.clientSecret_,
        redirect_uri: 'https://www.healthplanet.jp/success.html',
        grant_type: 'refresh_token',
      };
      this.service.saveToken_(this.service.fetchToken_(payload, this.service.refreshUrl_));
    })();
  }
  static resetService() {
    OAuth2.createService(HealthPlanetClient.SERVICE_NAME).setPropertyStore(PropertiesService.getUserProperties()).reset();
  }
  createAuthorizationPage() {
    const authorizationUrl = this.service.getAuthorizationUrl();
    const template = HtmlService.createTemplate('<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a><br><pre><?= authorizationUrl.replace(/^.+(&state=[^&]+).*$/, "$1") ?></pre>');
    template.authorizationUrl = authorizationUrl;
    return template.evaluate();
  }
  fetchInnerscan(params) {
    // https://www.healthplanet.jp/apis/api.html
    params.access_token = this.service.getAccessToken();
    const searchParams = Object.keys(params).map((key) => [key, params[key]].join('=')).join('&');
    const response = UrlFetchApp.fetch(`${HealthPlanetClient.API_INNERSCAN}.json?${searchParams}`).getContentText('Shift_JIS');
    try{
      return JSON.parse(response);
    } catch(e) {
      throw new Error(response);
    }
  }
}
