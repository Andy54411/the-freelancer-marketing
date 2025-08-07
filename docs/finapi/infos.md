Welcome to finAPI Web Form 2.0!

finAPI Web Form web-iconfinAPI's Web Form 2.0 is a complementary product to finAPI Access. It is our product offering for Compliance-as-a-Service.

As a customer, if you do not have a PSD2 license or if you are interested in using finAPI's license to manage end user credentials for bank communication, we welcome you to explore the endpoints in this section further.
All POST endpoints will generate a unique URL. This URL can be provided to the end customer. He/she can render a web form with it. finAPI will then orchestrate the next steps between the end user and bank to complete the request.

Additional information about our API can be found here: Web Form 2.0 Public Documentation

If you need any help with the API, contact support@finapi.io.
finAPI Web Form 2.0 2.906.0
The following pages give you some general information on how to use our APIs.
The actual API services documentation then follows further below. You can use the menu to jump between API sections.

This page has a built-in HTTP(S) client, so you can test the services directly from within this page, by filling in the request parameters and/or body in the respective services, and then hitting the TRY button. Note that you need to be authorized to make a successful API call. To authorize, refer to the 'Authorization' section of Access, or in case you already have a valid user token, just use the QUICK AUTH on the left.
Please also remember that all user management functions should be looked up in Access.

You should also check out the Web Form 2.0 Public Documentation as well as Access Public Documentation for more information. If you need any help with the API, contact support@finapi.io.

General information
Request IDs
With any API call, you can pass a request ID via a header with name "X-Request-Id". The request ID can be an arbitrary string with up to 255 characters. Passing a longer string will result in an error.

If you don't pass a request ID for a call, finAPI will generate a random ID internally.

The request ID is always returned back in the response of a service, as a header with name "X-Request-Id".

We highly recommend to always pass a (preferably unique) request ID, and include it into your client application logs whenever you make a request or receive a response(especially in the case of an error response). finAPI is also logging request IDs on its end. Having a request ID can help the finAPI support team to work more efficiently and solve tickets faster.
Type Coercion
In order to ease the integration for some languages, which do not natively support high precision number representations, Web Form 2.0 API supports relax type binding for the openAPI type number, which is used for money amount fields. If you use one of those languages, to avoid precision errors that can appear from float values, you can pass the amount as a string.
FAQ
Is there a finAPI SDK?
Currently we do not offer a native SDK, but there is the option to generate an SDKfor almost any target language via OpenAPI. Use the 'Download SDK' button on this page for SDK generation.

Why do I need to keep authorizing when calling services on this page?
This page is a "one-page-app". Reloading the page resets the OAuth authorization context. There is generally no need to reload the page, so just don't do it and your authorization will persist.
Web Forms
Cancel a web form
post /api/webForms/{id}/cancel
Cancel an existing web form.

When you cancel a web form, it will be immediately terminated, resulting in the following consequences:
• Any interaction with the web form's user interface will be instantly prohibited. Any attempt by the end user to interact with it will result in an error message. This error only affects the UI though and does not alter the state of the web form. We recommend using this endpoint cautiously, ideally only when the end user has already left the web form (e.g., by closing a popup containing the embedded web form).
• If the web form gets cancelled, its status is usually set to CANCELLED. However, there are exceptions to this rule: for instance, if an import is in progress and at least one interface has already been successfully imported, the web form will be finalized with the status COMPLETED.
• Callbacks are not triggered even if they were provided for the web form. Instead, use the response of the service since it already contains the most up-to-date web form's state.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the web form

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Delete a web form
delete /api/webForms/{id}
Delete a web form of the user that is authorized by the access token.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the web form

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
Web form has been deleted

Get a web form
get /api/webForms/{id}
Get a web form of the authorized user.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the web form

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Get web forms
get /api/webForms
Get all web forms associated with the authorized user.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
QUERY-STRING PARAMETERS
order
string
createdAt,desc
Determines the order of the results. You can order by createdAt field ascending or descending. The general format is property[,asc|desc], with asc being the default value. The default order is createdAt,asc.

Examples: createdAt,desc
page
int32
1
Default: 1
Min 0
Page to load

Examples: 1
perPage
int32
20
Default: 20
Min 0┃Max 9223372036854776000
The number of items on the page

Examples: 20
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A page of web forms ordered by creation date

RESPONSE BODY
SCHEMA
application/json
Copy
{
"items": [
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
],
"paging": {
"page": 0,
"perPage": 500,
"pageCount": 0,
"totalCount": 0
}
}
Payment Initiation Services
Create a direct debit with account ID
post /api/webForms/directDebitWithAccountId
Initiates a direct debit from a specific account using an account ID. A pre-requisite for using this service is, the payment account must already be imported and stored in Access and associated with an account ID.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a unique URL. You must direct your user to our web form with the URL.

A collective direct debit contains more than one order in the 'orders' list. It is specially handled by the bank and can be booked by the bank either as a single booking for each order or as a single cumulative booking. The preferred booking type can be given with the 'singleBooking' flag, but it is not guaranteed each bank will regard this flag.

NOTE: For direct debits created for debtors outside of the European Union, orders[].payer.address and orders[].payer.country should be defined.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
Parameters for a direct debit with an account

{
  "orders": [
    {
      "payer": {
        "name": "Max Mustermann",
        "iban": "DE77533700080111111100",
        "bic": "DEUTDEFF533",
        "address": "221b Baker St, London NW1 6XE",
        "country": "DE"
      },
      "amount": {
        "value": 0.04,
        "currency": "EUR"
      },
      "purpose": "Well done",
      "sepaPurposeCode": "SALA",
      "endToEndId": "endToEndId",
      "mandateId": "1",
      "mandateDate": "2021-01-01",
      "creditorId": "DE98ZZZ09999999999"
    }
  ],
  "executionDate": "2021-12-31",
  "batchBookingPreferred": true,
  "batchBookingId": "batch-payment-2024-09-12",
  "profileId": "a2c9fc3b-1777-403c-8b2f-1ce4d90157a2",
  "redirectUrl": "https://finapi.io/callback",
  "callbacks": {
    "finalised": "https://dev.finapi.io/callback?state=42"
  },
  "receiver": {
    "accountId": 42
  },
  "directDebitType": "B2B",
  "sequenceType": "OOFF"
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
CALLBACKS
WebFormCompletedCallback
⥄ post
{$request.body#/callbacks/finalised}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "webFormId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED"
}
CALLBACK RESPONSE
200
Callback has been successfully received

RESPONSE
Created web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Create a payment with account ID
post /api/webForms/paymentWithAccountId
Initiates payment from a specific checking account using an account ID. A pre-requisite for using this service is, the payment account must already be imported and stored in Access and associated with an account ID. This is ideal for customers who's use case might involve monitoring and managing payment accounts and also recurring possible payment initiations from the same account.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a unique URL. You must direct your user to our web form with the URL.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
Parameters for a payment with an account

{
  "orders": [
    {
      "recipient": {
        "name": "Max Mustermann",
        "iban": "DE77533700080111111100",
        "bic": "DEUTDEFF533",
        "bankName": "finAPI Test Bank",
        "address": {
          "street": "Pariser Platz",
          "houseNumber": "1",
          "postCode": "10117",
          "city": "Berlin",
          "country": "DE"
        }
      },
      "structuredRemittanceInformation": [
        "VS:12345",
        "KS:12345",
        "SS:12345"
      ],
      "amount": {
        "value": 0.04,
        "currency": "EUR"
      },
      "purpose": "Well done",
      "sepaPurposeCode": "SALA",
      "endToEndId": "endToEndId"
    }
  ],
  "executionDate": "2022-12-31",
  "batchBookingPreferred": true,
  "batchBookingId": "batch-payment-2024-09-12",
  "profileId": "a2c9fc3b-1777-403c-8b2f-1ce4d90157a2",
  "redirectUrl": "https://finapi.io/callback",
  "callbacks": {
    "finalised": "https://dev.finapi.io/callback?state=42"
  },
  "sender": {
    "accountId": 42
  },
  "instantPayment": false
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
CALLBACKS
WebFormCompletedCallback
⥄ post
{$request.body#/callbacks/finalised}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "webFormId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED"
}
CALLBACK RESPONSE
200
Callback has been successfully received

RESPONSE
Created web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Create a standalone payment
post /api/webForms/standalonePayment
Initiates a payment from a specific checking account. If you don't need end users to connect their account and download their bank data to our database before requesting payment initiation, then this is the service to use. Ideal for use cases that need one-time payment initiation.

In order to test the API, you can initiate a payment with our Demo banks. For more details, please see the associated documentation.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a unique URL. You must direct your user to our web form with the URL.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "orders": [
    {
      "recipient": {
        "name": "Max Mustermann",
        "iban": "DE77533700080111111100",
        "bic": "DEUTDEFF533",
        "bankName": "finAPI Test Bank",
        "address": {
          "street": "Pariser Platz",
          "houseNumber": "1",
          "postCode": "10117",
          "city": "Berlin",
          "country": "DE"
        }
      },
      "structuredRemittanceInformation": [
        "VS:12345",
        "KS:12345",
        "SS:12345"
      ],
      "amount": {
        "value": 0.04,
        "currency": "EUR"
      },
      "purpose": "Well done",
      "sepaPurposeCode": "SALA",
      "endToEndId": "endToEndId"
    }
  ],
  "executionDate": "2022-12-31",
  "batchBookingPreferred": true,
  "batchBookingId": "batch-payment-2024-09-12",
  "instantPayment": false,
  "profileId": "a2c9fc3b-1777-403c-8b2f-1ce4d90157a2",
  "redirectUrl": "https://finapi.io/callback",
  "callbacks": {
    "finalised": "https://dev.finapi.io/callback?state=42"
  },
  "sender": {
    "iban": "DE77533700080111111100"
  },
  "allowTestBank": true
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
CALLBACKS
WebFormCompletedCallback
⥄ post
{$request.body#/callbacks/finalised}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "webFormId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED"
}
CALLBACK RESPONSE
200
Callback has been successfully received

RESPONSE
Created web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Create a standing order
post /api/webForms/standingOrder
Initiates a standing order from a specific checking account. Based on the API parameters used, a recurrent payment initiation order will be requested at the bank.

In order to test the API, you can initiate a payment with our Demo banks. For more details, please see the associated documentation.

In case the API request is syntactically correct, the service will respond with HTTP code 201 and a web form resource. You must direct your user to our web form with the URL from the returned resource.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "amount": {
    "value": 0.04,
    "currency": "EUR"
  },
  "purpose": "Well done",
  "sepaPurposeCode": "SALA",
  "endToEndId": "endToEndId",
  "recipient": {
    "iban": "DE77533700080111111100",
    "name": "Max Mustermann"
  },
  "sender": {
    "iban": "DE77533700080111111100"
  },
  "startDate": "2022-12-31",
  "endDate": "2023-12-31",
  "dayOfExecution": 1,
  "frequency": "MONTHLY",
  "profileId": "a2c9fc3b-1777-403c-8b2f-1ce4d90157a2",
  "redirectUrl": "https://finapi.io/callback",
  "callbacks": {
    "finalised": "https://dev.finapi.io/callback?state=42"
  },
  "allowTestBank": true
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
CALLBACKS
WebFormCompletedCallback
⥄ post
{$request.body#/callbacks/finalised}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "webFormId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED"
}
CALLBACK RESPONSE
200
Callback has been successfully received

RESPONSE
Created web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Account Information Services
Import a bank connection
post /api/webForms/bankConnectionImport
Imports and groups all the bank data the end user has at the specific bank into a bank connection (identifiable with a bankConnectionId).The endpoint connects to all available interfaces(XS2A, finTS and Web Scraper) for the bank.Hence, the end user will be prompted for credentials and SCA for every loop over each of the interface.For best results, consider your use case and review the API parameter, accountTypes list beforeyou begin your integration.

All bank accounts will be downloaded and imported with their current balances, transactions and supported two-step-procedures (note that the amount of available transactions may vary between banks, e.g. some banks deliver all transactions from the past year, others only deliver the transactions from the past three months). The balance and transactions download process runs asynchronously, so this service may return before all balances and transactions have been imported. Also, all downloaded transactions will be categorized by a separate background process that runs asynchronously too. To check the status of the balance and transactions download process as well as the background categorization process, see the status flags that are returned by the GET /bankConnections/ service. For a more in-depth understanding of the import process, please also read this page on our documentation: Post Processing of Bank Account Import/Update.

In order to test the API, you can import a "demo connection". To import the demo connection, you need to pass the identifier of the "finAPI Test Bank". For more details, please see the associated documentation.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a unique URL. You must direct your user to our web form with the URL.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "bank": {
    "id": 42,
    "search": "string"
  },
  "bankConnectionName": "My bank connection",
  "skipBalancesDownload": false,
  "skipPositionsDownload": false,
  "skipDuplicateDetection": false,
  "loadOwnerData": false,
  "maxDaysForDownload": 3650,
  "accountTypes": [
    "CHECKING",
    "SAVINGS",
    "CREDIT_CARD",
    "SECURITY",
    "MEMBERSHIP",
    "LOAN",
    "BAUSPAREN"
  ],
  "allowedInterfaces": [
    "XS2A",
    "FINTS_SERVER",
    "WEB_SCRAPER"
  ],
  "callbacks": {
    "finalised": "https://dev.finapi.io/callback?state=42"
  },
  "profileId": "a2c9fc3b-1777-403c-8b2f-1ce4d90157a2",
  "redirectUrl": "https://finapi.io/callback",
  "allowTestBank": true
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
CALLBACKS
WebFormCompletedCallback
⥄ post
{$request.body#/callbacks/finalised}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "webFormId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED"
}
CALLBACK RESPONSE
200
Callback has been successfully received

RESPONSE
Created web form

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"expiresAt": "1970-01-01T00:00:00.000Z",
"type": "STANDALONE_PAYMENT",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 42,
"paymentId": 42,
"standingOrderId": 42,
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Update a bank connection
post /api/tasks/backgroundUpdate
This endpoint serves 3 purposes:

Updates the bank connection to present the most latest snapshot of the accounts connected to it. The update impacts account data and transaction data. The endpoint will loop over all connected interfaces and update every account (and its related data) on the bank connection. Hence, the end user might be prompted for credentials and SCA for every loop over each interface. You can also update the "demo connection" if you would like to test the endpoint.
Note that you cannot trigger an update of a bank connection as long as there is still a previously triggered update running.

For a more in-depth understanding of the update process, please also read this page on our documentation: Post Processing of Bank Account Import/Update.

Looks for and imports any new accounts that the end user (newly) has at the bank. This lookup is only possible by setting a specific API parameter.

Allows the end user to manage their preference for bank login credentials storage. Use a specific API parameter in order to allow end users to update credentials in our Database or also to stop saving credentials, if they wish to.

Note however that in case the task created by this endpoint results in a web form, and this web form is cancelled by the end user, the web form will be set to the following status:
• ABORTED - if it was cancelled before the web form managed to complete any update of the given bank connection;
• COMPLETED - if it was cancelled after at least one interface of the given bank connection has already been successfully completed.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a unique task ID. You can follow the status of the update with the task ID.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "bankConnectionId": 101,
  "importNewAccountsMode": "SKIP",
  "accountTypes": [
    "CHECKING",
    "SAVINGS",
    "CREDIT_CARD",
    "SECURITY",
    "MEMBERSHIP",
    "LOAN",
    "BAUSPAREN"
  ],
  "allowedInterfaces": [
    "XS2A",
    "FINTS_SERVER",
    "WEB_SCRAPER"
  ],
  "skipBalancesDownload": false,
  "skipPositionsDownload": false,
  "skipDuplicateDetection": false,
  "loadOwnerData": false,
  "manageSavedSettings": [
    "CREDENTIALS",
    "DEFAULT_TWO_STEP_PROCEDURE"
  ],
  "callbacks": {
    "finalised": "https://dev.finapi.io/callback?state=42",
    "webFormRequired": "https://dev.finapi.io/callback?state=42"
  },
  "profileId": "a2c9fc3b-1777-403c-8b2f-1ce4d90157a2",
  "redirectUrl": "https://finapi.io/callback",
  "userMetadata": {
    "ipAddress": "1.2.3.4",
    "deviceOs": "ChromeOS",
    "userAgent": "Chrome"
  }
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
CALLBACKS
TaskCompletedCallback
⥄ post
{$request.body#/callbacks/finalised}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "taskId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED",
  "webForm": {
    "id": "946db09e-5bfc-11eb-ae93-0242ac130002",
    "url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
    "status": "COMPLETED"
  }
}
CALLBACK RESPONSE
200
Callback has been successfully received

WebFormRequiredCallback
⥄ post
{$request.body#/callbacks/webFormRequired}
CALLBACK REQUEST
REQUEST BODY
*
application/json
Callback payload

REQUEST BODY
SCHEMA
{
  "taskId": "31c508d8-51da-11eb-ae93-0242ac130002",
  "status": "COMPLETED",
  "webForm": {
    "id": "946db09e-5bfc-11eb-ae93-0242ac130002",
    "url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
    "status": "COMPLETED"
  }
}
CALLBACK RESPONSE
200
Callback has been successfully received

RESPONSE
Created task

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"type": "BANK_CONNECTION_UPDATE",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 101,
"webForm": {
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"status": "COMPLETED"
},
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Customisation / Translations
Create a translation
post /api/translations
The endpoint provides a list of parameters that customers can use to personalize the titles and subtitles we display on each of the Web Form views.

For more details, please see the associated documentation.

The endpoint triggered with a list of values will create a translation set with a unique identifier. The translation set will be applied to every Web Form generated by the customer.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a translation set object. Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "cs": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "de": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "en": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "es": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "fr": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "it": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "nl": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "pl": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "ro": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "sk": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  },
  "tr": {
    "bankSearchView": {
      "title": "Custom title"
    },
    "bankSelectionView": {
      "title": "Custom title"
    },
    "bankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "redirectBankLoginView": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaMethodSelectionView": {
      "title": "Custom title"
    },
    "scaChallengeViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "scaChallengeViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewAis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "accountSelectionViewPis": {
      "title": "Custom title",
      "subtitle": "Custom subtitle"
    },
    "dataDownloadViewAis": {
      "title": "Custom title"
    },
    "partialConfirmationView": {
      "title": "Custom title"
    },
    "partialConfirmationWithErrorView": {
      "title": "Custom title"
    },
    "updateSummaryView": {
      "title": "Custom title"
    },
    "confirmationView": {
      "title": "Custom title"
    },
    "errorView": {
      "title": "Custom title"
    }
  }
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
Created a translation

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "234db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"cs": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"de": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"en": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"es": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"fr": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"it": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"nl": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"pl": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"ro": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"sk": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"tr": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
}
}
Delete a translation
delete /api/translations/{id}
Delete a single translation by its id.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the translation

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
Translation has been deleted

