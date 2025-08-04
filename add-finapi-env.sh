#!/bin/bash

# Add new finAPI credentials to Vercel - all environments at once
echo "🔧 Adding new finAPI credentials to Vercel..."

# New confirmed working credentials from finAPI support (August 2025)
echo "ac54e888-8ccf-40ef-9b92-b27c9dc02f29" | vercel env add FINAPI_SANDBOX_CLIENT_ID
echo "73689ad2-95e5-4180-93a2-7209ba6e10aa" | vercel env add FINAPI_SANDBOX_CLIENT_SECRET
echo "eb8c7cd129dc2eee8e31a4098fba4921" | vercel env add FINAPI_SANDBOX_DATA_DECRYPTION_KEY

echo "a2d8cf0e-c68c-45fa-b4ad-4184a355094e" | vercel env add FINAPI_ADMIN_CLIENT_ID
echo "478a0e66-8c9a-49ee-84cd-e49d87d077c9" | vercel env add FINAPI_ADMIN_CLIENT_SECRET
echo "d9b2781e40298973ee0d6a376e509b1c" | vercel env add FINAPI_ADMIN_DATA_DECRYPTION_KEY

echo "✅ All new finAPI credentials added!"
echo "🚀 Ready to test the finAPI SDK Service"
