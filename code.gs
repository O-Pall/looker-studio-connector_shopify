/**
 * Required for all Data Studio connectors.
 * Returns the authentication method required by the connector.
 * @return {object} AuthType
 */
function getAuthType() {
  var cc = DataStudioApp.createCommunityConnector();
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.NONE)
    .build();
}

/**
 * Required for all Data Studio connectors.
 * Returns true if the user is an admin.
 * @return {boolean} True if the user is an admin.
 */
function isAdminUser() {
  return true;
}

/**
 * Required for all Data Studio connectors.
 * Validates if the authentication is valid.
 * @return {boolean} True if the auth is valid.
 */
function isAuthValid() {
  return true;
}

/**
 * Required for all Data Studio connectors.
 * Returns the user configurable options for the connector.
 * @param {object} request Config request parameters.
 * @return {object} Connector configuration to be displayed to the user.
 */
function getConfig(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();

  config.newInfo()
    .setId('instructions')
    .setText('Enter your Shopify store information');

  config.newTextInput()
    .setId('shopifyStore')
    .setName('Shopify Store URL')
    .setHelpText('Enter your Shopify store URL (e.g., your-store.myshopify.com)')
    .setPlaceholder('your-store.myshopify.com');

  config.newTextInput()
    .setId('accessToken')
    .setName('Access Token')
    .setHelpText('Enter your Shopify Admin API access token');

  return config.build();
}

/**
 * Required for all Data Studio connectors.
 * Returns the fields for the given request.
 * @return {Fields} The fields for the given request.
 */
function getFields() {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  fields.newDimension()
    .setId('id')
    .setName('Order ID')
    .setType(types.TEXT);

  fields.newDimension()
    .setId('order_number')
    .setName('Order Number')
    .setType(types.TEXT);

  fields.newMetric()
    .setId('total_price')
    .setName('Total Price')
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newDimension()
    .setId('created_at')
    .setName('Created At')
    .setType(types.YEAR_MONTH_DAY_SECOND);

  fields.newDimension()
    .setId('financial_status')
    .setName('Financial Status')
    .setType(types.TEXT);

  return fields;
}

/**
 * Required for all Data Studio connectors.
 * Returns the schema for the given request.
 * @param {object} request Schema request parameters.
 * @return {object} Schema for the given request.
 */
function getSchema(request) {
  return getFields().build();
}

/**
 * Required for all Data Studio connectors.
 * Returns the tabular data for the given request.
 * @param {object} request Data request parameters.
 * @return {object} Contains the schema and data for the given request.
 */
function getData(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var fields = cc.getFields();
  var types = cc.FieldType;
  
  // Get the store URL and access token from the request
  var shopifyStore = request.configParams.shopifyStore;
  var accessToken = request.configParams.accessToken;
  
  // Initialize the response
  var rows = [];
  
  try {
    // Build the Shopify API URL
    var url = 'https://' + shopifyStore + '/admin/api/2024-01/orders.json?status=any&limit=250';
    
    // Set up the API request
    var options = {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    // Make the request to Shopify
    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());
    
    // Process each order
    if (result.orders) {
      result.orders.forEach(function(order) {
        rows.push({
          values: [
            order.id.toString(),
            order.order_number.toString(),
            parseFloat(order.total_price) || 0,
            order.created_at,
            order.financial_status || ''
          ]
        });
      });
    }
    
  } catch (e) {
    cc.newUserError()
      .setDebugText('Error fetching Shopify data: ' + e)
      .setText('There was an error connecting to Shopify. Please check your configuration.')
      .throwException();
  }
  
  return {
    schema: getSchema(request).schema,
    rows: rows
  };
} 