Get a translation
get /api/translations/{id}
Get a single translation by its id.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the translation

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A translation

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "234db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"cs": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"de": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"en": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"es": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"fr": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"it": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"nl": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"pl": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"ro": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"sk": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"tr": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
}
}
Get translations
get /api/translations
Get all translations.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
QUERY-STRING PARAMETERS
page
int32
1
Default: 1
Page to load

Examples: 1
perPage
int32
20
Default: 20
The number of items on the page

Examples: 20
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A page of translations ordered by creation date

RESPONSE BODY
SCHEMA
application/json
Copy
{
"items": [
{
"id": "234db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"cs": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"de": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"en": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"es": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"fr": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"it": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"nl": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"pl": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"ro": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"sk": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
},
"tr": {
"bankSearchView": {
"title": "Custom title"
},
"bankSelectionView": {
"title": "Custom title"
},
"bankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"redirectBankLoginView": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaMethodSelectionView": {
"title": "Custom title"
},
"scaChallengeViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"scaChallengeViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewAis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"accountSelectionViewPis": {
"title": "Custom title",
"subtitle": "Custom subtitle"
},
"dataDownloadViewAis": {
"title": "Custom title"
},
"partialConfirmationView": {
"title": "Custom title"
},
"partialConfirmationWithErrorView": {
"title": "Custom title"
},
"updateSummaryView": {
"title": "Custom title"
},
"confirmationView": {
"title": "Custom title"
},
"errorView": {
"title": "Custom title"
}
}
}
],
"paging": {
"page": 0,
"perPage": 500,
"pageCount": 0,
"totalCount": 0
}
}
Customisation / Profiles
Create a profile
post /api/profiles
The endpoint provides a list of parameters which customers can personalize to be in line with their brand's styling.
The endpoint triggered with a list of values, will create a profile with a unique profileId. When the customer passes the profileId on an API call, the values from the profile are applied on the web form while rendering to end-users. We welcome customers to set up a default profile, so that they do not need to pass the profileId as a parameter for every API call.

In case the API request is syntactically correct, the service will respond with HTTP return code 201 and a profile object.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "label": "Mobile application label",
  "default": true,
  "brand": {
    "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
    "favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
    "icon": {
      "info": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE4cHgiIGhlaWdodD0iMThweCIgdmlld0JveD0iMCAwIDE4IDE4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDxnIGlkPSJpY29uSW5mbyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxnIGlkPSJEZXNrdG9wL1tQSVNdLVNpZGViYXItVmlldyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzMTcuMDAwMDAwLCAtNjIwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8ZyBpZD0iaWNfaW5mb18iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzMTcuMDAwMDAwLCA2MjAuMDAwMDAwKSI+DQogICAgICAgICAgICAgICAgPHBhdGggZD0iTTksMC4zNDYxNTM4NDYgQzQuMjE4NzUsMC4zNDYxNTM4NDYgMC4zNDYxNTM4NDYsNC4yMTg3NSAwLjM0NjE1Mzg0Niw5IEMwLjM0NjE1Mzg0NiwxMy43ODEyNSA0LjIxODc1LDE3LjY1Mzg0NjIgOSwxNy42NTM4NDYyIEMxMy43ODEyNSwxNy42NTM4NDYyIDE3LjY1Mzg0NjIsMTMuNzgxMjUgMTcuNjUzODQ2Miw5IEMxNy42NTM4NDYyLDQuMjE4NzUgMTMuNzgxMjUsMC4zNDYxNTM4NDYgOSwwLjM0NjE1Mzg0NiBaIE05Ljg2NTM4NDYyLDEzLjMyNjkyMzEgTDguMTM0NjE1MzgsMTMuMzI2OTIzMSBMOC4xMzQ2MTUzOCw4LjEzNDYxNTM4IEw5Ljg2NTM4NDYyLDguMTM0NjE1MzggTDkuODY1Mzg0NjIsMTMuMzI2OTIzMSBaIE05Ljg2NTM4NDYyLDYuNDAzODQ2MTUgTDguMTM0NjE1MzgsNi40MDM4NDYxNSBMOC4xMzQ2MTUzOCw0LjY3MzA3NjkyIEw5Ljg2NTM4NDYyLDQuNjczMDc2OTIgTDkuODY1Mzg0NjIsNi40MDM4NDYxNSBaIiBpZD0iU2hhcGUiPjwvcGF0aD4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg0K",
      "loading": "data:image/gif;base64,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"
    },
    "introText": "Welcome to finAPI Web Form. Please follow the on-page instructions."
  },
  "functionality": {
    "bankBanner": "RENDER",
    "progressBar": "RENDER",
    "bankSearch": {
      "defaultCountry": "DE"
    },
    "bankLoginHint": "EXPANDED",
    "termsAndConditionsText": "BASIC",
    "storeSecrets": "RENDER",
    "storeSecretsSap": "IMPLICIT_APPROVAL",
    "bankDetails": "LOCKED",
    "header": "RENDER",
    "language": {
      "selector": "RENDER",
      "locked": "DE"
    },
    "tuvLogo": "RENDER",
    "skipConfirmationView": true,
    "accountSelectionConfiguration": {
      "mode": "MULTIPLE",
      "preselected": true
    },
    "hidePaymentSummary": true,
    "hidePaymentOverview": true
  },
  "aspect": {
    "colorScheme": {
      "brand": "#00ADDF",
      "secondary": "#00ADDF",
      "text": {
        "primary": "#232323",
        "secondary": "#848484"
      }
    },
    "text": {
      "fontFamily": "Calibri,Roboto,\"Segoe UI\",\"Helvetica Neue\""
    },
    "theme": "DEFAULT"
  }
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
Created a profile

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"label": "Mobile application label",
"createdAt": "1970-01-01T00:00:00.000Z",
"default": true,
"brand": {
"logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"icon": {
"info": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE4cHgiIGhlaWdodD0iMThweCIgdmlld0JveD0iMCAwIDE4IDE4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDxnIGlkPSJpY29uSW5mbyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxnIGlkPSJEZXNrdG9wL1tQSVNdLVNpZGViYXItVmlldyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzMTcuMDAwMDAwLCAtNjIwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8ZyBpZD0iaWNfaW5mb18iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzMTcuMDAwMDAwLCA2MjAuMDAwMDAwKSI+DQogICAgICAgICAgICAgICAgPHBhdGggZD0iTTksMC4zNDYxNTM4NDYgQzQuMjE4NzUsMC4zNDYxNTM4NDYgMC4zNDYxNTM4NDYsNC4yMTg3NSAwLjM0NjE1Mzg0Niw5IEMwLjM0NjE1Mzg0NiwxMy43ODEyNSA0LjIxODc1LDE3LjY1Mzg0NjIgOSwxNy42NTM4NDYyIEMxMy43ODEyNSwxNy42NTM4NDYyIDE3LjY1Mzg0NjIsMTMuNzgxMjUgMTcuNjUzODQ2Miw5IEMxNy42NTM4NDYyLDQuMjE4NzUgMTMuNzgxMjUsMC4zNDYxNTM4NDYgOSwwLjM0NjE1Mzg0NiBaIE05Ljg2NTM4NDYyLDEzLjMyNjkyMzEgTDguMTM0NjE1MzgsMTMuMzI2OTIzMSBMOC4xMzQ2MTUzOCw4LjEzNDYxNTM4IEw5Ljg2NTM4NDYyLDguMTM0NjE1MzggTDkuODY1Mzg0NjIsMTMuMzI2OTIzMSBaIE05Ljg2NTM4NDYyLDYuNDAzODQ2MTUgTDguMTM0NjE1MzgsNi40MDM4NDYxNSBMOC4xMzQ2MTUzOCw0LjY3MzA3NjkyIEw5Ljg2NTM4NDYyLDQuNjczMDc2OTIgTDkuODY1Mzg0NjIsNi40MDM4NDYxNSBaIiBpZD0iU2hhcGUiPjwvcGF0aD4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg0K",
"loading": "data:image/gif;base64,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"
},
"introText": "Welcome to finAPI Web Form. Please follow the on-page instructions."
},
"functionality": {
"bankBanner": "RENDER",
"progressBar": "RENDER",
"bankSearch": {
"defaultCountry": "DE"
},
"bankLoginHint": "EXPANDED",
"termsAndConditionsText": "BASIC",
"storeSecrets": "RENDER",
"storeSecretsSap": "IMPLICIT_APPROVAL",
"bankDetails": "LOCKED",
"header": "RENDER",
"language": {
"selector": "RENDER",
"locked": "DE"
},
"tuvLogo": "RENDER",
"skipConfirmationView": true,
"accountSelectionConfiguration": {
"mode": "MULTIPLE",
"preselected": true
},
"hidePaymentSummary": true,
"hidePaymentOverview": true
},
"aspect": {
"colorScheme": {
"brand": "#00ADDF",
"secondary": "#00ADDF",
"text": {
"primary": "#232323",
"secondary": "#848484"
}
},
"text": {
"fontFamily": "Calibri,Roboto,"Segoe UI","Helvetica Neue""
},
"theme": "DEFAULT"
}
}
Delete a profile
delete /api/profiles/{id}
Delete a single profile by its id.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the profile

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
Profile has been deleted

