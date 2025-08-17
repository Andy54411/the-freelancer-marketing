"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_ses_1 = require("@aws-sdk/client-ses");
const client_sns_1 = require("@aws-sdk/client-sns");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new client_ses_1.SESClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const snsClient = new client_sns_1.SNSClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const ADMIN_EMAILS_TABLE = process.env.ADMIN_EMAILS_TABLE || 'TaskiloAdminEmails';
const EMAIL_TEMPLATES_TABLE = process.env.EMAIL_TEMPLATES_TABLE || 'TaskiloEmailTemplates';
const EMAIL_CONTACTS_TABLE = process.env.EMAIL_CONTACTS_TABLE || 'TaskiloEmailContacts';
const SENT_EMAILS_TABLE = process.env.SENT_EMAILS_TABLE || 'TaskiloSentEmails';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
const createResponse = (statusCode, body) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
});
const handler = async (event) => {
    console.log('Lambda Email Operations - Event:', JSON.stringify(event, null, 2));
    try {
        const method = event.httpMethod;
        const path = event.path;
        const pathParams = event.pathParameters || {};
        const queryParams = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        if (method === 'OPTIONS') {
            return createResponse(200, { message: 'CORS preflight' });
        }
        console.log(`Routing: ${method} ${path}`);
        if (path === '/admin/emails/stats' || path.endsWith('/admin/emails/stats')) {
            return await handleEmailStats(method, queryParams);
        }
        else if (path === '/admin/emails/sync' || path.endsWith('/admin/emails/sync')) {
            return await handleEmailSync(method, body);
        }
        else if (path === '/admin/emails/send' || path.endsWith('/admin/emails/send')) {
            return await handleEmailSending(method, body);
        }
        else if (path === '/admin/emails/templates' || path.endsWith('/admin/emails/templates')) {
            return await handleTemplateOperations(method, pathParams, queryParams, body);
        }
        else if (path === '/admin/emails/contacts' || path.endsWith('/admin/emails/contacts')) {
            return await handleContactOperations(method, pathParams, queryParams, body);
        }
        else if (path === '/admin/emails' ||
            path === '/admin/emails/inbox' ||
            path.endsWith('/admin/emails') ||
            path.endsWith('/admin/emails/inbox')) {
            return await handleInboxOperations(method, pathParams, queryParams, body);
        }
        return createResponse(404, { success: false, error: 'Route not found' });
    }
    catch (error) {
        console.error('Lambda Email Operations Error:', error);
        return createResponse(500, {
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};
exports.handler = handler;
async function handleInboxOperations(method, pathParams, queryParams, body) {
    try {
        switch (method) {
            case 'GET':
                if (pathParams.id) {
                    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
                        TableName: ADMIN_EMAILS_TABLE,
                        KeyConditionExpression: 'emailId = :emailId',
                        ExpressionAttributeValues: {
                            ':emailId': pathParams.id,
                        },
                    }));
                    if (result.Items && result.Items.length > 0) {
                        return createResponse(200, {
                            success: true,
                            data: result.Items[0],
                        });
                    }
                    else {
                        return createResponse(404, {
                            success: false,
                            error: 'Email not found',
                        });
                    }
                }
                else {
                    const filter = queryParams.filter || 'all';
                    let filterExpression = '';
                    const expressionAttributeValues = {};
                    if (filter === 'unread') {
                        filterExpression = 'isRead = :isRead';
                        expressionAttributeValues[':isRead'] = false;
                    }
                    else if (filter === 'starred') {
                        filterExpression = 'contains(labels, :label)';
                        expressionAttributeValues[':label'] = 'starred';
                    }
                    else if (filter === 'spam') {
                        filterExpression = 'isSpam = :isSpam';
                        expressionAttributeValues[':isSpam'] = true;
                    }
                    const params = {
                        TableName: ADMIN_EMAILS_TABLE,
                        Limit: 50,
                    };
                    if (filterExpression) {
                        params.FilterExpression = filterExpression;
                        params.ExpressionAttributeValues = expressionAttributeValues;
                    }
                    const result = await docClient.send(new lib_dynamodb_1.ScanCommand(params));
                    const emails = result.Items || [];
                    const stats = {
                        total: emails.length,
                        unread: emails.filter(email => !email.isRead).length,
                        starred: emails.filter(email => email.labels?.includes('starred')).length,
                        spam: emails.filter(email => email.isSpam).length,
                    };
                    return createResponse(200, {
                        success: true,
                        data: {
                            emails: emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
                            stats,
                        },
                    });
                }
            case 'PATCH':
                const { emailIds, action } = body;
                if (!emailIds || !Array.isArray(emailIds) || !action) {
                    return createResponse(400, {
                        success: false,
                        error: 'emailIds array and action are required',
                    });
                }
                const updates = {};
                switch (action) {
                    case 'markAsRead':
                        updates.isRead = true;
                        break;
                    case 'markAsUnread':
                        updates.isRead = false;
                        break;
                    case 'star':
                        updates.labels = ['starred'];
                        updates.isStarred = true;
                        break;
                    case 'unstar':
                        updates.labels = [];
                        updates.isStarred = false;
                        break;
                    case 'archive':
                        updates.isArchived = true;
                        break;
                    case 'unarchive':
                        updates.isArchived = false;
                        break;
                    default:
                        return createResponse(400, {
                            success: false,
                            error: 'Invalid action',
                        });
                }
                for (const emailId of emailIds) {
                    await docClient.send(new lib_dynamodb_1.UpdateCommand({
                        TableName: ADMIN_EMAILS_TABLE,
                        Key: { emailId },
                        UpdateExpression: Object.keys(updates)
                            .map(key => `SET ${key} = :${key}`)
                            .join(', '),
                        ExpressionAttributeValues: Object.fromEntries(Object.entries(updates).map(([key, value]) => [`:${key}`, value])),
                    }));
                }
                return createResponse(200, {
                    success: true,
                    message: `Successfully updated ${emailIds.length} email(s)`,
                });
            case 'DELETE':
                const { emailIds: deleteIds } = body;
                if (!deleteIds || !Array.isArray(deleteIds)) {
                    return createResponse(400, {
                        success: false,
                        error: 'emailIds array is required',
                    });
                }
                for (const emailId of deleteIds) {
                    await docClient.send(new lib_dynamodb_1.DeleteCommand({
                        TableName: ADMIN_EMAILS_TABLE,
                        Key: { emailId },
                    }));
                }
                return createResponse(200, {
                    success: true,
                    message: `Successfully deleted ${deleteIds.length} email(s)`,
                });
            default:
                return createResponse(405, {
                    success: false,
                    error: 'Method not allowed',
                });
        }
    }
    catch (error) {
        console.error('Inbox operations error:', error);
        return createResponse(500, {
            success: false,
            error: 'Failed to process inbox operation',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
async function handleTemplateOperations(method, pathParams, queryParams, body) {
    try {
        switch (method) {
            case 'GET':
                if (pathParams.id) {
                    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
                        TableName: EMAIL_TEMPLATES_TABLE,
                        KeyConditionExpression: 'templateId = :templateId',
                        ExpressionAttributeValues: {
                            ':templateId': pathParams.id,
                        },
                    }));
                    if (result.Items && result.Items.length > 0) {
                        return createResponse(200, {
                            success: true,
                            data: result.Items[0],
                        });
                    }
                    else {
                        return createResponse(404, {
                            success: false,
                            error: 'Template not found',
                        });
                    }
                }
                else {
                    const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
                        TableName: EMAIL_TEMPLATES_TABLE,
                        FilterExpression: 'isActive = :isActive',
                        ExpressionAttributeValues: {
                            ':isActive': true,
                        },
                    }));
                    return createResponse(200, {
                        success: true,
                        data: result.Items || [],
                    });
                }
            case 'POST':
                const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();
                const newTemplate = {
                    templateId,
                    name: body.name,
                    subject: body.subject,
                    htmlContent: body.htmlContent,
                    textContent: body.textContent || '',
                    category: body.category || 'general',
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                };
                await docClient.send(new lib_dynamodb_1.PutCommand({
                    TableName: EMAIL_TEMPLATES_TABLE,
                    Item: newTemplate,
                }));
                return createResponse(201, {
                    success: true,
                    data: newTemplate,
                });
            case 'PUT':
                if (!pathParams.id) {
                    return createResponse(400, {
                        success: false,
                        error: 'Template ID is required',
                    });
                }
                const updateData = {
                    ...body,
                    updatedAt: new Date().toISOString(),
                };
                await docClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: EMAIL_TEMPLATES_TABLE,
                    Key: { templateId: pathParams.id },
                    UpdateExpression: Object.keys(updateData)
                        .map(key => `SET ${key} = :${key}`)
                        .join(', '),
                    ExpressionAttributeValues: Object.fromEntries(Object.entries(updateData).map(([key, value]) => [`:${key}`, value])),
                }));
                return createResponse(200, {
                    success: true,
                    message: 'Template updated successfully',
                });
            case 'DELETE':
                if (!pathParams.id) {
                    return createResponse(400, {
                        success: false,
                        error: 'Template ID is required',
                    });
                }
                await docClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: EMAIL_TEMPLATES_TABLE,
                    Key: { templateId: pathParams.id },
                    UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
                    ExpressionAttributeValues: {
                        ':isActive': false,
                        ':updatedAt': new Date().toISOString(),
                    },
                }));
                return createResponse(200, {
                    success: true,
                    message: 'Template deleted successfully',
                });
            default:
                return createResponse(405, {
                    success: false,
                    error: 'Method not allowed',
                });
        }
    }
    catch (error) {
        console.error('Template operations error:', error);
        return createResponse(500, {
            success: false,
            error: 'Failed to process template operation',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
async function handleContactOperations(method, pathParams, queryParams, body) {
    try {
        switch (method) {
            case 'GET':
                const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
                    TableName: EMAIL_CONTACTS_TABLE,
                    FilterExpression: '#status <> :unsubscribed',
                    ExpressionAttributeNames: {
                        '#status': 'status',
                    },
                    ExpressionAttributeValues: {
                        ':unsubscribed': 'unsubscribed',
                    },
                }));
                return createResponse(200, {
                    success: true,
                    data: result.Items || [],
                });
            case 'POST':
                const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const now = new Date().toISOString();
                const newContact = {
                    contactId,
                    email: body.email,
                    name: body.name,
                    tags: body.tags || [],
                    status: 'active',
                    createdAt: now,
                };
                await docClient.send(new lib_dynamodb_1.PutCommand({
                    TableName: EMAIL_CONTACTS_TABLE,
                    Item: newContact,
                }));
                return createResponse(201, {
                    success: true,
                    data: newContact,
                });
            case 'PUT':
                if (!pathParams.id) {
                    return createResponse(400, {
                        success: false,
                        error: 'Contact ID is required',
                    });
                }
                await docClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: EMAIL_CONTACTS_TABLE,
                    Key: { contactId: pathParams.id },
                    UpdateExpression: Object.keys(body)
                        .map(key => `SET ${key} = :${key}`)
                        .join(', '),
                    ExpressionAttributeValues: Object.fromEntries(Object.entries(body).map(([key, value]) => [`:${key}`, value])),
                }));
                return createResponse(200, {
                    success: true,
                    message: 'Contact updated successfully',
                });
            case 'DELETE':
                if (!pathParams.id) {
                    return createResponse(400, {
                        success: false,
                        error: 'Contact ID is required',
                    });
                }
                await docClient.send(new lib_dynamodb_1.DeleteCommand({
                    TableName: EMAIL_CONTACTS_TABLE,
                    Key: { contactId: pathParams.id },
                }));
                return createResponse(200, {
                    success: true,
                    message: 'Contact deleted successfully',
                });
            default:
                return createResponse(405, {
                    success: false,
                    error: 'Method not allowed',
                });
        }
    }
    catch (error) {
        console.error('Contact operations error:', error);
        return createResponse(500, {
            success: false,
            error: 'Failed to process contact operation',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
async function handleEmailSending(method, body) {
    try {
        if (method !== 'POST') {
            return createResponse(405, {
                success: false,
                error: 'Method not allowed',
            });
        }
        const { to, cc, bcc, subject, htmlContent, textContent, templateId, from } = body;
        if (!to || !subject || (!htmlContent && !textContent)) {
            return createResponse(400, {
                success: false,
                error: 'Missing required fields: to, subject, and content',
            });
        }
        const fromEmail = from || process.env.FROM_EMAIL || 'noreply@taskilo.de';
        const emailParams = {
            Source: fromEmail,
            Destination: {
                ToAddresses: Array.isArray(to) ? to : [to],
                CcAddresses: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
                BccAddresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8',
                },
                Body: {
                    Html: htmlContent
                        ? {
                            Data: htmlContent,
                            Charset: 'UTF-8',
                        }
                        : undefined,
                    Text: textContent
                        ? {
                            Data: textContent,
                            Charset: 'UTF-8',
                        }
                        : undefined,
                },
            },
        };
        const result = await sesClient.send(new client_ses_1.SendEmailCommand(emailParams));
        const emailId = `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sentEmail = {
            id: emailId,
            emailId,
            messageId: result.MessageId || '',
            from: emailParams.Source,
            to: emailParams.Destination.ToAddresses || [],
            cc: emailParams.Destination.CcAddresses,
            bcc: emailParams.Destination.BccAddresses,
            subject,
            htmlContent: htmlContent || '',
            textContent: textContent || '',
            templateId: templateId || undefined,
            status: 'sent',
            sentAt: new Date().toISOString(),
            metadata: {
                sesMessageId: result.MessageId,
                sesRequestId: result.$metadata.requestId,
            },
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: SENT_EMAILS_TABLE,
            Item: sentEmail,
        }));
        return createResponse(200, {
            success: true,
            data: {
                messageId: result.MessageId,
                emailId: sentEmail.emailId,
            },
        });
    }
    catch (error) {
        console.error('Email sending error:', error);
        return createResponse(500, {
            success: false,
            error: 'Failed to send email',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
async function handleEmailStats(method, queryParams) {
    try {
        if (method !== 'GET') {
            return createResponse(405, {
                success: false,
                error: 'Method not allowed',
            });
        }
        const sentResult = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: SENT_EMAILS_TABLE,
        }));
        const sentEmails = sentResult.Items || [];
        const stats = {
            totalSent: sentEmails.length,
            totalDelivered: sentEmails.filter(email => email.status === 'delivered').length,
            totalBounced: sentEmails.filter(email => email.status === 'bounced').length,
            totalComplaints: 0,
            deliveryRate: sentEmails.length > 0
                ? (sentEmails.filter(email => email.status === 'delivered').length / sentEmails.length) *
                    100
                : 0,
        };
        return createResponse(200, {
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('Email stats error:', error);
        return createResponse(500, {
            success: false,
            error: 'Failed to get email statistics',
            details: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
async function handleEmailSync(method, body) {
    try {
        switch (method) {
            case 'POST':
                const { emails, folder, adminEmail, source } = body;
                if (!emails || !Array.isArray(emails)) {
                    return createResponse(400, {
                        success: false,
                        error: 'emails array is required',
                    });
                }
                if (!adminEmail) {
                    return createResponse(400, {
                        success: false,
                        error: 'adminEmail is required',
                    });
                }
                console.log(`Syncing ${emails.length} emails for ${adminEmail} from ${folder}`);
                const syncedEmails = [];
                const errors = [];
                for (const email of emails) {
                    try {
                        const emailId = `${adminEmail}_${email.id || email.messageId || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        const emailData = {
                            emailId,
                            messageId: email.messageId || email.id || emailId,
                            from: email.from || 'Unknown',
                            to: Array.isArray(email.to) ? email.to : [email.to || 'Unknown'],
                            cc: email.cc ? (Array.isArray(email.cc) ? email.cc : [email.cc]) : [],
                            bcc: email.bcc ? (Array.isArray(email.bcc) ? email.bcc : [email.bcc]) : [],
                            replyTo: email.replyTo || email.from,
                            subject: email.subject || 'No Subject',
                            htmlContent: email.htmlContent || email.body || '',
                            textContent: email.textContent || email.body || '',
                            receivedAt: email.receivedAt || email.timestamp || new Date().toISOString(),
                            isRead: email.isRead || false,
                            isStarred: false,
                            isArchived: false,
                            labels: email.labels || [],
                            priority: email.priority || 'normal',
                            headers: email.headers || {},
                            source: source || 'workmail_imap',
                            spamScore: 0,
                            isSpam: false,
                            metadata: {
                                webhookReceivedAt: new Date().toISOString(),
                                source: 'imap_sync',
                            },
                            folder: folder || 'INBOX',
                            adminEmail,
                            lastSynced: new Date().toISOString(),
                            uid: email.uid,
                            flags: email.flags || [],
                            size: email.size || 0,
                        };
                        await docClient.send(new lib_dynamodb_1.PutCommand({
                            TableName: ADMIN_EMAILS_TABLE,
                            Item: emailData,
                            ConditionExpression: 'attribute_not_exists(emailId)',
                        }));
                        syncedEmails.push(emailData);
                        console.log(`✅ Synced email: ${emailData.subject}`);
                    }
                    catch (error) {
                        if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
                            console.log(`⚠️ Email already exists: ${email.subject}`);
                        }
                        else {
                            console.error(`❌ Failed to sync email: ${email.subject}`, error);
                            errors.push({
                                email: email.subject || 'Unknown',
                                error: error instanceof Error ? error.message : 'Unknown error',
                            });
                        }
                    }
                }
                return createResponse(200, {
                    success: true,
                    data: {
                        syncedCount: syncedEmails.length,
                        totalCount: emails.length,
                        errors: errors.length,
                        syncedEmails: syncedEmails.map(email => ({
                            emailId: email.emailId,
                            subject: email.subject,
                            from: email.from,
                            receivedAt: email.receivedAt,
                        })),
                        errorDetails: errors,
                    },
                    message: `Successfully synced ${syncedEmails.length}/${emails.length} emails`,
                });
            case 'GET':
                const adminEmailParam = body.adminEmail;
                const folderParam = body.folder || 'INBOX';
                const limit = parseInt(body.limit) || 50;
                if (!adminEmailParam) {
                    return createResponse(400, {
                        success: false,
                        error: 'adminEmail is required',
                    });
                }
                const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
                    TableName: ADMIN_EMAILS_TABLE,
                    FilterExpression: 'adminEmail = :adminEmail AND folder = :folder',
                    ExpressionAttributeValues: {
                        ':adminEmail': adminEmailParam,
                        ':folder': folderParam,
                    },
                    Limit: limit,
                }));
                const cachedEmails = result.Items || [];
                cachedEmails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
                return createResponse(200, {
                    success: true,
                    data: {
                        emails: cachedEmails,
                        totalCount: cachedEmails.length,
                        unreadCount: cachedEmails.filter(email => !email.isRead).length,
                        source: 'dynamodb_cache',
                        folder: folderParam,
                        lastSync: cachedEmails[0]?.lastSynced || null,
                    },
                });
            case 'DELETE':
                const { emailIds, adminEmail: deleteAdminEmail } = body;
                if (!emailIds || !Array.isArray(emailIds)) {
                    return createResponse(400, {
                        success: false,
                        error: 'emailIds array is required',
                    });
                }
                if (!deleteAdminEmail) {
                    return createResponse(400, {
                        success: false,
                        error: 'adminEmail is required',
                    });
                }
                const deletedEmails = [];
                const deleteErrors = [];
                for (const emailId of emailIds) {
                    try {
                        await docClient.send(new lib_dynamodb_1.DeleteCommand({
                            TableName: ADMIN_EMAILS_TABLE,
                            Key: { emailId },
                            ConditionExpression: 'adminEmail = :adminEmail',
                            ExpressionAttributeValues: {
                                ':adminEmail': deleteAdminEmail,
                            },
                        }));
                        deletedEmails.push(emailId);
                        console.log(`🗑️ Permanently deleted email: ${emailId}`);
                    }
                    catch (error) {
                        console.error(`❌ Failed to delete email: ${emailId}`, error);
                        deleteErrors.push({
                            emailId,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        });
                    }
                }
                return createResponse(200, {
                    success: true,
                    data: {
                        deletedCount: deletedEmails.length,
                        totalCount: emailIds.length,
                        errors: deleteErrors.length,
                        deletedEmails,
                        errorDetails: deleteErrors,
                    },
                    message: `Permanently deleted ${deletedEmails.length}/${emailIds.length} emails`,
                });
            default:
                return createResponse(405, {
                    success: false,
                    error: `Method ${method} not allowed for /admin/emails/sync`,
                });
        }
    }
    catch (error) {
        console.error('❌ Email sync error:', error);
        return createResponse(500, {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
;
