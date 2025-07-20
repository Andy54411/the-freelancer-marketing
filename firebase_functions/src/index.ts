// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts
import dotenv from 'dotenv';

dotenv.config();

import { initializeApp } from "firebase-admin/app";
initializeApp();

import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
    region: "europe-west1", // <-- HIER die korrekte Region global festlegen
    timeoutSeconds: 540,
    memory: '256MiB', // <-- AUSGEWOGEN: Speicher auf 256MiB erhöht, um Memory-Limit-Probleme zu beheben ohne CPU-Quota zu überschreiten.
    cpu: 0.1, // <-- MINIMAL: CPU-Anforderung minimiert, um Quota-Probleme zu vermeiden.
    concurrency: 1, // <-- Jede Instanz bearbeitet nur eine Anfrage gleichzeitig.
});

import * as httpOrders from './http_orders';

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
import * as enhancedChatbotAPI from "./enhanced-chatbot-api";

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
export const replyToReview = callableGeneral.replyToReview;
export const getReviewsByProvider = callableGeneral.getReviewsByProvider;
export const deleteCompanyAccount = callableGeneral.deleteCompanyAccount;
export const syncSpecificCompanyToUser = callableGeneral.syncSpecificCompanyToUser;
export const syncSpecificUserToCompany = callableGeneral.syncSpecificUserToCompany;

// HTTP General Requests
export const migrateExistingUsersToCompanies = httpGeneral.migrateExistingUsersToCompanies;
export const syncCompanyToUserData = httpGeneral.syncCompanyToUserData;
export const searchCompanyProfiles = httpGeneral.searchCompanyProfiles;
export const getDataForSubcategory = httpGeneral.getDataForSubcategory;
export const createJobPosting = httpGeneral.createJobPosting;
export const getReviewsByProviderHTTP = httpGeneral.getReviewsByProviderHTTP;

// HTTP Webhooks & Uploads
export const stripeWebhookHandler = httpWebhooks.stripeWebhookHandler;
export const uploadStripeFile = httpFileUploads.uploadStripeFile;

// Firestore Triggers
export const createUserProfile = triggersFirestore.createUserProfile;
export const updateUserProfile = triggersFirestore.updateUserProfile;
export const syncCompanyToUserOnUpdate = triggersFirestore.syncCompanyToUserOnUpdate;
export const createStripeCustomAccountOnUserUpdate = triggersFirestore.createStripeCustomAccountOnUserUpdate;

// Order Callables
export const acceptOrder = callableOrders.acceptOrder;
export const acceptOrderHTTP = httpOrders.acceptOrderHTTP;
export const getUserOrdersHTTP = httpOrders.getUserOrdersHTTP;
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

// Enhanced Chatbot APIs
export const enhancedChatbot = enhancedChatbotAPI.enhancedChatbotAPI;
export const supportDashboard = enhancedChatbotAPI.supportDashboardAPI;