Edit a profile
patch /api/profiles/{id}
Edit a single profile by its id.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the profile

REQUEST BODY
*
application/json
REQUEST BODY
SCHEMA
{
  "label": "Mobile application label",
  "default": true,
  "brand": {
    "logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
    "favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
    "icon": {
      "info": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE4cHgiIGhlaWdodD0iMThweCIgdmlld0JveD0iMCAwIDE4IDE4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDxnIGlkPSJpY29uSW5mbyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxnIGlkPSJEZXNrdG9wL1tQSVNdLVNpZGViYXItVmlldyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzMTcuMDAwMDAwLCAtNjIwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8ZyBpZD0iaWNfaW5mb18iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzMTcuMDAwMDAwLCA2MjAuMDAwMDAwKSI+DQogICAgICAgICAgICAgICAgPHBhdGggZD0iTTksMC4zNDYxNTM4NDYgQzQuMjE4NzUsMC4zNDYxNTM4NDYgMC4zNDYxNTM4NDYsNC4yMTg3NSAwLjM0NjE1Mzg0Niw5IEMwLjM0NjE1Mzg0NiwxMy43ODEyNSA0LjIxODc1LDE3LjY1Mzg0NjIgOSwxNy42NTM4NDYyIEMxMy43ODEyNSwxNy42NTM4NDYyIDE3LjY1Mzg0NjIsMTMuNzgxMjUgMTcuNjUzODQ2Miw5IEMxNy42NTM4NDYyLDQuMjE4NzUgMTMuNzgxMjUsMC4zNDYxNTM4NDYgOSwwLjM0NjE1Mzg0NiBaIE05Ljg2NTM4NDYyLDEzLjMyNjkyMzEgTDguMTM0NjE1MzgsMTMuMzI2OTIzMSBMOC4xMzQ2MTUzOCw4LjEzNDYxNTM4IEw5Ljg2NTM4NDYyLDguMTM0NjE1MzggTDkuODY1Mzg0NjIsMTMuMzI2OTIzMSBaIE05Ljg2NTM4NDYyLDYuNDAzODQ2MTUgTDguMTM0NjE1MzgsNi40MDM4NDYxNSBMOC4xMzQ2MTUzOCw0LjY3MzA3NjkyIEw5Ljg2NTM4NDYyLDQuNjczMDc2OTIgTDkuODY1Mzg0NjIsNi40MDM4NDYxNSBaIiBpZD0iU2hhcGUiPjwvcGF0aD4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg0K",
      "loading": "data:image/gif;base64,R0lGODlhKAAeAPcAAAAAABY3QzqRsTqSsjuTtD2Vtj+VtUCVtEGWtUSYtkKYt0KZuUKavEWbu0eauEucuUueu0+fu0yevUiev0ifwUyhwUyiw02iw1GjwlOiwVGiwFSiv1WhvVeivVqivlikwFmlwl6mwWGnwWSowmKpw1ypx1eox1OnyE6lyFCmyVOoylapylury1+sylytzVutz1yu0V6w02Cw0WKx1GSy1WWy02ewzWevy2qvyWmtxmmsxGutxW2uxW+ux26vyG2xy3CxynGwyHOwyHWxyHezyXq0yn23zXm3z3W1znK1z2u002q21mq22Wy32W632G+523G523K63XS73Xe823m82Hq+3n6+2YK/2IS+1YS904G60H+5z4G6zoS70IW7z4a80Im80Iq+0Yu+0oi+04rA1IvB14zC147C14/A05DB05LD1pTE1ZjF1pnH15vH2J/J2Z/J2pzJ3JbJ3pLI3pHH3I3F24vE3IfD34XD3YLC33/B4X/B4oHC4oPD4YXE4obE44jG5IvH5Y3I45DI5I/J5pHK5pPL55XL55bM5pfM6JnN6JvN5JzP6p7Q557Q6qDR6qHR6qPS66TS7KTT6qbT56nT5aTR5qPP4aTO3qbO3qnP3avQ3q/S37LU4bTV4rbW4rnY47zZ5LrZ5bjZ5rXZ57LZ6qvW66jU7arV7azX7q7X7rDY7rHZ7rLZ7rTa77ba8Lfb7bjc8Lrd8Lve8b3f8r7f777e7bze7Lzc6r/d6L/b5sLd58Le6sXf6cfg6cng6svi6s/j7Mzk7cni7MTi78Lh7cHh8MHg8sLg8sTi88bi88fj8sjj88rk9Mzm9M7m9M7n9NDn9dHm79Pm7dXn7tfo79Xp8tPp9NLp9tTq9tbr9tjr9Njs9trs99vr8dzt9Nzt997u+N/v+ODu8+Lv9OHw9+Hw+eTx+Obx9eby+ejy+Ojz+un0+uv0+ez0+Oz1+u71+e72++/2+/H2+vH4/PL4+/T5+/X6/Pf6/Pj7/Pr8/fv9/v3+/v7+/v///+HA+yH/C05FVFNDQVBFMi4wAwEAAAAh+QQFAwD/ACwAAAAAKAAeAAAI9gD9CRxI0F+/gv0OHkS4sKDAhg8dSkwoEWHFiRAvRlQYsWLGjiAtahxJ0mBIjwMTqjxZ0iRHhiZHfmQZc6PImBBnZmxIUabBng5npkRJMKfHhUh1Dr1ZMF8nL6GWtpQa1N+4DQh4gKJZ9KFQhvlA4Gj3cqXXiVVxCiRlwV3Xo1KVEpxDZefOmiy/LsIT9KtGv8Si0MPJjyrIj0YH6isU6Z5Bfvf2GSa6NGM8VKeaaQtHryfSyX9/Ctxnrpu5ejxD+sX7Nm7rxK1dFn35NvHXzyT9pvb5WS5Qyjanoq0svHhX2mlFG4fpO+Vq2LKH08R90Wx10KwDAgAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/CfzXbyDBf/4KDvTnD6FBgQwfGmw4UaFAixYj9rN48SJFiSAdHuQ4UCHFjCERkhQJUSJHjAZXdiRYUCbLmCs/MmzYsF/ClTZb8oRJ8WNNiR9H2kzacuLMmyedhox48KFJhFSt9tyYEulIlj5LZmSadeNGnV2PCvT0xQuwpi9fVgX7sCE5EAt88IDjkCvIokznLvSXr8UPd0131swK0m/RprhOwJMaEyLapnUVFlyEhyzZmzcLJuU4aRDShCVxWg06EJofeyJRYz4oOypEtUf3SWKFTyU/zYH/Yhw9kJ6sWdrSydtH9fHstA6p8mNn7l2+y0Z7pgweFqXguiW1TS90KhsrWNGYw4L+m/q7SL8X1accHlu+U5/B749337V90qLwfVVTUKyNd5JmNNWVX39zMRaTc+jZZJ94TA2X0YCVLXiWg/G1hN53TAUEACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8J/OdvIMF//QoiNMiw4cB+DiEeHKhw4kKLFwUqlOjQYEV/CRFyTCgxYcWLHCkahJjSYUGFJz12hPlS5MyH/iqOfBjyYM6FEk+2ZPixX8+FNVe6JFjy4cWYTn9GnGi0IVSMRmMaHUpRqsyOPoniLNgSpNKcXnk2DKkQHhwhQt7MY8jxZ9WkTTcatIYhQ5ctDtJATOt0Kth/9lxcwVcwn76MFllaFSqwJKwa95RmhNqSK8x/kRBVHl25s2aNVg2yinTYJdnUYLkpqidycFWgTKmiVvkSZEF+sWhlrr17beqyFvM9c2aOnj7TkKMft4mwHr18/Fp/pisd5eitafVMqszd/fDgqxhbe6bu8aTXnlzhj48unytSoujNX60acmvK3twVh1tTT0nl234rQSfWgiWJJyCBus1n0UcH3XVWaZCdx11QerkX4EABAQAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/CRxI8J+/gQcLDuynUGBCggwhFmQY8eFDhwUTRlz4rx9Fggn9afS3MSRCjA0R9ruYUiLKjgI3clQo8mPKgx5fWnwok6TGmAZnwpQocqjLk0NNmsSI0yjMlUAhMsQ5lWVUmSCtBqXZUiZWoF9jWuz48SJPoVuhbiWLz9MYMJ7yAS1KFunCkCU3hmtxAUkQBB3QOQV5s6XAfE6szGOoLoivizkN24Sq9p+xKPUans04WGpUVZOm6tQoGqZWhTlnuUK9FjLGqpHRdkulz+HYtWtXbrRJ+N++ZM/22SY58alVjweJC72nLVw9ffwWIi9tFy3TmPzu4eMXsftRimVxXCNMntwgXYm6Nb/m+nQ3R++7P35t+v58VOskqatV/lPs09biVXcfa0eJVxFKIiUYk1cHetQTUngNyJ+D1KEXoGEXmuYfca7lxxpWWDVV01LlqXRVUCxRZl1QGwUEACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8J/NdvoMGDCAX6S0iwYEGFCwdGlPhv4kODEwketFixn7+FGQ9e/MgwYb+HF0uKTBlSoUuWGlNWnBlz4EmPLQ3KFPhw4UmfHCeGjFjQ30+eRHkeNelQZFKXQhEahahzI8GWJxmCbFjTZMaQRWmK5Kk0ok+yGBvmBFvRqLRMmaY59DnXrNORIwe+o4KiBIYCQuqJRXiT8OCm+/pUIScwWAQeGkEa9YjW4lCN/6DtiWewGo99eLtSxmyTJE1ZqyZnxdzz7GGbUhcmOyaVa22Jra0OBEeLX0eKGJsq9NjT5EB9zsxlvTmV4tbaPfMKrGcuHujRIEenXI0Udlp//PBn7YtKM+xwklNR2uS+fuzM54Z3XqRsmuRP7JW3fu3++/VM6SNdBhx7NMGnFFruFbeTWAuShlVGRZn2kkQSFpfQVM0V1ZSEZKH3n3HzkWXee6uRJ91H7G0lnU6u6ZbiS0S9KNZT/P0TEAAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/9fv3zx9BgQcTChw4UKHDggYNHmyYsB/FihIrEhyYEeFBfxwfOuwo0iNDiAJJgvSosJ8/kgtZUpQ4s+THgggj2myJsyfBjB1hblS48iXLnz87XnSpMyHQmBdH4oy68yHJkzcLujSZtaTSoUh7vtyK1GVUpjGvdvX3jdQock2NCr05N6E9QTBWXFjQBd9SjEaJSjXIT1Gfbf325XpQROvEqT1PPs3KrVC8hL8GTAt6k+xPhg2jKpuVlCCRX2GzXpwc+uAzaA/RcpVKtaW5Zw1XOgx5NaPnzwT1gZNHNrDN2pOh5qOX7zfO5Km15o7dj5/F2pBlIjXo+aXvpK1XUWJ32tWnb6zGndbV7tEoRbPlo1fEPnb96ujTfT4WqfO9UO48gSXYfCnNFtNU54GUXnkzUdXUVlt9lZJ4LekmlVUWVYggfEe5N1FuM0m4U1QBAQAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/+ftHkGC/gf0KFvQ30F9ChQ8VSlw4kWHBfg8H/sNIUSDEiR4lPoyoUGPEkQcJNiwJsiFJlQZjClwJc2PGiwJfbtxp0GFOnCBF2jwZVGdNmyFhIjR482hSoD1VuuQ5MWFKiRohZsWIcWtCmlF/aswaVKhKnWRrjgR7lKHRoOZs5UpXdSTVu2YV3nvEZMYJCmTykR2806jdiPxSGeLWb18uCUY4LvTpdmPDtDIFmosUT+EwAnkXWvW4EvM/bMtiDuTgpmxXvKq/GuzWbSKYTRHHUs099KPAd+GymvZZkerwhPve4dNtGeldk2GLE9ynj59s3y2dzywM1O1B6ExrWDpkC5PjS+jMyYO8jn1t+fVFWVqemtHq+NDwLZZdul54UNNYlXURgBURt91TzWl1X04k8RfSV1M5dRJhmQ0ooG4pQZfhXVdBdWBVpKXUIVPC+fcTiPEBFRAAIfkEBQMA/wAsAAAAACgAHgAACP4A+/37J3CgQX8GEw7shzBhQ4UFFxosGPHgQ4EI+2mEOBDhxYoFG2ZUeLDkP38PJ1YkaZJlS4EwNWJsGFMkRI8lbXZkyZCgv54of7YkiJHgwpUMU5IUmRKmy5AOWf5UanQn0qVOgypE6TIl1ZVGV448Sdbl1qIkkV6syjIdsWLqltocu9YoV4X5WO2BIgOFGXw8o1ItO3UiLUnh/u3jhWGL1qg7lYqduO4VvbDCChDtiDEizrMnNxIMh42zwA5tEk4mO5lix3Tp2P4bkeYpZLt3dw60B48kj1Cqm1qUyBZqv3z7lnbUWbVnYLuhNQ4ePDF3zpc9Q25EuZrj8rLKiU8TBRte/G3wI39KV7lwbeecMKc6D+xat/mJurvLJi81bf/2/nn23EGr0XSSdbkJaFJr4KnW4HpoOQgZVF4peN5/bDHXnlBPoeVUg/BxlVFAACH5BAUDAP8ALAAAAAAoAB4AAAj+AP39+yew38CBBg0ePOhPYT+FBxMSRDhxoMCJDx8utGjQn8eI//oVDElx5MOLG1FqDLly48KODRFqhOiSJkaWEy96jEmy4UeXFkFSpGjToUqeQUUO/VnxZseIECVGJZmT6NCaNkOijChw5NabC7uGBSr0ZdamDCu2REqWqMKvVE2iTfoyJDtnzNptdJjS5ci6CfXRMtTnCYw5+mpulQr05NBmrswZLLYCS9G2Y8n6i7fsHsNhDKoxbXjWLMGTOtmZyynwA5ySmC9K/Si73jybI9bA7ViaKtB9+TbKQ/ApLs6mEHWmJdmPH81qIuxRbZn86vKtYq9KHNrbt+agFlFZkt7bt7H3zARVXvZL9in79NhjykYOV2z26cvBe5cLPqPKsjVhZtVxsQHV1XbvwVYXet5Vh1ZGSlml3koxJScffm25t+BpBJomVFQfOZRVQbvR9RRTAM7lT0AAIfkEBQMA/wAsAAAAACgAHgAACP4A+/0b2M9fwYH+/iUcyLCfQIYEHyZcCLHiP4EF/WnE+NCiQYUdJwpcqFFhwo4VR5IsafEiQo8lKUYc2XKiTIUEGX48GbHlRYoLD8o8CBKhwZs4EaJsWHRiRZZJiepcivMkRZRIcTrMKTOoR5c+U37FqBNsS6omIfJcGjIsQZ5VydJM+1bhu2zQ4l2U+BIiW6Nqq+ZTJimRniaW9j3k+/WqS6gJ+WFbFs/fvmIv5Nz8aNat34H0uukjiosCupQag1ItmdFvPXp++VXw9JJs0oY0nbocqU8f1H8bMtXMynVxSn4VyRHwhRpuX59Yt+7d0WFfUpatA1M1/rzfF29qMWOSfB7+LPTPRcF23P5StUWyK/1+NC69a07c7x0yfi6Sqef4jLX1VHo6/RaUVWAd5R9q1/1230wPkrfeWGYNJV9g6EmkW25PpTbVZmXd5phUTNnnIGCMAQUTSvs1BBRx6xEHVkAAIfkEBQMA/wAsAAAAACgAHgAACP4A/f0b6K+fwIH9BipU6E9gwob/IC5ceHCiwIMPI2KsSJAgx4gTLS5M2PEfSYUnTZZEGbJlw4ItVbYkKREkwYcVU8JkmVPlR4Q2J/YbuhKhwaIjSRI1yPEgRpk+bT4NypNhTKpAs7KcmRKk05JdR6oM+zDhybA1RQr1Knbs0X/82HHjZk+jVp46x16998zVKUJ7YEksqNTk27xX94Xjdu+fvls0SoU8+VOs2ZL42r39V2kFPrUI02bduVCfPpn+3lEQRhEr0YZhIx7tx68rPga9rmK1O9ks0YW+CqADGTs21NlOYfpT12FIZYOXKZIu2dPkAw/wqG++StNlUGqfm1eGvFiR9G+j3c92/B39InGnKQuTTouz8tqg9u++Hj1ZrEP2W1G3UlNo6YaadFbJlNFsAYp0XkyFjbfeUBtB1ZZaxnVFmVbdZRWdgSBWl2BbleWUEVJqBQQAIfkEBQMA/wAsAAAAACgAHgAACP4A/wkc+K+fQH8EDSrs5w+hwYQPExacKDAiQ4n//PV7aLFgRIoDOVYciDBhyYcODxIk2HAkyJcrKWqMSZNmSpIKVZIMyfAiyJIlQ7K8GdFhx4ooUQp1ydJnRow6P+o8WXOl0qAsrQJdCrXqVoRYCwLF2lJqTqtcbapsOTGeOHP5VlI1uNUl2JgP83VLFutRImY0N860KjJsRX7v1ukTaCwKMaRigx7dqTLiPnxYKS3ZV/WpVLl4+a0sl+IbTKFsM35UCLRnxHYUqk3+XNMn2NQFRzWYh3PmRcOVnwpX+m9chC9QT1LdKZKpwzAIRtSTODcw8MBeNi3Ge9drTrYMw1MGbYjyq9CzqlGLJQyaONSeTDsPDh9y8ET38DOyHSy5ttnrp+mEkX2ejbeWcFkdZJ9T+h20UVe/UUZggCNdR+CFBqqXlHwv0UYSgGh5GFWHHT0UEAAh+QQFAwD/ACwAAAAAKAAeAAAI/gD79ftH0N8/gwQTJkSIMOHAhQofRixIsF9DihgPQvTn76HFigMZCryo0KHGgR//eVQpUCBEjRVLdlTYkGTGkiVTVjRoUybPnThVOqw5ceZIjgslIvx4kahElSSfBrUptSfLh0tf4sR682LImDCFTlzp0ipNmRafMtXo1ajagv3qrVu37+1BnVJRBoW5j502Zq1OZZP4ledSi0j3Js1Xbx9BZYCgcQUbtufShv3qKjRVhV9OnFm/xlQqtGG5GOXCig3rkvVPlIaFqkuxzaBomIRl3lUN1t8oC/bOZjWZ0ytFj+MylBnqU6pYhkkdauKiIEfwyWerfg6qb8SOTau1W4YXWjgq2Ly2WzsMyXQm7o63Fw6HujVjR+iKld4urHfv/f5YaadeQSSZV994ZxEHUW4Thaeee+Zh1dRzvImHkXaK8YaZc6XtNNN8oFGYYX7H/aTge7sRuNFAAQEAIfkEBQMA/wAsAAAAACgAHgAACP4A/wnsN/AfwX4H//kzKLChwocCFzJ8uLCiRIIFMTokKNGhQ4kLOYbE6M8fQo8NK3rsmFKhRZQfWXpM2PDkxokHNUI8KbMgzI81dbaEWTLmTKAQJ5rESBKpUoY9GTJ9KPSoy5UGEdIcenNiSqY9TRasyPGq1Ig/sUYVqtUkSI0X/eWLF29fx34dWYaMSDYtQnzquCWTFW5vUb1oP+qc+o+fPn7/9kVjxE0lRZtd2bI8qTEWIchOfeJNWnbzRYHnopwb2BRlUaw6ZS5sF+Nb2sSkfyakiWuFPa9QEWtNTNJmR3Im6gxdLDaqT4/60rjp0gDH76hxaxI9KzAfEQ87Nlvt/Cl2pUaaIA9j5bueKm60Jc+HbX2bftWspPdqh39XrcLzafV0320goTVgSqd9ZeBQp8W3XGz/YbafVVuRd+B+FxYlVHl4lTWQTLslddtGEHL1nFej4XRiTQEBACH5BAUDAP8ALAAAAAAoAB4AAAj+AP35+zeQ4L+DAg3+6zew4MGHEBFGnKgwocOHDvst1EgRIUeCGRNG1Phx4UWGHUceLNnvo0N/KDGulFmwIcyJCT+2XLiR58OdKzXmVNizo1CVDGNSfHnzJsuVF2/OpIkzJUGUJCPaJOpTa0upJGsC7XoUI0mXV61ObAkUplKEFj1K9dlvH756+yBeVJsVaEmB/O6t09bsnMSfU9MG5SpzIb+W/MCpEld05l6DSa3G1Zgs0tSShy9fPgyRnZ91PJ2qHVkTMcR3TygTBb1Ur1a4B23RuMdx7NjGt4UOrGuSnAs5WU2iLcjxZNR++hIAadNlQhJ8Kl1nHX2Y464iIYRdeMpb1nXiuRKHK0zOt6vPvW8ZJ6bNs7x85mvfkxZ5Pv7UhsD99xtZVal12U7sQWTfST+phx5IP7EFoIKKQZWeeQ/SlViAKWVEGmbN4dQcfavNlOBtTaWG0YTwCRQQACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8JHCjQH8GBBgf2I7hw4T+HCh9CPEhR4MSDFw/6a/gQIcR+DhMSFFmwY8d+JEv+I+lvI8aVChcadFlRosGLF1uubDlzpEidCDUytKgyYk+RIEtyDAozocyCOZmalFqxYdKSTkNSBJkS4UyuML0yBUq0qVOPFh1OvMrzJ8mMHXti3bgP38uhJ3/uDEtTIT9867qliwm1bNi9NQtu5MnumLinWqeOXAnxrUqD2FTx44s38dWaKAXGS8Ru50fChjtb3MgxXh9zFLtu7dzXZC0p+fiGhpnzbFyCaD7B3FbDktyviSX7XulmAAkySCxc0acW5dK9smMPnCYGSBZeOFdXx+0qm+VhySaPn58sUXth3hNro8d4U2x21UGTso2d0e3v5BEBOJVOyPF2nlWpuZSQb2rtRGBslsn21H+67XbTbnDhBReGZF2HWHYZYhWZZwoxuFVlAgUEACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8JHNiP4MCDA/0dVKjwX0OE/h4K7FcQ4b+C/gpWZBjRIsF+DB16dChRIcWRIhMerDjRY8aTIFkKzHgxZcuEDSWCFCnTYk+EP1FSNGnQ4UmLEVlKXCmTKEaPGmu+hHkx6kKSHZEuXbj15kyaQI9OrEhxJ0qVJIeK7Tqy4dqxYgnu23e1ZkyjYJuOXZqRH7516/hdzIr3YVykiC/iiyYuK9iQLCMXlaqx7D9zs+iOrWvXYFKUbu9JYneVsOmVJFdyNErv0Dqgk6nanO0PWJqQ/2oB0ifVqNG7cGcKbxmMgJp8F4k1gdUZLcThEFmCUgABSAsVjfjRNG32rE+T7jZjqbn0jaFl6DU5Q/W6njDssyDZJtzoG6fP9C23P70ZFONTsqnVF9ZHsO3H02xXWcWeTurBtlp8+Lk0XFc9aZRTenpNNJWCnznXnWT7XaiSgcIRhV9kZIGVWIAn3rTUf/JVJVBAACH5BAUDAP8ALAAAAAAoAB4AAAj+AP/96yfwn7+CBwsqXMiw4UGCCxMWhPjwoMSJBCFCNDhxYb+LAyM27DhS4keFGy1yvOjvZMKUGzumFEgQZEiGMQXanMiyJcec/kzS1InyJUKbFmPOTGowqMSgJENuzCg16s2cVhFqrAk1I9SVWR8OZfhVKNWbZJFe9PqR30iwcIXqNKp13716NWlS7BgU61uF/vaZW8cX5cmBT32KTWjRab93zfQdRStSZz+NKA37y/cqHsKxmUHTrYnmF2B6kt5V5oj4JearAoXocEvTGKN9ZKcu/hr6YDUDX+r941erCjO4Hin/9dmvl4QJNmDQcJWX7F/Qnw3aE3WJFLuQTkFdqsz82nrVj35lMi+ZfvV4vUsNUmVM1ONJpfRr5nQZ1Wl9wPKRRFdYAA41X1gzlVfYdXqhNWCA2WEE2Ef+GXXYZxde+N5ZEv6V132sUUgUSOlRtNdPADLnk4OLCRQQACH5BAUDAP8ALAAAAAAoAB4AAAj+AP/98yfwX7+CCA0mTHhQ4UKB/vo1bEhQYL+KEC1apEiwIkGJCDFm1Dhw4UeHJkGShNhwJMuNLUuGnJkwosiDFQ+qfHiRpE6HLUV6tCiyoM6IMjX+HBgTJc2MTZMWRJrxZMepJDFi7Ck15FaiEG9eDcqTIVOF/r7OHFs0qtGwVZkuBftw5VmEFycy3afP4NGPc3G+rfuQn7x6WIGmbdmUatGa9cDtI0xTIk6bVP/xC+INrj5miCmP5KpxKL8DnfTWi0WvLFaONRMKyRGU2Sp+ObGmbRt1azUFY+b922eMULaVeq9SDnrRF4YLSpZIQXazq97YhO/xqmQrntu3vWVdFv161eZCtzav+0Uas+lOk2kHs2SP169DpFvZC+6pFS9pp/SFBNJ4b/XHEEUlEZiVQoIlmFh938XnU0n/NQbXRJmtVZdQ9ZlUYG5AWVjfSYSp5SFIA/7HlHldSRUQACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8JHOhvoMF/BfsJVGjQn8KCB/8xRCjQ4UGIESH6wxgRYUGIEzMaZDjxY8eKCSkqfHiyIkqOIWNKFDmwH8ePGhlaBJnTJMWOIVVyRKgzo82NBGsSbTnz50GZQ5u2RHoyKtCkKoPabPhUosaGKZ0WVXqRrNWaQZs63Lqwab+0ILtu/Ur0qE+PRO9WnJg2pj59U13ilTpUYRFfB/O94zdSZVuwY1PuIxBq5L5u+d4yLTnS4kEEnnb+u9fs3syVTpPeJCxRiI+D2I65xAgXpdSL1RqYqSewWaRwgpeGbQu1ZsFhJlZMqRIIGtOZwyP2/YevWKlk9DaSfGxyJd/t0mFXGm/4lu3s4Eijen4YHTXxoSY9U0yfvixOrO7BliWfciVVpWkx9Z9Mz/mE2nZxBVjbWjwtpNdtQol1knuaAWWRZtGpBd9HQdGVWlcOGhcSfcFxZZVW/wQEACH5BAUDAP8ALAAAAAAoAB4AAAj+APv9G0iw4D+BBvv5G9gPIUOHDf8tLCjQX0OBDg8aZEgx40aJBDNCVDhw4seTIEuCjLjR40aTKUuSfChyoUuMMW02hGkzoUaCEz2OlNiTpcqfGSfCfIkyptODCJeGDNoyosufIbESTdoUpFSuXQ9KLWiRolaiZnn+9Mf26NmZZReWPRsUosG5TN0K1BWGLD+XeDlORblQhBbB+/JdlMmY502E/fgZAOX33b62hC9CTrm5nwNPnPeBUyx3ps+QDk1WPPKDH8dw0QQDDTt2oLcLdQbyy+bqnNGEah2THShMBg0/gRxlw9qTbtXAKZnJckZPJVzZcr8urciSpNysCjFNq0atEXJgpS1Vzv0uMmx7oQ8/1v54dXje2Wbj3yULmLBXtxKF5xRVd5VlWm3NRXUSTrOht5lG32HG2Xf7MQgTg1UxB1RqYZ2VIX7/BQQAIfkEBQMA/wAsAAAAACgAHgAACP4A/f37168fwYID/wlM6K9fQ4P+BBpUuJBiwosLIzYcOPEixoQOK3a8iFAhR5MDK5LkaLClypUdVU502HFkwZEeUaaMeDJjToEvCVo8mVIoRJ0fGVbkybDoyow4b+bEmXPqT6AgR25UiBNoS5ApJwbtWbWs2aovRTr1OBPlUYlFv7ol6FMoyLpik4ZVyAnYR55HtVIl+hHYAFA1o9pEOjarkCB7+/HT2JQuWq5CmSqMsMmjP3z8CL8MyXTpxob+QGCKye/dPowIBWdeWPOhGRuvTbILF1pi26pUqaJbUUdeQXPJ0jHNi7ms3JzbokQ59EhVN4dEMy4ti7plR33QklNl82x37WWTJbGb1YqUPF2sDNWzhZ32p96zf7nXB56VuVP45Q02U0nmmbXVfAgSNViCC2InU03uPWQUeY0xpxZ/Cbo3FYB2vZVYgY01RWB5mpkVEAAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/9fvnzx/Bgv8SKlRoEKHAgwMXSiQ4sV8/hAYvRpQY0eBCjxJBMnz4UGTCjBgJDtw4MmTCiycpshzokOTEmwtX4txpsifFnQ912rxp8qfFnwxrlsS5UWjGiiFZFv14cKpNfzCXvmw6E6hAjyxzih0aMyzYmCNFqrP38irVnFPNJtR1AI5XpGjlzuxHDkGYfSUzdjz7tC3HjQXXfNhnsWFThWG5fs06EsiZifw6RjxqkbJXmEfMiPSHj19Ix20bGn7a0F8lF/U25nv3NutmnmHtObnzDms8be1qt4T80mPhh+n+9InEaha4zJO33saJFeTZfd2caZNHHOljzi0vURYtrHms+ZGIoZIdftew2NtWUzNdL5OiyO8uaXZsaRzx0fnk5fTfaCf9hxdNSc13lXXdJaURg/TFBNJg1LkXn1FHTYUVTGEd1J56SgV1U4cBAQAh+QQBAwD/ACwAAAAAKAAeAAAI/gD/+evX71/BfwgTEkzIsKA/hgYbQpzo7yHDhxYPIrQ4saDGhBwvKoSoMeTGkRBNnqQocmXGiDAnChTYbyDChSQ9ytwp8yPNlRJ77lSJEqhMkw89vtx4sObMozmPHqwY8SPSpAJVasRJEmvDkBZt+qQ61qDPiera/HrKc2RGq1GBJYigq2pEolu9Dv0H78GWfD9BKsRotuVFmwkzacAHVrBBpGapPk6JEAsWiXCzZuW4NahFO1duJuTn1PNkt6Jf9rtFIx7HffmaOn4atmjMf/r6CHpX8166e0FJQi0pOB6jRKuQOUtHk/BGm5y7AnXaz5w2cfRmC8foXOTUw5qLTRLdy5L2adHouUId7Pxt252lhSIuzPZ81drwZ86vKNu7edrjOaaTgGfBxF99wRE1XnzBpXZWgZLdNlSEZ4WVVEjqFcgSTlM5J9t8CAUEADs="
    },
    "introText": "Welcome to finAPI Web Form. Please follow the on-page instructions."
  },
  "functionality": {
    "bankBanner": "RENDER",
    "progressBar": "RENDER",
    "bankSearch": {
      "defaultCountry": "DE"
    },
    "bankLoginHint": "EXPANDED",
    "termsAndConditionsText": "BASIC",
    "storeSecrets": "RENDER",
    "storeSecretsSap": "IMPLICIT_APPROVAL",
    "bankDetails": "LOCKED",
    "header": "RENDER",
    "language": {
      "selector": "RENDER",
      "locked": "DE"
    },
    "tuvLogo": "RENDER",
    "skipConfirmationView": true,
    "accountSelectionConfiguration": {
      "mode": "MULTIPLE",
      "preselected": true
    },
    "hidePaymentSummary": true,
    "hidePaymentOverview": true
  },
  "aspect": {
    "colorScheme": {
      "brand": "#00ADDF",
      "secondary": "#00ADDF",
      "text": {
        "primary": "#232323",
        "secondary": "#848484"
      }
    },
    "text": {
      "fontFamily": "Calibri,Roboto,\"Segoe UI\",\"Helvetica Neue\""
    },
    "theme": "DEFAULT"
  }
}
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
The updated profile

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"label": "Mobile application label",
"createdAt": "1970-01-01T00:00:00.000Z",
"default": true,
"brand": {
"logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"icon": {
"info": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE4cHgiIGhlaWdodD0iMThweCIgdmlld0JveD0iMCAwIDE4IDE4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDxnIGlkPSJpY29uSW5mbyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxnIGlkPSJEZXNrdG9wL1tQSVNdLVNpZGViYXItVmlldyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzMTcuMDAwMDAwLCAtNjIwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8ZyBpZD0iaWNfaW5mb18iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzMTcuMDAwMDAwLCA2MjAuMDAwMDAwKSI+DQogICAgICAgICAgICAgICAgPHBhdGggZD0iTTksMC4zNDYxNTM4NDYgQzQuMjE4NzUsMC4zNDYxNTM4NDYgMC4zNDYxNTM4NDYsNC4yMTg3NSAwLjM0NjE1Mzg0Niw5IEMwLjM0NjE1Mzg0NiwxMy43ODEyNSA0LjIxODc1LDE3LjY1Mzg0NjIgOSwxNy42NTM4NDYyIEMxMy43ODEyNSwxNy42NTM4NDYyIDE3LjY1Mzg0NjIsMTMuNzgxMjUgMTcuNjUzODQ2Miw5IEMxNy42NTM4NDYyLDQuMjE4NzUgMTMuNzgxMjUsMC4zNDYxNTM4NDYgOSwwLjM0NjE1Mzg0NiBaIE05Ljg2NTM4NDYyLDEzLjMyNjkyMzEgTDguMTM0NjE1MzgsMTMuMzI2OTIzMSBMOC4xMzQ2MTUzOCw4LjEzNDYxNTM4IEw5Ljg2NTM4NDYyLDguMTM0NjE1MzggTDkuODY1Mzg0NjIsMTMuMzI2OTIzMSBaIE05Ljg2NTM4NDYyLDYuNDAzODQ2MTUgTDguMTM0NjE1MzgsNi40MDM4NDYxNSBMOC4xMzQ2MTUzOCw0LjY3MzA3NjkyIEw5Ljg2NTM4NDYyLDQuNjczMDc2OTIgTDkuODY1Mzg0NjIsNi40MDM4NDYxNSBaIiBpZD0iU2hhcGUiPjwvcGF0aD4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg0K",
"loading": "data:image/gif;base64,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"
},
"introText": "Welcome to finAPI Web Form. Please follow the on-page instructions."
},
"functionality": {
"bankBanner": "RENDER",
"progressBar": "RENDER",
"bankSearch": {
"defaultCountry": "DE"
},
"bankLoginHint": "EXPANDED",
"termsAndConditionsText": "BASIC",
"storeSecrets": "RENDER",
"storeSecretsSap": "IMPLICIT_APPROVAL",
"bankDetails": "LOCKED",
"header": "RENDER",
"language": {
"selector": "RENDER",
"locked": "DE"
},
"tuvLogo": "RENDER",
"skipConfirmationView": true,
"accountSelectionConfiguration": {
"mode": "MULTIPLE",
"preselected": true
},
"hidePaymentSummary": true,
"hidePaymentOverview": true
},
"aspect": {
"colorScheme": {
"brand": "#00ADDF",
"secondary": "#00ADDF",
"text": {
"primary": "#232323",
"secondary": "#848484"
}
},
"text": {
"fontFamily": "Calibri,Roboto,"Segoe UI","Helvetica Neue""
},
"theme": "DEFAULT"
}
}
Get a profile
get /api/profiles/{id}
Get a single profile by its id.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the profile

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A profile

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"label": "Mobile application label",
"createdAt": "1970-01-01T00:00:00.000Z",
"default": true,
"brand": {
"logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"icon": {
"info": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE4cHgiIGhlaWdodD0iMThweCIgdmlld0JveD0iMCAwIDE4IDE4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDxnIGlkPSJpY29uSW5mbyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxnIGlkPSJEZXNrdG9wL1tQSVNdLVNpZGViYXItVmlldyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzMTcuMDAwMDAwLCAtNjIwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8ZyBpZD0iaWNfaW5mb18iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzMTcuMDAwMDAwLCA2MjAuMDAwMDAwKSI+DQogICAgICAgICAgICAgICAgPHBhdGggZD0iTTksMC4zNDYxNTM4NDYgQzQuMjE4NzUsMC4zNDYxNTM4NDYgMC4zNDYxNTM4NDYsNC4yMTg3NSAwLjM0NjE1Mzg0Niw5IEMwLjM0NjE1Mzg0NiwxMy43ODEyNSA0LjIxODc1LDE3LjY1Mzg0NjIgOSwxNy42NTM4NDYyIEMxMy43ODEyNSwxNy42NTM4NDYyIDE3LjY1Mzg0NjIsMTMuNzgxMjUgMTcuNjUzODQ2Miw5IEMxNy42NTM4NDYyLDQuMjE4NzUgMTMuNzgxMjUsMC4zNDYxNTM4NDYgOSwwLjM0NjE1Mzg0NiBaIE05Ljg2NTM4NDYyLDEzLjMyNjkyMzEgTDguMTM0NjE1MzgsMTMuMzI2OTIzMSBMOC4xMzQ2MTUzOCw4LjEzNDYxNTM4IEw5Ljg2NTM4NDYyLDguMTM0NjE1MzggTDkuODY1Mzg0NjIsMTMuMzI2OTIzMSBaIE05Ljg2NTM4NDYyLDYuNDAzODQ2MTUgTDguMTM0NjE1MzgsNi40MDM4NDYxNSBMOC4xMzQ2MTUzOCw0LjY3MzA3NjkyIEw5Ljg2NTM4NDYyLDQuNjczMDc2OTIgTDkuODY1Mzg0NjIsNi40MDM4NDYxNSBaIiBpZD0iU2hhcGUiPjwvcGF0aD4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg0K",
"loading": "data:image/gif;base64,R0lGODlhKAAeAPcAAAAAABY3QzqRsTqSsjuTtD2Vtj+VtUCVtEGWtUSYtkKYt0KZuUKavEWbu0eauEucuUueu0+fu0yevUiev0ifwUyhwUyiw02iw1GjwlOiwVGiwFSiv1WhvVeivVqivlikwFmlwl6mwWGnwWSowmKpw1ypx1eox1OnyE6lyFCmyVOoylapylury1+sylytzVutz1yu0V6w02Cw0WKx1GSy1WWy02ewzWevy2qvyWmtxmmsxGutxW2uxW+ux26vyG2xy3CxynGwyHOwyHWxyHezyXq0yn23zXm3z3W1znK1z2u002q21mq22Wy32W632G+523G523K63XS73Xe823m82Hq+3n6+2YK/2IS+1YS904G60H+5z4G6zoS70IW7z4a80Im80Iq+0Yu+0oi+04rA1IvB14zC147C14/A05DB05LD1pTE1ZjF1pnH15vH2J/J2Z/J2pzJ3JbJ3pLI3pHH3I3F24vE3IfD34XD3YLC33/B4X/B4oHC4oPD4YXE4obE44jG5IvH5Y3I45DI5I/J5pHK5pPL55XL55bM5pfM6JnN6JvN5JzP6p7Q557Q6qDR6qHR6qPS66TS7KTT6qbT56nT5aTR5qPP4aTO3qbO3qnP3avQ3q/S37LU4bTV4rbW4rnY47zZ5LrZ5bjZ5rXZ57LZ6qvW66jU7arV7azX7q7X7rDY7rHZ7rLZ7rTa77ba8Lfb7bjc8Lrd8Lve8b3f8r7f777e7bze7Lzc6r/d6L/b5sLd58Le6sXf6cfg6cng6svi6s/j7Mzk7cni7MTi78Lh7cHh8MHg8sLg8sTi88bi88fj8sjj88rk9Mzm9M7m9M7n9NDn9dHm79Pm7dXn7tfo79Xp8tPp9NLp9tTq9tbr9tjr9Njs9trs99vr8dzt9Nzt997u+N/v+ODu8+Lv9OHw9+Hw+eTx+Obx9eby+ejy+Ojz+un0+uv0+ez0+Oz1+u71+e72++/2+/H2+vH4/PL4+/T5+/X6/Pf6/Pj7/Pr8/fv9/v3+/v7+/v///+HA+yH/C05FVFNDQVBFMi4wAwEAAAAh+QQFAwD/ACwAAAAAKAAeAAAI9gD9CRxI0F+/gv0OHkS4sKDAhg8dSkwoEWHFiRAvRlQYsWLGjiAtahxJ0mBIjwMTqjxZ0iRHhiZHfmQZc6PImBBnZmxIUabBng5npkRJMKfHhUh1Dr1ZMF8nL6GWtpQa1N+4DQh4gKJZ9KFQhvlA4Gj3cqXXiVVxCiRlwV3Xo1KVEpxDZefOmiy/LsIT9KtGv8Si0MPJjyrIj0YH6isU6Z5Bfvf2GSa6NGM8VKeaaQtHryfSyX9/Ctxnrpu5ejxD+sX7Nm7rxK1dFn35NvHXzyT9pvb5WS5Qyjanoq0svHhX2mlFG4fpO+Vq2LKH08R90Wx10KwDAgAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/CfzXbyDBf/4KDvTnD6FBgQwfGmw4UaFAixYj9rN48SJFiSAdHuQ4UCHFjCERkhQJUSJHjAZXdiRYUCbLmCs/MmzYsF/ClTZb8oRJ8WNNiR9H2kzacuLMmyedhox48KFJhFSt9tyYEulIlj5LZmSadeNGnV2PCvT0xQuwpi9fVgX7sCE5EAt88IDjkCvIokznLvSXr8UPd0131swK0m/RprhOwJMaEyLapnUVFlyEhyzZmzcLJuU4aRDShCVxWg06EJofeyJRYz4oOypEtUf3SWKFTyU/zYH/Yhw9kJ6sWdrSydtH9fHstA6p8mNn7l2+y0Z7pgweFqXguiW1TS90KhsrWNGYw4L+m/q7SL8X1accHlu+U5/B749337V90qLwfVVTUKyNd5JmNNWVX39zMRaTc+jZZJ94TA2X0YCVLXiWg/G1hN53TAUEACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8J/OdvIMF//QoiNMiw4cB+DiEeHKhw4kKLFwUqlOjQYEV/CRFyTCgxYcWLHCkahJjSYUGFJz12hPlS5MyH/iqOfBjyYM6FEk+2ZPixX8+FNVe6JFjy4cWYTn9GnGi0IVSMRmMaHUpRqsyOPoniLNgSpNKcXnk2DKkQHhwhQt7MY8jxZ9WkTTcatIYhQ5ctDtJATOt0Kth/9lxcwVcwn76MFllaFSqwJKwa95RmhNqSK8x/kRBVHl25s2aNVg2yinTYJdnUYLkpqidycFWgTKmiVvkSZEF+sWhlrr17beqyFvM9c2aOnj7TkKMft4mwHr18/Fp/pisd5eitafVMqszd/fDgqxhbe6bu8aTXnlzhj48unytSoujNX60acmvK3twVh1tTT0nl234rQSfWgiWJJyCBus1n0UcH3XVWaZCdx11QerkX4EABAQAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/CRxI8J+/gQcLDuynUGBCggwhFmQY8eFDhwUTRlz4rx9Fggn9afS3MSRCjA0R9ruYUiLKjgI3clQo8mPKgx5fWnwok6TGmAZnwpQocqjLk0NNmsSI0yjMlUAhMsQ5lWVUmSCtBqXZUiZWoF9jWuz48SJPoVuhbiWLz9MYMJ7yAS1KFunCkCU3hmtxAUkQBB3QOQV5s6XAfE6szGOoLoivizkN24Sq9p+xKPUans04WGpUVZOm6tQoGqZWhTlnuUK9FjLGqpHRdkulz+HYtWtXbrRJ+N++ZM/22SY58alVjweJC72nLVw9ffwWIi9tFy3TmPzu4eMXsftRimVxXCNMntwgXYm6Nb/m+nQ3R++7P35t+v58VOskqatV/lPs09biVXcfa0eJVxFKIiUYk1cHetQTUngNyJ+D1KEXoGEXmuYfca7lxxpWWDVV01LlqXRVUCxRZl1QGwUEACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8J/NdvoMGDCAX6S0iwYEGFCwdGlPhv4kODEwketFixn7+FGQ9e/MgwYb+HF0uKTBlSoUuWGlNWnBlz4EmPLQ3KFPhw4UmfHCeGjFjQ30+eRHkeNelQZFKXQhEahahzI8GWJxmCbFjTZMaQRWmK5Kk0ok+yGBvmBFvRqLRMmaY59DnXrNORIwe+o4KiBIYCQuqJRXiT8OCm+/pUIScwWAQeGkEa9YjW4lCN/6DtiWewGo99eLtSxmyTJE1ZqyZnxdzz7GGbUhcmOyaVa22Jra0OBEeLX0eKGJsq9NjT5EB9zsxlvTmV4tbaPfMKrGcuHujRIEenXI0Udlp//PBn7YtKM+xwklNR2uS+fuzM54Z3XqRsmuRP7JW3fu3++/VM6SNdBhx7NMGnFFruFbeTWAuShlVGRZn2kkQSFpfQVM0V1ZSEZKH3n3HzkWXee6uRJ91H7G0lnU6u6ZbiS0S9KNZT/P0TEAAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/9fv3zx9BgQcTChw4UKHDggYNHmyYsB/FihIrEhyYEeFBfxwfOuwo0iNDiAJJgvSosJ8/kgtZUpQ4s+THgggj2myJsyfBjB1hblS48iXLnz87XnSpMyHQmBdH4oy68yHJkzcLujSZtaTSoUh7vtyK1GVUpjGvdvX3jdQock2NCr05N6E9QTBWXFjQBd9SjEaJSjXIT1Gfbf325XpQROvEqT1PPs3KrVC8hL8GTAt6k+xPhg2jKpuVlCCRX2GzXpwc+uAzaA/RcpVKtaW5Zw1XOgx5NaPnzwT1gZNHNrDN2pOh5qOX7zfO5Km15o7dj5/F2pBlIjXo+aXvpK1XUWJ32tWnb6zGndbV7tEoRbPlo1fEPnb96ujTfT4WqfO9UO48gSXYfCnNFtNU54GUXnkzUdXUVlt9lZJ4LekmlVUWVYggfEe5N1FuM0m4U1QBAQAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/+ftHkGC/gf0KFvQ30F9ChQ8VSlw4kWHBfg8H/sNIUSDEiR4lPoyoUGPEkQcJNiwJsiFJlQZjClwJc2PGiwJfbtxp0GFOnCBF2jwZVGdNmyFhIjR482hSoD1VuuQ5MWFKiRohZsWIcWtCmlF/aswaVKhKnWRrjgR7lKHRoOZs5UpXdSTVu2YV3nvEZMYJCmTykR2806jdiPxSGeLWb18uCUY4LvTpdmPDtDIFmosUT+EwAnkXWvW4EvM/bMtiDuTgpmxXvKq/GuzWbSKYTRHHUs099KPAd+GymvZZkerwhPve4dNtGeldk2GLE9ynj59s3y2dzywM1O1B6ExrWDpkC5PjS+jMyYO8jn1t+fVFWVqemtHq+NDwLZZdul54UNNYlXURgBURt91TzWl1X04k8RfSV1M5dRJhmQ0ooG4pQZfhXVdBdWBVpKXUIVPC+fcTiPEBFRAAIfkEBQMA/wAsAAAAACgAHgAACP4A+/37J3CgQX8GEw7shzBhQ4UFFxosGPHgQ4EI+2mEOBDhxYoFG2ZUeLDkP38PJ1YkaZJlS4EwNWJsGFMkRI8lbXZkyZCgv54of7YkiJHgwpUMU5IUmRKmy5AOWf5UanQn0qVOgypE6TIl1ZVGV448Sdbl1qIkkV6syjIdsWLqltocu9YoV4X5WO2BIgOFGXw8o1ItO3UiLUnh/u3jhWGL1qg7lYqduO4VvbDCChDtiDEizrMnNxIMh42zwA5tEk4mO5lix3Tp2P4bkeYpZLt3dw60B48kj1Cqm1qUyBZqv3z7lnbUWbVnYLuhNQ4ePDF3zpc9Q25EuZrj8rLKiU8TBRte/G3wI39KV7lwbeecMKc6D+xat/mJurvLJi81bf/2/nn23EGr0XSSdbkJaFJr4KnW4HpoOQgZVF4peN5/bDHXnlBPoeVUg/BxlVFAACH5BAUDAP8ALAAAAAAoAB4AAAj+AP39+yew38CBBg0ePOhPYT+FBxMSRDhxoMCJDx8utGjQn8eI//oVDElx5MOLG1FqDLly48KODRFqhOiSJkaWEy96jEmy4UeXFkFSpGjToUqeQUUO/VnxZseIECVGJZmT6NCaNkOijChw5NabC7uGBSr0ZdamDCu2REqWqMKvVE2iTfoyJDtnzNptdJjS5ci6CfXRMtTnCYw5+mpulQr05NBmrswZLLYCS9G2Y8n6i7fsHsNhDKoxbXjWLMGTOtmZyynwA5ySmC9K/Si73jybI9bA7ViaKtB9+TbKQ/ApLs6mEHWmJdmPH81qIuxRbZn86vKtYq9KHNrbt+agFlFZkt7bt7H3zARVXvZL9in79NhjykYOV2z26cvBe5cLPqPKsjVhZtVxsQHV1XbvwVYXet5Vh1ZGSlml3koxJScffm25t+BpBJomVFQfOZRVQbvR9RRTAM7lT0AAIfkEBQMA/wAsAAAAACgAHgAACP4A+/0b2M9fwYH+/iUcyLCfQIYEHyZcCLHiP4EF/WnE+NCiQYUdJwpcqFFhwo4VR5IsafEiQo8lKUYc2XKiTIUEGX48GbHlRYoLD8o8CBKhwZs4EaJsWHRiRZZJiepcivMkRZRIcTrMKTOoR5c+U37FqBNsS6omIfJcGjIsQZ5VydJM+1bhu2zQ4l2U+BIiW6Nqq+ZTJimRniaW9j3k+/WqS6gJ+WFbFs/fvmIv5Nz8aNat34H0uukjiosCupQag1ItmdFvPXp++VXw9JJs0oY0nbocqU8f1H8bMtXMynVxSn4VyRHwhRpuX59Yt+7d0WFfUpatA1M1/rzfF29qMWOSfB7+LPTPRcF23P5StUWyK/1+NC69a07c7x0yfi6Sqef4jLX1VHo6/RaUVWAd5R9q1/1230wPkrfeWGYNJV9g6EmkW25PpTbVZmXd5phUTNnnIGCMAQUTSvs1BBRx6xEHVkAAIfkEBQMA/wAsAAAAACgAHgAACP4A/f0b6K+fwIH9BipU6E9gwob/IC5ceHCiwIMPI2KsSJAgx4gTLS5M2PEfSYUnTZZEGbJlw4ItVbYkKREkwYcVU8JkmVPlR4Q2J/YbuhKhwaIjSRI1yPEgRpk+bT4NypNhTKpAs7KcmRKk05JdR6oM+zDhybA1RQr1Knbs0X/82HHjZk+jVp46x16998zVKUJ7YEksqNTk27xX94Xjdu+fvls0SoU8+VOs2ZL42r39V2kFPrUI02bduVCfPpn+3lEQRhEr0YZhIx7tx68rPga9rmK1O9ks0YW+CqADGTs21NlOYfpT12FIZYOXKZIu2dPkAw/wqG++StNlUGqfm1eGvFiR9G+j3c92/B39InGnKQuTTouz8tqg9u++Hj1ZrEP2W1G3UlNo6YaadFbJlNFsAYp0XkyFjbfeUBtB1ZZaxnVFmVbdZRWdgSBWl2BbleWUEVJqBQQAIfkEBQMA/wAsAAAAACgAHgAACP4A/wkc+K+fQH8EDSrs5w+hwYQPExacKDAiQ4n//PV7aLFgRIoDOVYciDBhyYcODxIk2HAkyJcrKWqMSZNmSpIKVZIMyfAiyJIlQ7K8GdFhx4ooUQp1ydJnRow6P+o8WXOl0qAsrQJdCrXqVoRYCwLF2lJqTqtcbapsOTGeOHP5VlI1uNUl2JgP83VLFutRImY0N860KjJsRX7v1ukTaCwKMaRigx7dqTLiPnxYKS3ZV/WpVLl4+a0sl+IbTKFsM35UCLRnxHYUqk3+XNMn2NQFRzWYh3PmRcOVnwpX+m9chC9QT1LdKZKpwzAIRtSTODcw8MBeNi3Ge9drTrYMw1MGbYjyq9CzqlGLJQyaONSeTDsPDh9y8ET38DOyHSy5ttnrp+mEkX2ejbeWcFkdZJ9T+h20UVe/UUZggCNdR+CFBqqXlHwv0UYSgGh5GFWHHT0UEAAh+QQFAwD/ACwAAAAAKAAeAAAI/gD79ftH0N8/gwQTJkSIMOHAhQofRixIsF9DihgPQvTn76HFigMZCryo0KHGgR//eVQpUCBEjRVLdlTYkGTGkiVTVjRoUybPnThVOqw5ceZIjgslIvx4kahElSSfBrUptSfLh0tf4sR682LImDCFTlzp0ipNmRafMtXo1ajagv3qrVu37+1BnVJRBoW5j502Zq1OZZP4ledSi0j3Js1Xbx9BZYCgcQUbtufShv3qKjRVhV9OnFm/xlQqtGG5GOXCig3rkvVPlIaFqkuxzaBomIRl3lUN1t8oC/bOZjWZ0ytFj+MylBnqU6pYhkkdauKiIEfwyWerfg6qb8SOTau1W4YXWjgq2Ly2WzsMyXQm7o63Fw6HujVjR+iKld4urHfv/f5YaadeQSSZV994ZxEHUW4Thaeee+Zh1dRzvImHkXaK8YaZc6XtNNN8oFGYYX7H/aTge7sRuNFAAQEAIfkEBQMA/wAsAAAAACgAHgAACP4A/wnsN/AfwX4H//kzKLChwocCFzJ8uLCiRIIFMTokKNGhQ4kLOYbE6M8fQo8NK3rsmFKhRZQfWXpM2PDkxokHNUI8KbMgzI81dbaEWTLmTKAQJ5rESBKpUoY9GTJ9KPSoy5UGEdIcenNiSqY9TRasyPGq1Ig/sUYVqtUkSI0X/eWLF29fx34dWYaMSDYtQnzquCWTFW5vUb1oP+qc+o+fPn7/9kVjxE0lRZtd2bI8qTEWIchOfeJNWnbzRYHnopwb2BRlUaw6ZS5sF+Nb2sSkfyakiWuFPa9QEWtNTNJmR3Im6gxdLDaqT4/60rjp0gDH76hxaxI9KzAfEQ87Nlvt/Cl2pUaaIA9j5bueKm60Jc+HbX2bftWspPdqh39XrcLzafV0320goTVgSqd9ZeBQp8W3XGz/YbafVVuRd+B+FxYlVHl4lTWQTLslddtGEHL1nFej4XRiTQEBACH5BAUDAP8ALAAAAAAoAB4AAAj+AP35+zeQ4L+DAg3+6zew4MGHEBFGnKgwocOHDvst1EgRIUeCGRNG1Phx4UWGHUceLNnvo0N/KDGulFmwIcyJCT+2XLiR58OdKzXmVNizo1CVDGNSfHnzJsuVF2/OpIkzJUGUJCPaJOpTa0upJGsC7XoUI0mXV61ObAkUplKEFj1K9dlvH756+yBeVJsVaEmB/O6t09bsnMSfU9MG5SpzIb+W/MCpEld05l6DSa3G1Zgs0tSShy9fPgyRnZ91PJ2qHVkTMcR3TygTBb1Ur1a4B23RuMdx7NjGt4UOrGuSnAs5WU2iLcjxZNR++hIAadNlQhJ8Kl1nHX2Y464iIYRdeMpb1nXiuRKHK0zOt6vPvW8ZJ6bNs7x85mvfkxZ5Pv7UhsD99xtZVal12U7sQWTfST+phx5IP7EFoIKKQZWeeQ/SlViAKWVEGmbN4dQcfavNlOBtTaWG0YTwCRQQACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8JHCjQH8GBBgf2I7hw4T+HCh9CPEhR4MSDFw/6a/gQIcR+DhMSFFmwY8d+JEv+I+lvI8aVChcadFlRosGLF1uubDlzpEidCDUytKgyYk+RIEtyDAozocyCOZmalFqxYdKSTkNSBJkS4UyuML0yBUq0qVOPFh1OvMrzJ8mMHXti3bgP38uhJ3/uDEtTIT9867qliwm1bNi9NQtu5MnumLinWqeOXAnxrUqD2FTx44s38dWaKAXGS8Ru50fChjtb3MgxXh9zFLtu7dzXZC0p+fiGhpnzbFyCaD7B3FbDktyviSX7XulmAAkySCxc0acW5dK9smMPnCYGSBZeOFdXx+0qm+VhySaPn58sUXth3hNro8d4U2x21UGTso2d0e3v5BEBOJVOyPF2nlWpuZSQb2rtRGBslsn21H+67XbTbnDhBReGZF2HWHYZYhWZZwoxuFVlAgUEACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8JHNiP4MCDA/0dVKjwX0OE/h4K7FcQ4b+C/gpWZBjRIsF+DB16dChRIcWRIhMerDjRY8aTIFkKzHgxZcuEDSWCFCnTYk+EP1FSNGnQ4UmLEVlKXCmTKEaPGmu+hHkx6kKSHZEuXbj15kyaQI9OrEhxJ0qVJIeK7Tqy4dqxYgnu23e1ZkyjYJuOXZqRH7516/hdzIr3YVykiC/iiyYuK9iQLCMXlaqx7D9zs+iOrWvXYFKUbu9JYneVsOmVJFdyNErv0Dqgk6nanO0PWJqQ/2oB0ifVqNG7cGcKbxmMgJp8F4k1gdUZLcThEFmCUgABSAsVjfjRNG32rE+T7jZjqbn0jaFl6DU5Q/W6njDssyDZJtzoG6fP9C23P70ZFONTsqnVF9ZHsO3H02xXWcWeTurBtlp8+Lk0XFc9aZRTenpNNJWCnznXnWT7XaiSgcIRhV9kZIGVWIAn3rTUf/JVJVBAACH5BAUDAP8ALAAAAAAoAB4AAAj+AP/96yfwn7+CBwsqXMiw4UGCCxMWhPjwoMSJBCFCNDhxYb+LAyM27DhS4keFGy1yvOjvZMKUGzumFEgQZEiGMQXanMiyJcec/kzS1InyJUKbFmPOTGowqMSgJENuzCg16s2cVhFqrAk1I9SVWR8OZfhVKNWbZJFe9PqR30iwcIXqNKp13716NWlS7BgU61uF/vaZW8cX5cmBT32KTWjRab93zfQdRStSZz+NKA37y/cqHsKxmUHTrYnmF2B6kt5V5oj4JearAoXocEvTGKN9ZKcu/hr6YDUDX+r941erCjO4Hin/9dmvl4QJNmDQcJWX7F/Qnw3aE3WJFLuQTkFdqsz82nrVj35lMi+ZfvV4vUsNUmVM1ONJpfRr5nQZ1Wl9wPKRRFdYAA41X1gzlVfYdXqhNWCA2WEE2Ef+GXXYZxde+N5ZEv6V132sUUgUSOlRtNdPADLnk4OLCRQQACH5BAUDAP8ALAAAAAAoAB4AAAj+AP/98yfwX7+CCA0mTHhQ4UKB/vo1bEhQYL+KEC1apEiwIkGJCDFm1Dhw4UeHJkGShNhwJMuNLUuGnJkwosiDFQ+qfHiRpE6HLUV6tCiyoM6IMjX+HBgTJc2MTZMWRJrxZMepJDFi7Ck15FaiEG9eDcqTIVOF/r7OHFs0qtGwVZkuBftw5VmEFycy3afP4NGPc3G+rfuQn7x6WIGmbdmUatGa9cDtI0xTIk6bVP/xC+INrj5miCmP5KpxKL8DnfTWi0WvLFaONRMKyRGU2Sp+ObGmbRt1azUFY+b922eMULaVeq9SDnrRF4YLSpZIQXazq97YhO/xqmQrntu3vWVdFv161eZCtzav+0Uas+lOk2kHs2SP169DpFvZC+6pFS9pp/SFBNJ4b/XHEEUlEZiVQoIlmFh938XnU0n/NQbXRJmtVZdQ9ZlUYG5AWVjfSYSp5SFIA/7HlHldSRUQACH5BAUDAP8ALAAAAAAoAB4AAAj+AP8JHOhvoMF/BfsJVGjQn8KCB/8xRCjQ4UGIESH6wxgRYUGIEzMaZDjxY8eKCSkqfHiyIkqOIWNKFDmwH8ePGhlaBJnTJMWOIVVyRKgzo82NBGsSbTnz50GZQ5u2RHoyKtCkKoPabPhUosaGKZ0WVXqRrNWaQZs63Lqwab+0ILtu/Ur0qE+PRO9WnJg2pj59U13ilTpUYRFfB/O94zdSZVuwY1PuIxBq5L5u+d4yLTnS4kEEnnb+u9fs3syVTpPeJCxRiI+D2I65xAgXpdSL1RqYqSewWaRwgpeGbQu1ZsFhJlZMqRIIGtOZwyP2/YevWKlk9DaSfGxyJd/t0mFXGm/4lu3s4Eijen4YHTXxoSY9U0yfvixOrO7BliWfciVVpWkx9Z9Mz/mE2nZxBVjbWjwtpNdtQol1knuaAWWRZtGpBd9HQdGVWlcOGhcSfcFxZZVW/wQEACH5BAUDAP8ALAAAAAAoAB4AAAj+APv9G0iw4D+BBvv5G9gPIUOHDf8tLCjQX0OBDg8aZEgx40aJBDNCVDhw4seTIEuCjLjR40aTKUuSfChyoUuMMW02hGkzoUaCEz2OlNiTpcqfGSfCfIkyptODCJeGDNoyosufIbESTdoUpFSuXQ9KLWiRolaiZnn+9Mf26NmZZReWPRsUosG5TN0K1BWGLD+XeDlORblQhBbB+/JdlMmY502E/fgZAOX33b62hC9CTrm5nwNPnPeBUyx3ps+QDk1WPPKDH8dw0QQDDTt2oLcLdQbyy+bqnNGEah2THShMBg0/gRxlw9qTbtXAKZnJckZPJVzZcr8urciSpNysCjFNq0atEXJgpS1Vzv0uMmx7oQ8/1v54dXje2Wbj3yULmLBXtxKF5xRVd5VlWm3NRXUSTrOht5lG32HG2Xf7MQgTg1UxB1RqYZ2VIX7/BQQAIfkEBQMA/wAsAAAAACgAHgAACP4A/f37168fwYID/wlM6K9fQ4P+BBpUuJBiwosLIzYcOPEixoQOK3a8iFAhR5MDK5LkaLClypUdVU502HFkwZEeUaaMeDJjToEvCVo8mVIoRJ0fGVbkybDoyow4b+bEmXPqT6AgR25UiBNoS5ApJwbtWbWs2aovRTr1OBPlUYlFv7ol6FMoyLpik4ZVyAnYR55HtVIl+hHYAFA1o9pEOjarkCB7+/HT2JQuWq5CmSqMsMmjP3z8CL8MyXTpxob+QGCKye/dPowIBWdeWPOhGRuvTbILF1pi26pUqaJbUUdeQXPJ0jHNi7ms3JzbokQ59EhVN4dEMy4ti7plR33QklNl82x37WWTJbGb1YqUPF2sDNWzhZ32p96zf7nXB56VuVP45Q02U0nmmbXVfAgSNViCC2InU03uPWQUeY0xpxZ/Cbo3FYB2vZVYgY01RWB5mpkVEAAh+QQFAwD/ACwAAAAAKAAeAAAI/gD/9fvnzx/Bgv8SKlRoEKHAgwMXSiQ4sV8/hAYvRpQY0eBCjxJBMnz4UGTCjBgJDtw4MmTCiycpshzokOTEmwtX4txpsifFnQ912rxp8qfFnwxrlsS5UWjGiiFZFv14cKpNfzCXvmw6E6hAjyxzih0aMyzYmCNFqrP38irVnFPNJtR1AI5XpGjlzuxHDkGYfSUzdjz7tC3HjQXXfNhnsWFThWG5fs06EsiZifw6RjxqkbJXmEfMiPSHj19Ix20bGn7a0F8lF/U25nv3NutmnmHtObnzDms8be1qt4T80mPhh+n+9InEaha4zJO33saJFeTZfd2caZNHHOljzi0vURYtrHms+ZGIoZIdftew2NtWUzNdL5OiyO8uaXZsaRzx0fnk5fTfaCf9hxdNSc13lXXdJaURg/TFBNJg1LkXn1FHTYUVTGEd1J56SgV1U4cBAQAh+QQBAwD/ACwAAAAAKAAeAAAI/gD/+evX71/BfwgTEkzIsKA/hgYbQpzo7yHDhxYPIrQ4saDGhBwvKoSoMeTGkRBNnqQocmXGiDAnChTYbyDChSQ9ytwp8yPNlRJ77lSJEqhMkw89vtx4sObMozmPHqwY8SPSpAJVasRJEmvDkBZt+qQ61qDPiera/HrKc2RGq1GBJYigq2pEolu9Dv0H78GWfD9BKsRotuVFmwkzacAHVrBBpGapPk6JEAsWiXCzZuW4NahFO1duJuTn1PNkt6Jf9rtFIx7HffmaOn4atmjMf/r6CHpX8166e0FJQi0pOB6jRKuQOUtHk/BGm5y7AnXaz5w2cfRmC8foXOTUw5qLTRLdy5L2adHouUId7Pxt252lhSIuzPZ81drwZ86vKNu7edrjOaaTgGfBxF99wRE1XnzBpXZWgZLdNlSEZ4WVVEjqFcgSTlM5J9t8CAUEADs="
},
"introText": "Welcome to finAPI Web Form. Please follow the on-page instructions."
},
"functionality": {
"bankBanner": "RENDER",
"progressBar": "RENDER",
"bankSearch": {
"defaultCountry": "DE"
},
"bankLoginHint": "EXPANDED",
"termsAndConditionsText": "BASIC",
"storeSecrets": "RENDER",
"storeSecretsSap": "IMPLICIT_APPROVAL",
"bankDetails": "LOCKED",
"header": "RENDER",
"language": {
"selector": "RENDER",
"locked": "DE"
},
"tuvLogo": "RENDER",
"skipConfirmationView": true,
"accountSelectionConfiguration": {
"mode": "MULTIPLE",
"preselected": true
},
"hidePaymentSummary": true,
"hidePaymentOverview": true
},
"aspect": {
"colorScheme": {
"brand": "#00ADDF",
"secondary": "#00ADDF",
"text": {
"primary": "#232323",
"secondary": "#848484"
}
},
"text": {
"fontFamily": "Calibri,Roboto,"Segoe UI","Helvetica Neue""
},
"theme": "DEFAULT"
}
}
Get profiles
get /api/profiles
Get all profiles.

