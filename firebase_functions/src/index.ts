// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts
import dotenv from 'dotenv';

dotenv.config();

import { initializeApp } from "firebase-admin/app";
initializeApp();

import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
    region: "europe-west1", // <-- HIER die korrekte Region global festlegen
    timeoutSeconds: 540,
    memory: '128MiB', // <-- EXTREM REDUZIERT: Speicher auf 128MiB gesenkt als letzter Versuch, Quota-Probleme zu beheben.
    cpu: 0.1, // <-- NOCHMALS REDUZIERT: CPU-Anforderung weiter gesenkt, um das Quota-Limit sicher einzuhalten.
    concurrency: 1, // <-- Jede Instanz bearbeitet nur eine Anfrage gleichzeitig.
    secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
});

// Explicitly import and export functions to ensure Firebase CLI can correctly parse them.

import * as callableStripe from './callable_stripe';
import * as callableGeneral from './callable_general';
import * as httpGeneral from './http_general';
import * as httpWebhooks from './http_webhooks';
import * as httpFileUploads from './http_file_uploads';
import * as triggersFirestore from './triggers_firestore';
import * as callableOrders from './callable_orders';
import * as getUserOrdersModule from './getUserOrders';
import * as getProviderOrdersModule from './getProviderOrders';
import * as triggersChat from './triggers_chat';
import * as httpMigrations from './http_migrations';
import * as invites from './invites';
import * as triggersAuth from './triggers_auth';
import * as onCallFunctions from './on_call_functions';
import * as chatbot from './chatbot';

// Stripe Callables
export const createStripeAccountIfComplete = callableStripe.createStripeAccountIfComplete;
export const getOrCreateStripeCustomer = callableStripe.getOrCreateStripeCustomer;
export const updateStripeCompanyDetails = callableStripe.updateStripeCompanyDetails;
export const getOrderParticipantDetails = callableStripe.getOrderParticipantDetails;
export const createSetupIntent = callableStripe.createSetupIntent;
export const getSavedPaymentMethods = callableStripe.getSavedPaymentMethods;
export const getStripeAccountStatus = callableStripe.getStripeAccountStatus;
export const getProviderStripeAccountId = callableStripe.getProviderStripeAccountId;

// General Callables
export const getClientIp = callableGeneral.getClientIp;
export const createTemporaryJobDraft = callableGeneral.createTemporaryJobDraft;
export const submitReview = callableGeneral.submitReview;
export const getReviewsByProvider = callableGeneral.getReviewsByProvider;

// HTTP General Requests
export const migrateExistingUsersToCompanies = httpGeneral.migrateExistingUsersToCompanies;
export const searchCompanyProfiles = httpGeneral.searchCompanyProfiles;
export const getDataForSubcategory = httpGeneral.getDataForSubcategory;
export const createJobPosting = httpGeneral.createJobPosting;

// HTTP Webhooks & Uploads
export const stripeWebhookHandler = httpWebhooks.stripeWebhookHandler;
export const uploadStripeFile = httpFileUploads.uploadStripeFile;

// Firestore Triggers
export const createUserProfile = triggersFirestore.createUserProfile;
export const updateUserProfile = triggersFirestore.updateUserProfile;
export const createStripeCustomAccountOnUserUpdate = triggersFirestore.createStripeCustomAccountOnUserUpdate;

// Order Callables
export const acceptOrder = callableOrders.acceptOrder;
export const rejectOrder = callableOrders.rejectOrder;
export const getUserOrders = getUserOrdersModule.getUserOrders;
export const getProviderOrders = getProviderOrdersModule.getProviderOrders;

// Chat Triggers
export const populateChatUserDetails = triggersChat.populateChatUserDetails;
export const onUserUpdatePropagateToChats = triggersChat.onUserUpdatePropagateToChats;
export const onChatUpdateManageUserDetails = triggersChat.onChatUpdateManageUserDetails;
export const onCompanyUpdatePropagateToChats = triggersChat.onCompanyUpdatePropagateToChats;

// Other HTTP and Triggers
export const backfillChatUserDetails = httpMigrations.backfillChatUserDetails;
export const createInviteCode = invites.createInviteCode;
export const deleteInviteCode = invites.deleteInviteCode;
export const syncUserRoleWithCustomClaims = triggersAuth.syncUserRoleWithCustomClaims;
export const searchAvailableProviders = onCallFunctions.searchAvailableProviders;
export const handleSupportMessage = chatbot.handleSupportMessage;