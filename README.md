# api-explore-backend

An interactive demonstrator application which serves as a visualization tool for HTTP requests sent to an API service.

## Installation

Install dependencies by running `yarn install`

## Usage

1. Make sure the SUT (e.g., feature-service) is running in the background
2. Start the application: `node app.js`

## Tested APIs

Hosted locally:
  - feature-service (https://github.com/EMResearch/EMB/tree/master/jdk_8_maven/cs/rest/original/features-service)
  - languagetool (https://github.com/EMResearch/EMB/tree/master/jdk_8_maven/cs/rest/original/languagetool)

Online:
  - disease.sh (https://disease.sh/docs/)

## Endpoints

### Fetch all API Schemas from DB

Fetches the names of all API schemas saved on the database

#### Request

Send a GET request to `/apiSchema/fetch`.

#### Response

Returns a JSON array of API schema names, e.g.,:
```json
[
  {
    "name": "feature-service"
  },
  {
    "name": "disease"
  },
  {
    "name": "languagetool"
  }
]
```

### Fetch API Schema by Name from DB

Fetches an API schema by name (passed via URL) by sending a `GET` request to `/apiSchema/fetch/:schemaName`.

#### Request

Send a `GET` request to `/apiSchema/fetch/:schemaName` (replace :schemaName with actual name).

#### Response

Upon a successful request, status `200`, all defined operations can be found in the response body (`note:` a response may or may not include parameters depending on operation):
```json
{
  "/products/{productName}": {
    "get": {
      "operationId": "getProductByName",
      "parameters": [
        {
          "name": "productName",
          "in": "path",
          "required": true,
          "type": "string"
        }
      ]
    },
    "post": {
      "operationId": "addProduct",
      "parameters": [
        {
          "name": "productName",
          "in": "path",
          "required": true,
          "type": "string"
        }
      ]
    },
    "delete": {
      "operationId": "deleteProductByName",
      "parameters": [
        {
          "name": "productName",
          "in": "path",
          "required": true,
          "type": "string"
        }
      ]
    }
  },
  ...
}
```
In case of failure, an error message will be sent instead, e.g.,:
```json
{ "error": "Failed to set API schema" }
```

### Fetch API Schema by URL and upload to Firebase

You can fetch the API schema from the SUT by sending a `POST` request to `/apiSchema/fetch` and providing the address to the schema in the request body. This also saves a local copy on the backend `apiSchema.json` (currently in the `/schemas` directory). 

#### Request

Send a `POST` request to `/apiSchema/fetch` with the following JSON data in the request body:

```json
{
  "name": "Schema name",
  "address": "http://localhost:8080/swagger.json"
}
```
#### Response
Same as [Fetch API Schema by Name from DB (mocked)](#Fetch-API-Schema-by-Name-from-DB-(mocked)/response) with status `201`

### Set API Schema through file upload and and upload to Firebase

You can set an imported API schema by sending a `POST` request to `/apiSchema/set` and providing the API schema (JSON) in the request body. This  saves a local copy on the backend `apiSchema.json` (currently in the `/schemas` directory).

#### Request

Send a POST request to `/apiSchema/set` with a multipart/form-data payload containing a single file with the field name file. `NOTE:` now requires a name field to be provided as well, just append it to the formData object. The server expects the uploaded file to contain the API schema in a JSON format.

#### Response
Same as [Fetch API Schema by Name from DB (mocked)](#Fetch-API-Schema-by-Name-from-DB-(mocked)/response) with status `201`

### Random Exploration

You can initiate random exploration by sending a `POST` request to `/explore/random`, after setting or fetching an API schema, then providing a call sequence name and a set of operations to run in the request body. Once the call sequence has finished, all calls along with response data will be uploaded on Firebase. If an existing sequence name is used, the calls will be added to that sequence, otherwise a new one is created on the database.

`Note:` Need to ensure the SUT is restarted whenever a different sequence name is used, or whenever the API schema is changed.

#### Request

Send a `POST` request to `/explore/random` with  JSON data in the request body following a similar structure to:

```json
{
  "name": "random-exploration",
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

### Exploration

Exporation can be initiated by sending a POST request to `/explore`, after fetching and setting an API schema, then providing a set of operations to run in the request body (including parameter values) as well as the call sequence name. Once the call sequence has finished, all calls along with response data will be uploaded on Firebase. If an existing sequence name is used, the calls will be added to that sequence, otherwise a new one is created on the database.

`Note:` Need to ensure the SUT is restarted whenever a different sequence name is used, or whenever the API schema is changed.

#### Request

Send a `POST` request to `/explore` with JSON data in the request body following a similar structure to:

```json
{
  "name": "exploration"
  "callSequence": [
    {
      "path": "/products/{productName}",
      "method": "get",
      "parameters": [
        {
          "type": "string",
          "in": "path",
          "name": "productName",
          "value": "testProduct"
        }
      ]
    }
  ]
}
```

#### Response

Same as [Random Exploration](#Random-Exploration/response)

### Fetch all call sequences for schema

Fetches all call sequences tied to the active schema (set through initial fetch/set API schema call).

#### Request

Send a `GET` request to `/callsequence/fetch`

#### Response

A JSON encoded array with a set of sequence names tied to current schema:
```json
[
  {
    "name": "test123"
  },
  {
    "name": "feature-service-random"
  },
  {
    "name": "feature-service"
  }
]
```

### Fetch specific call sequence from schema

Fetches a call sequences tied to the active schema (set through initial fetch/set API schema call).

#### Request

Send a `GET` request to `/callsequence/fetch/:sequenceName`

#### Response

A JSON encoded array with all API calls in the sequence:
```json
[
  {
    "date": "Fri, 24 Nov 2023 14:6:47:768",
    "duration": 10,
    "endpoint": "/products/{productName}/configurations",
    "method": "get",
    "requestBody": {
      "formData": {}
    },
    "response": {
      "date": "Fri, 24 Nov 2023 14:6:47:778",
      "data": [],
      "status": 200
    },
    "operationId": "getConfigurationsForProduct",
    "parameters": [
      {
        "in": "path",
        "name": "productName",
        "type": "string",
        "value": "k4yrg"
      }
    ],
    "sequenceId": "52819061-3547-479a-9c33-feeacbfb906e"
  },
  ...
]
```