Must pass the mandator admin client's access_token.

OAuth (BearerAccessToken)

REQUEST
QUERY-STRING PARAMETERS
order
string
createdAt,desc
Determines the order of the results. You can order by createdAt field ascending or descending. The general format is property[,asc|desc], with asc being the default value. The default order is createdAt,asc.

Examples: createdAt,desc
page
int32
1
Default: 1
Page to load

Examples: 1
perPage
int32
20
Default: 20
The number of items on the page

Examples: 20
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A page of profiles ordered by creation date

RESPONSE BODY
SCHEMA
application/json
Copy
{
"items": [
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"label": "Mobile application label",
"createdAt": "1970-01-01T00:00:00.000Z",
"default": true,
"brand": {
"logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"favicon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAH4SURBVDhPjZNNSxtRFIazcFHBZuMmUFCqILh358Jl6bJ/QJNAm05UlGKwdNHqSgpdtQs33WltKXSh6E9wpfhBoe6sM5M4McFMEp3YmsS351yPDHXujD4wMOfMvQ/v/ZgY7kH9so1Gsy1VNHcK3T8t9K1YGPhm4+zySrrhRAorJOv9YmFh18X8dgX9JK7/jU4aKuRkPSzbqUoHeLdVwWOSntEWhKEV8oRHyybJXOn4vCUpp75o6ZcfELq0JJ7wfs9Pdps5Wn7fio1zTdKAcGTtGMOrBanCGfqRx5ONolQ+AeGx11QJP/2sSQcwTROO40gFfNivqoTli5Z0fLR7WPRaSCyZWDxs49QpIBaLqade+I2PBw21v6d0aDq0QqZMz+T6LyWaez2DWSONrmfTGN6kQ4u4jqFCJ28r2dPnr/CdDvuzDQyuuuiId1PqvIwKohValqVkb2ZzOKe6l+5e/1cbTXqfMjLqW6lUUmNvExCaR0dqQi6Xk871np40/D0bn5hQY4rFe5zyw3gcDzo7pQqHhYlEQiqfgLBMS+HB2WxWOkFS6bQaU6v5V+sG7R5WXFdNeJHJSMdndGxMffM8Tzr/oxUyJ5L0pWFIB0gmk9fJquG/ZaiQ4U1ngUHLT6ZS6t2l9FFEChm+HizipxqR7IY7hQyn0h1AEOAfAearr/m9PjoAAAAASUVORK5CYII=",
"icon": {
"info": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjxzdmcgd2lkdGg9IjE4cHgiIGhlaWdodD0iMThweCIgdmlld0JveD0iMCAwIDE4IDE4IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPg0KICAgIDxnIGlkPSJpY29uSW5mbyIgc3Ryb2tlPSJub25lIiBzdHJva2Utd2lkdGg9IjEiIGZpbGwtcnVsZT0iZXZlbm9kZCI+DQogICAgICAgIDxnIGlkPSJEZXNrdG9wL1tQSVNdLVNpZGViYXItVmlldyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEzMTcuMDAwMDAwLCAtNjIwLjAwMDAwMCkiIGZpbGwtcnVsZT0ibm9uemVybyI+DQogICAgICAgICAgICA8ZyBpZD0iaWNfaW5mb18iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzMTcuMDAwMDAwLCA2MjAuMDAwMDAwKSI+DQogICAgICAgICAgICAgICAgPHBhdGggZD0iTTksMC4zNDYxNTM4NDYgQzQuMjE4NzUsMC4zNDYxNTM4NDYgMC4zNDYxNTM4NDYsNC4yMTg3NSAwLjM0NjE1Mzg0Niw5IEMwLjM0NjE1Mzg0NiwxMy43ODEyNSA0LjIxODc1LDE3LjY1Mzg0NjIgOSwxNy42NTM4NDYyIEMxMy43ODEyNSwxNy42NTM4NDYyIDE3LjY1Mzg0NjIsMTMuNzgxMjUgMTcuNjUzODQ2Miw5IEMxNy42NTM4NDYyLDQuMjE4NzUgMTMuNzgxMjUsMC4zNDYxNTM4NDYgOSwwLjM0NjE1Mzg0NiBaIE05Ljg2NTM4NDYyLDEzLjMyNjkyMzEgTDguMTM0NjE1MzgsMTMuMzI2OTIzMSBMOC4xMzQ2MTUzOCw4LjEzNDYxNTM4IEw5Ljg2NTM4NDYyLDguMTM0NjE1MzggTDkuODY1Mzg0NjIsMTMuMzI2OTIzMSBaIE05Ljg2NTM4NDYyLDYuNDAzODQ2MTUgTDguMTM0NjE1MzgsNi40MDM4NDYxNSBMOC4xMzQ2MTUzOCw0LjY3MzA3NjkyIEw5Ljg2NTM4NDYyLDQuNjczMDc2OTIgTDkuODY1Mzg0NjIsNi40MDM4NDYxNSBaIiBpZD0iU2hhcGUiPjwvcGF0aD4NCiAgICAgICAgICAgIDwvZz4NCiAgICAgICAgPC9nPg0KICAgIDwvZz4NCjwvc3ZnPg0K",
"loading": "data:image/gif;base64,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"
},
"introText": "Welcome to finAPI Web Form. Please follow the on-page instructions."
},
"functionality": {
"bankBanner": "RENDER",
"progressBar": "RENDER",
"bankSearch": {
"defaultCountry": "DE"
},
"bankLoginHint": "EXPANDED",
"termsAndConditionsText": "BASIC",
"storeSecrets": "RENDER",
"storeSecretsSap": "IMPLICIT_APPROVAL",
"bankDetails": "LOCKED",
"header": "RENDER",
"language": {
"selector": "RENDER",
"locked": "DE"
},
"tuvLogo": "RENDER",
"skipConfirmationView": true,
"accountSelectionConfiguration": {
"mode": "MULTIPLE",
"preselected": true
},
"hidePaymentSummary": true,
"hidePaymentOverview": true
},
"aspect": {
"colorScheme": {
"brand": "#00ADDF",
"secondary": "#00ADDF",
"text": {
"primary": "#232323",
"secondary": "#848484"
}
},
"text": {
"fontFamily": "Calibri,Roboto,"Segoe UI","Helvetica Neue""
},
"theme": "DEFAULT"
}
}
],
"paging": {
"page": 0,
"perPage": 500,
"pageCount": 0,
"totalCount": 0
}
}
Tasks
Get a task
get /api/tasks/{id}
Get a task of the authorized user.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
PATH PARAMETERS
* id
string
Identifier of the task

