finAPI Access V2 Postman collection readme
------------------------------------------

Notes:
- The Postman collection is based on the Access V2 API. If your client is still configured to the V1 API, 
  you can't use this collection unless you upgrade your client to the V2 API.
- The collection is preconfigured to run against the finAPI sandbox and webform sandbox environment. So 
  you need your sandbox credentials to run it.

Prerequisite: Download Postman from https://www.postman.com

Steps to install the collection:

- Open Postman
- Select File/Import from the main menu
- Click on "Upload Files"
- In the browse dialog, select the two files 
    finAPI Access Product - V2.postman_collection.json
    FinAPI.postman_environment.json
- Click the "Import" button
  You should now see "finAPI Access Product - V2" collection in the left side outline and 
  an environment named "finAPI" in the environment combo box
- Edit the "finAPI" environment variables and replace the "XXXXX" value of the
  "clientId" and "clientSecret" properties with your finAPI clientId and clientSecret
- Run the "** 1. Pre-Requirements **" section before each use case and "** Clean up **" after each
- For each use case you want to execute, run the requests in the given order
- For requests containing "-open url-", don't proceed with the next request until you finished the webform
