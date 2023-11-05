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

Send a POST request to `/apiSchema/set` with the following JSON data in the request body:

#### Response
Upon a successful request, status `201`, a JSON encoded success message can be found in the response body:
```json
{ success: 'API schema has been set' }
```
In case of failure, an error message will be sent instead, e.g.,:
```json
{ error: 'Failed to set API schema' }
```
### Random Exploration

You can initiate random exploration by sending a POST request to `/explore/random`, after setting or fetching an API schema and providing a set of operations to run in the request body. 

#### Request

Send a POST request to `/explore/random` with  JSON data in the request body following a similar structure to:

```json
{
  "callSequence": [
    { "path": "/products/{productName}", "method": "get" },
    { "path": "/products/{productName}/configurations/{configurationName}", "method": "post" },
    ...
  ]
}
```
#### Response
Currently all API call data is sent in the response body (to be changed later), used for testing on Postman.
Upon a successful request, status `200`, details on the API call can be found in the request body (Not formatted nicely at the moment), e.g.,:
```json
{
  "callSequence": [
    {
      "operationId": "getAllProducts",
      "address": "http://localhost:8080",
      "method": "get",
      "path": "/products",
      "parameters": [],
      "date": "Sun, 5 Nov 2023 22:51:40 GMT",
      "response": {
        "status": 200,
        "headers": {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, PUT, GET, OPTIONS, DELETE",
            "access-control-allow-headers": "x-requested-with",
            "access-control-max-age": "3600",
            "content-type": "application/json",
            "content-length": "331",
            "date": "Sun, 05 Nov 2023 22:51:39 GMT"
        },
        "data": [ // Note: feature-service SUT contains a HTML document in case of issues (e.g., status 500)
          "ELEARNING_SITE",
          "j03zp",
          "6ddtt",
          ...
        ]
      }
    }
  ]
}
```