API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A task

RESPONSE BODY
SCHEMA
application/json
Copy
{
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"createdAt": "1970-01-01T00:00:00.000Z",
"type": "BANK_CONNECTION_UPDATE",
"status": "COMPLETED",
"payload": {
"bankConnectionId": 101,
"webForm": {
"id": "946db09e-5bfc-11eb-ae93-0242ac130002",
"url": "https://webform.finapi.io/wf/946db09e-5bfc-11eb-ae93-0242ac130002",
"status": "COMPLETED"
},
"errorCode": "INTERNAL_ERROR",
"errorMessage": "Invalid credentials."
}
}
Get tasks
get /api/tasks
Get all tasks associated with the authorized user.

Must pass the user's access token.

OAuth (BearerAccessToken)

REQUEST
QUERY-STRING PARAMETERS
order
string
createdAt,desc
Determines the order of the results. You can order by createdAt field ascending or descending. The general format is property[,asc|desc], with asc being the default value. The default order is createdAt,asc.

Examples: createdAt,desc
page
int32
1
Default: 1
Min 0
Page to load

Examples: 1
perPage
int32
20
Default: 20
Min 0┃Max 9223372036854776000
The number of items on the page

Examples: 20
API Server
https://webform-sandbox.finapi.io/
Authentication
API Key (Authorization) in header
RESPONSE
A page of tasks ordered by creation date

