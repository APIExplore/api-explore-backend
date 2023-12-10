# api-explore-backend

An interactive demonstrator application which serves as a visualization tool for HTTP requests sent to an API service.

## Installation

Install dependencies by running `yarn install`

## Usage

1. Start the application: `node app.js`
2. Make sure a suitable SUT is running in the background
3. Set or fetch the schema corresponding to the SUT
4. Start exploring...

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

### Exploration

Exporation can be initiated by sending a POST request to `/explore`, after fetching and setting an API schema, then providing a set of operations to run in the request body (including parameter values) as well as the call sequence name. Once the call sequence has finished, all calls along with response data will sent back in the response body (and via socket), then uploaded on Firebase. If an existing sequence name is used, the previous calls will be overwritten in database, otherwise a new sequence is created.

The response body contains a `metrics` object listing various call sequence metrics:
  - `numCalls`: Total number of calls
  - `successfulCalls`: Number of successful requests (`status < 400`)
  - `unsuccessfulCalls`: Number of unsuccessful calls (`status >= 400`)
  - `totDuration`: Total duration of all requests
  - `avgDuration`: Average duration of each request
  - `totSize`: Combined size of all responses
  - `avgSize`: Average size of each response

The response body may also contain a `warnings` array, providing information on changes in responses from when the sequence was previously executed:
  - If status has changed, the specific call which changed will be reported along with how the status changed.
  - If the response data changed, it will only be reported that it changed, not what changed (May update info later).
  - If a call in the sequence was changed to another one, the old and new operation IDs will be displayed.
  - If the length of the call sequence was changed, the difference in length will be reported (nothing else will be reported in this case).

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

Currently all API call data is sent in the response body (to be changed later).
Upon a successful request, status `200`, details on the API call can be found in the request body, e.g.,:
```json
{
  "callSequence": [
    {
      "url": "http://localhost:8080/products",
      "operationId": "getAllProducts",
      "method": "get",
      "endpoint": "/products",
      "parameters": [],
      "requestBody": {
        "formData": {}
      },
      "date": "Sun, 10 Dec 2023 20:48:17:886",
      "response": {
        "status": 200,
        "date": "Sun, 10 Dec 2023 20:48:17:918",
        "contentType": "application/json",
        "data": [
          "ELEARNING_SITE"
        ],
        "size": 18
      },
      "duration": 32,
      "relationships": {
        "responseInequality": [
          "start"
        ],
        "stateMutation": [
          "start"
        ],
        "stateIdentity": [
          "start"
        ]
      }
    }
  ],
  "metrics": {
    "numCalls": 1,
    "successfulCalls": 1,
    "unsuccessfulCalls": 0,
    "totDuration": 32,
    "avgDuration": 32,
    "totSize": 18,
    "avgSize": 18
  },
  "warnings": [
    { "warning": "message" }
  ],
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

### Random Exploration

You can initiate random exploration by sending a `POST` request to `/explore/random`, after setting or fetching an API schema, then providing a call sequence name and a set of operations to run in the request body. Once the call sequence has finished, all calls along with response data will sent back in the response body (and via socket), then uploaded on Firebase. If an existing sequence name is used, the previous calls will be overwritten in database, otherwise a new sequence is created.

The response body contains a `metrics` object listing various call sequence metrics:
  - `numCalls`: Total number of calls
  - `successfulCalls`: Number of successful requests (`status < 400`)
  - `unsuccessfulCalls`: Number of unsuccessful calls (`status >= 400`)
  - `totDuration`: Total duration of all requests
  - `avgDuration`: Average duration of each request
  - `totSize`: Combined size of all responses
  - `avgSize`: Average size of each response

The response body may also contain a `warnings` array, providing information on changes in responses from when the sequence was previously executed:
  - If status has changed, the specific call which changed will be reported along with how the status changed.
  - If the response data changed, it will only be reported that it changed, not what changed (May update info later).
  - If a call in the sequence was changed to another one, the old and new operation IDs will be displayed.
  - If the length of the call sequence was changed, the difference in length will be reported (nothing else will be reported in this case).

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

Same as [Exploration](#Exploration/response)

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

### Edit API schema name

Changes the name of an existing schema on the database.

#### Request

Send a `PUT` request to `/apischema/rename/:schemaName/:newSchemaName`.

#### Response

When successfully renaming a call sequence:
```json
{ "success": true }
```
If any issues are encountered:
```json
{ "error": "message" }
```

### Edit call sequence name

Changes the name of an existing call sequence on the database.

`Note:` Can only be used for changing the name of a sequence belonging to the currently selected schema.

#### Request

Send a `PUT` request to `/callsequence/rename/:sequenceName/:newSequenceName`.

#### Response

When successfully renaming a call sequence:
```json
{ "success": true }
```
If any issues are encountered:
```json
{ "error": "message" }
```

### Delete API schema

Deletes an API schema along with all of its call sequences and their corresponding API calls.

#### Request

Send a `DELETE` request to `/apischema/delete/:schemaName`.

#### Response

When successfully deleting an API schema:
```json
{ "success": true }
```
If any issues are encountered:
```json
{ "error": "message" }
```

### Delete API call sequence

Deletes an API call sequence along with all of its corresponding API calls.

#### Request

Send a `DELETE` request to `/callsequence/delete/:sequenceName`.

`Note:` Can only be used for deleting a sequence belonging to the currently selected schema.

#### Response

When successfully deleting an API call sequence:
```json
{ "success": true }
```
If any issues are encountered:
```json
{ "error": "message" }
```