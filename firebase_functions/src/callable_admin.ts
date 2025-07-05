import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getStripeInstance } from "./helpers";
import { defineSecret } from "firebase-functions/params";

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");