RESPONSE BODY
SCHEMA
application/json
object
Single line description
Field
Type
Description
- items*
array of object
Page of resources
Max Items: 500

id *
string
Globally unique task's identifier

Constraints: 36 to 36 chars
createdAt *
date-time
The timestamp when the task was created in the format yyyy-MM-dd'T'HH:mm:ss.SSSZ.

type *
enum
Task type:
• BANK_CONNECTION_UPDATE - task was created for updating a bank connection (service "Update a bank connection").

Allowed: BANK_CONNECTION_UPDATE
status *
enum
Task status:
• NOT_YET_STARTED - the task has been enqueued and will be processed soon;
• IN_PROGRESS - the task has been started and is currently in progress;
• WEB_FORM_REQUIRED - the task requires a web form to continue the flow with end user involvement (final status);
• COMPLETED - the task has been successfully completed (final status);
• COMPLETED_WITH_ERROR - the task has been completed with an error (final status).

Allowed: NOT_YET_STARTED┃IN_PROGRESS┃WEB_FORM_REQUIRED┃COMPLETED┃COMPLETED_WITH_ERROR
- payload*
object
Payload of the task

bankConnectionId *
integer
Identifier of the bank connection in the Access API. Initialized as soon as the task process is started. Use those ID to gather Bank Connection data from Access endpoints like, "Get a bank connection" or "Get and search all accounts".

