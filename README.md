# api-explore-backend
An interactive demonstrator application which serves as a visualization tool for HTTP requests sent to an API service.
# Endpoints
 - POST /apischema/fetch
    Fetches the API definition from supplied address
    
    Expected data in request body (JSON):
    {
        "address": "http://localhost:8080/swagger.json"
    }

    Responds with the API definition located at the URL in JSON format.