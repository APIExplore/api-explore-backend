# api-explore-backend

An interactive demonstrator application which serves as a visualization tool for HTTP requests sent to an API service.

## Installation

Install dependencies by running `yarn install`

## Usage

1. Make sure the SUT (e.g., feature-service) is running in the background
2. Start the application: `node app.js`

## Endpoints

### Fetch API Schema

You can fetch the API schema from the SUT by sending a POST request to `/apiSchema/fetch` and providing the address to the schema in the request body. This also saves a local copy on the backend `apiSchema.json` (currently in the `/schemas` directory).

#### Request

Send a POST request to `/apiSchema/fetch` with the following JSON data in the request body:

```json
{
  "address": "http://localhost:8080/swagger.json"
}
```
#### Response
Upon a successful request, status `201`, the API schema (JSON) can be found in the response body.

### Set API Schema

You can set an imported API schema by sending a POST request to `/apiSchema/set` and providing the API schema (JSON) in the request body. This  saves a local copy on the backend `apiSchema.json` (currently in the `/schemas` directory).

#### Request

Send a POST request to `/apiSchema/set` with a multipart/form-data payload containing a single file with the field name file. The server expects the uploaded file to contain the API schema in a JSON format.

#### Response

Upon a successful request, status `201`, all defined operations can be found in the response body:
```json
{
  "/products/{productName}": {
    "get": {
      "operationId": "getProductByName"
    },
    "post": {
      "operationId": "addProduct"
    },
    "delete": {
      "operationId": "deleteProductByName"
    }
  },
  ...
}
```
In case of failure, an error message will be sent instead, e.g.,:
```json
{ "error": "Failed to set API schema" }
```
### Random Exploration

You can initiate random exploration by sending a POST request to `/explore/random`, after setting or fetching an API schema and providing a set of operations to run in the request body. Once the call sequence has finished, all calls along with response data will be uploaded on Firebase (currently in the `test_api_calls` collection)

#### Request

Send a POST request to `/explore/random` with  JSON data in the request body following a similar structure to:

```json
{
  "callSequence": [
    {
      "path": "/products/{productName}/features",
      "method": "get"
    },
    ...
  ]
}
```
#### Response
Currently all API call data is sent in the response body (to be changed later).
Upon a successful request, status `200`, details on the API call can be found in the request body, e.g.,:
```json
{
  "callSequence": [
    {
      "url": "http://localhost:8080/products/gx8h9/configurations",
      "operationId": "getConfigurationsForProduct",
      "method": "get",
      "endpoint": "/products/{productName}/configurations",
      "parameters": [
        {
          "type": "string",
          "name": "productName",
          "value": "gx8h9"
        }
      ],
      "requestBody": {},
      "date": "Wed, 8 Nov 2023 10:57:23:752",
      "response": {
        "status": 200,
        "date": "Wed, 8 Nov 2023 10:57:23:760",
        "data": []
      }
    },
    ...
  ]
}
```
You can also receive individual API calls as the they are being made and a response is received from the SUT through `Socket.io` ('https://socket.io/').
The socket is setup on the backend like this:
```javascript
const io = new Server(process.env.SOCKET || '3001')
io.on('connection', (socket) => {})
socket.emit('apiCall', apiCall)
```
The socket is event-based and will trigger it's corresponding function each time a call is emitted. Example of logging each call (frontend):
```javascript
const socket = io('http://localhost:3001')
socket.on('apiCall', (apiCall) => {
  console.log(apiCall)
})
```
The JSON structure of each API call received over the socket would be:
```json
{
  "url": "http://localhost:8080/products/gx8h9/configurations",
  "operationId": "getConfigurationsForProduct",
  "method": "get",
  "endpoint": "/products/{productName}/configurations",
  "parameters": [
    {
      "type": "string",
      "name": "productName",
      "value": "gx8h9"
    }
  ],
  "requestBody": {},
  "date": "Wed, 8 Nov 2023 10:57:23:752",
  "response": {
    "status": 200,
    "date": "Wed, 8 Nov 2023 10:57:23:760",
    "data": []
  }
}
```