- webForm
object or null
Minimal properties of the web form

id *
string
Globally unique web form's identifier

Constraints: 36 to 36 chars
url *
string
Full web form's URL (including the hostname).
You can enhance the given URL with the following query parameters: redirectUrl, errorRedirectUrl, abortRedirectUrl, customerSupportUrl. When using this feature, we recommend keeping the total URL length under 2048 characters. Although there's no restriction on our side, longer URLs may cause issues with certain browsers or systems. Find more info in the Web Form 2.0 Public Documentation.

Those query parameters refer to the client-side callbacks, which will redirect the user back to your application once the web form is finalised. If you're interested in server-side callbacks, please check Web Form 2.0 Public Documentation.

Constraints: 1 to 2048 chars
status *
enum
Web form status:
• NOT_YET_OPENED - the web form was not yet opened by the end user;
• IN_PROGRESS - the web form has already been opened by the end user and is currently in progress;
• COMPLETED - the web form has been successfully completed (final status);
• COMPLETED_WITH_ERROR - the web form has been completed with an error (final status);
• EXPIRED - the web form has expired (final status); This status means that either the expiresAt has passed, or the user closed the web form, and we finalized the flow in the background;
• ABORTED - the web form has been cancelled by the end user (final status);
• CANCELLED - the web form has been cancelled through the public API (final status).

NOTE: This status only applies to the Web Form and does not reflect the status of any other background processes (ex: synchronization of the bank data, payment status). Even if a web form was successfully completed, it can still be the case that accounts were not properly imported, or that a payment is still in PENDING status.

Allowed: NOT_YET_OPENED┃IN_PROGRESS┃COMPLETED┃COMPLETED_WITH_ERROR┃EXPIRED┃ABORTED┃CANCELLED
errorCode
enum┃null
Reason of the task failure.
NOTE: This enum can be extended in the future as new cases arise!

Codes can be interpreted as follows:
• BANK_SERVER_REJECTION - the flow has been terminated on the bank side, e.g., in case of incorrect credentials;
• INVALID_TOKEN - the given access token expired or became invalid during the flow;
• UNEXPECTED_ACCESS_RESPONSE - an unexpected response has been received from the Access API - similarly to the INTERNAL_ERROR code, please forward all details to our Customer Support team;
• INTERNAL_ERROR - the reason of the failure can not be identified - please forward all the details to our Customer Support team in order to get more info and also help us to eliminate the issue.

Allowed: BANK_SERVER_REJECTION┃INTERNAL_ERROR┃INVALID_TOKEN┃UNEXPECTED_ACCESS_RESPONSE┃MANDATOR_MISCONFIGURATION
errorMessage
string┃null
Details of task failure.

- paging*
object
Pagination information

page *
integer
Current page

perPage *
integer
Size of the current page

Constraints: Max 500
pageCount *
integer
Total number of pages available

totalCount *
integer
Total number of resources available

site notice data protection declaration API Explorer Version: 0.100.0