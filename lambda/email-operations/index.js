// AWS Lambda Function für komplettes Email Management
// Ersetzt alle /api/admin/emails/* Vercel Routes

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

exports.handler = async event => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
  const parsedBody = body ? JSON.parse(body) : null;

  try {
    // Route Request zu entsprechender Handler Function
    const route = getRoute(path, httpMethod);
    const response = await handleRoute(route, pathParameters, parsedBody, queryStringParameters);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

function getRoute(path, method) {
  const routes = {
    'GET:/admin/emails/inbox': 'getInboxEmails',
    'PATCH:/admin/emails/inbox': 'updateMultipleEmails',
    'DELETE:/admin/emails/inbox': 'deleteMultipleEmails',
    'GET:/admin/emails/inbox/{id}': 'getEmailById',
    'PATCH:/admin/emails/inbox/{id}': 'updateEmail',
    'DELETE:/admin/emails/inbox/{id}': 'deleteEmail',
    'POST:/admin/emails/inbox/{id}/reply': 'replyToEmail',
    'GET:/admin/emails/templates': 'getTemplates',
    'POST:/admin/emails/templates': 'createTemplate',
    'GET:/admin/emails/templates/{id}': 'getTemplateById',
    'PUT:/admin/emails/templates/{id}': 'updateTemplate',
    'DELETE:/admin/emails/templates/{id}': 'deleteTemplate',
    'GET:/admin/emails/contacts': 'getContacts',
    'POST:/admin/emails/contacts': 'createContact',
    'GET:/admin/emails/contacts/{id}': 'getContactById',
    'PUT:/admin/emails/contacts/{id}': 'updateContact',
    'DELETE:/admin/emails/contacts/{id}': 'deleteContact',
    'POST:/admin/emails/send': 'sendEmail',
    'GET:/admin/emails/stats': 'getEmailStats',
  };

  return routes[`${method}:${path}`] || 'notFound';
}

async function handleRoute(route, pathParameters, body, queryParams) {
  switch (route) {
    case 'getInboxEmails':
      return await getInboxEmails(queryParams);
    case 'updateMultipleEmails':
      return await updateMultipleEmails(body);
    case 'deleteMultipleEmails':
      return await deleteMultipleEmails(body);
    case 'getEmailById':
      return await getEmailById(pathParameters.id);
    case 'updateEmail':
      return await updateEmail(pathParameters.id, body);
    case 'deleteEmail':
      return await deleteEmail(pathParameters.id);
    case 'replyToEmail':
      return await replyToEmail(pathParameters.id, body);
    case 'getTemplates':
      return await getTemplates();
    case 'createTemplate':
      return await createTemplate(body);
    case 'getTemplateById':
      return await getTemplateById(pathParameters.id);
    case 'updateTemplate':
      return await updateTemplate(pathParameters.id, body);
    case 'deleteTemplate':
      return await deleteTemplate(pathParameters.id);
    case 'getContacts':
      return await getContacts();
    case 'createContact':
      return await createContact(body);
    case 'getContactById':
      return await getContactById(pathParameters.id);
    case 'updateContact':
      return await updateContact(pathParameters.id, body);
    case 'deleteContact':
      return await deleteContact(pathParameters.id);
    case 'sendEmail':
      return await sendEmail(body);
    case 'getEmailStats':
      return await getEmailStats();
    default:
      throw new Error('Route not found');
  }
}

// ===== INBOX EMAIL OPERATIONS =====

async function getInboxEmails(queryParams) {
  const limit = queryParams?.limit ? parseInt(queryParams.limit) : 50;
  const lastKey = queryParams?.lastKey
    ? JSON.parse(decodeURIComponent(queryParams.lastKey))
    : undefined;

  const params = {
    TableName: process.env.ADMIN_EMAILS_TABLE,
    IndexName: 'TimestampIndex',
    ScanIndexForward: false, // Neueste zuerst
    Limit: limit,
  };

  if (lastKey) {
    params.ExclusiveStartKey = lastKey;
  }

  const command = new ScanCommand(params);
  const result = await docClient.send(command);

  return {
    emails: result.Items || [],
    lastKey: result.LastEvaluatedKey
      ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
      : null,
    total: result.Count,
  };
}

async function getEmailById(emailId) {
  const params = {
    TableName: process.env.ADMIN_EMAILS_TABLE,
    Key: { emailId },
  };

  const command = new GetCommand(params);
  const result = await docClient.send(command);

  if (!result.Item) {
    throw new Error('Email not found');
  }

  return result.Item;
}

async function updateEmail(emailId, updateData) {
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(updateData).forEach((key, index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;

    updateExpression.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = updateData[key];
  });

  const params = {
    TableName: process.env.ADMIN_EMAILS_TABLE,
    Key: { emailId },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  };

  const command = new UpdateCommand(params);
  const result = await docClient.send(command);

  return result.Attributes;
}

async function deleteEmail(emailId) {
  const params = {
    TableName: process.env.ADMIN_EMAILS_TABLE,
    Key: { emailId },
  };

  const command = new DeleteCommand(params);
  await docClient.send(command);

  return { success: true, emailId };
}

async function updateMultipleEmails(data) {
  const { emailIds, updates } = data;
  const results = [];

  for (const emailId of emailIds) {
    try {
      const result = await updateEmail(emailId, updates);
      results.push({ emailId, success: true, data: result });
    } catch (error) {
      results.push({ emailId, success: false, error: error.message });
    }
  }

  return { results, total: results.length };
}

async function deleteMultipleEmails(data) {
  const { emailIds } = data;
  const results = [];

  for (const emailId of emailIds) {
    try {
      await deleteEmail(emailId);
      results.push({ emailId, success: true });
    } catch (error) {
      results.push({ emailId, success: false, error: error.message });
    }
  }

  return { results, total: results.length };
}

async function replyToEmail(emailId, replyData) {
  // Hole Original Email
  const originalEmail = await getEmailById(emailId);

  // Erstelle Reply Email
  const replyEmailData = {
    to: originalEmail.from,
    subject: replyData.subject.startsWith('Re:')
      ? replyData.subject
      : `Re: ${originalEmail.subject}`,
    body: replyData.body,
    replyToEmailId: emailId,
    inReplyTo: originalEmail.messageId,
  };

  // Sende Reply
  const sentEmail = await sendEmail(replyEmailData);

  // Update Original Email als "replied"
  await updateEmail(emailId, {
    isReplied: true,
    repliedAt: new Date().toISOString(),
    replyEmailId: sentEmail.emailId,
  });

  return sentEmail;
}

// ===== EMAIL TEMPLATES =====

async function getTemplates() {
  const params = {
    TableName: process.env.EMAIL_TEMPLATES_TABLE,
  };

  const command = new ScanCommand(params);
  const result = await docClient.send(command);

  return {
    templates: result.Items || [],
    total: result.Count,
  };
}

async function createTemplate(templateData) {
  const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const template = {
    templateId,
    ...templateData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const params = {
    TableName: process.env.EMAIL_TEMPLATES_TABLE,
    Item: template,
  };

  const command = new PutCommand(params);
  await docClient.send(command);

  return template;
}

async function getTemplateById(templateId) {
  const params = {
    TableName: process.env.EMAIL_TEMPLATES_TABLE,
    Key: { templateId },
  };

  const command = new GetCommand(params);
  const result = await docClient.send(command);

  if (!result.Item) {
    throw new Error('Template not found');
  }

  return result.Item;
}

async function updateTemplate(templateId, updateData) {
  const template = await getTemplateById(templateId);

  const updatedTemplate = {
    ...template,
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  const params = {
    TableName: process.env.EMAIL_TEMPLATES_TABLE,
    Item: updatedTemplate,
  };

  const command = new PutCommand(params);
  await docClient.send(command);

  return updatedTemplate;
}

async function deleteTemplate(templateId) {
  const params = {
    TableName: process.env.EMAIL_TEMPLATES_TABLE,
    Key: { templateId },
  };

  const command = new DeleteCommand(params);
  await docClient.send(command);

  return { success: true, templateId };
}

// ===== EMAIL CONTACTS =====

async function getContacts() {
  const params = {
    TableName: process.env.EMAIL_CONTACTS_TABLE,
  };

  const command = new ScanCommand(params);
  const result = await docClient.send(command);

  return {
    contacts: result.Items || [],
    total: result.Count,
  };
}

async function createContact(contactData) {
  const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const contact = {
    contactId,
    ...contactData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const params = {
    TableName: process.env.EMAIL_CONTACTS_TABLE,
    Item: contact,
  };

  const command = new PutCommand(params);
  await docClient.send(command);

  return contact;
}

async function getContactById(contactId) {
  const params = {
    TableName: process.env.EMAIL_CONTACTS_TABLE,
    Key: { contactId },
  };

  const command = new GetCommand(params);
  const result = await docClient.send(command);

  if (!result.Item) {
    throw new Error('Contact not found');
  }

  return result.Item;
}

async function updateContact(contactId, updateData) {
  const contact = await getContactById(contactId);

  const updatedContact = {
    ...contact,
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  const params = {
    TableName: process.env.EMAIL_CONTACTS_TABLE,
    Item: updatedContact,
  };

  const command = new PutCommand(params);
  await docClient.send(command);

  return updatedContact;
}

async function deleteContact(contactId) {
  const params = {
    TableName: process.env.EMAIL_CONTACTS_TABLE,
    Key: { contactId },
  };

  const command = new DeleteCommand(params);
  await docClient.send(command);

  return { success: true, contactId };
}

// ===== SEND EMAIL =====

async function sendEmail(emailData) {
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const messageId = `${emailId}@taskilo.de`;

  // SES Email Parameter
  const sesParams = {
    Source: process.env.FROM_EMAIL,
    Destination: {
      ToAddresses: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
    },
    Message: {
      Subject: {
        Data: emailData.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: emailData.body,
          Charset: 'UTF-8',
        },
      },
    },
    ReplyToAddresses: [process.env.FROM_EMAIL],
  };

  if (emailData.inReplyTo) {
    sesParams.MessageId = emailData.inReplyTo;
  }

  // Sende Email über SES
  const sesCommand = new SendEmailCommand(sesParams);
  const sesResult = await sesClient.send(sesCommand);

  // Speichere Sent Email in DynamoDB
  const sentEmail = {
    emailId,
    messageId: sesResult.MessageId,
    to: emailData.to,
    subject: emailData.subject,
    body: emailData.body,
    sentAt: new Date().toISOString(),
    status: 'sent',
    replyToEmailId: emailData.replyToEmailId || null,
    inReplyTo: emailData.inReplyTo || null,
  };

  const dynamoParams = {
    TableName: process.env.SENT_EMAILS_TABLE,
    Item: sentEmail,
  };

  const dynamoCommand = new PutCommand(dynamoParams);
  await docClient.send(dynamoCommand);

  return sentEmail;
}

// ===== EMAIL STATISTICS =====

async function getEmailStats() {
  // Inbox Stats
  const inboxParams = {
    TableName: process.env.ADMIN_EMAILS_TABLE,
  };

  const inboxCommand = new ScanCommand(inboxParams);
  const inboxResult = await docClient.send(inboxCommand);

  const totalEmails = inboxResult.Count;
  const unreadEmails = inboxResult.Items.filter(email => !email.isRead).length;
  const todayEmails = inboxResult.Items.filter(email => {
    const emailDate = new Date(email.receivedAt);
    const today = new Date();
    return emailDate.toDateString() === today.toDateString();
  }).length;

  // Sent Stats
  const sentParams = {
    TableName: process.env.SENT_EMAILS_TABLE,
  };

  const sentCommand = new ScanCommand(sentParams);
  const sentResult = await docClient.send(sentCommand);

  const totalSent = sentResult.Count;
  const todaySent = sentResult.Items.filter(email => {
    const emailDate = new Date(email.sentAt);
    const today = new Date();
    return emailDate.toDateString() === today.toDateString();
  }).length;

  return {
    inbox: {
      total: totalEmails,
      unread: unreadEmails,
      today: todayEmails,
    },
    sent: {
      total: totalSent,
      today: todaySent,
    },
    templates: await getTemplateCount(),
    contacts: await getContactCount(),
  };
}

async function getTemplateCount() {
  const params = {
    TableName: process.env.EMAIL_TEMPLATES_TABLE,
    Select: 'COUNT',
  };

  const command = new ScanCommand(params);
  const result = await docClient.send(command);

  return result.Count;
}

async function getContactCount() {
  const params = {
    TableName: process.env.EMAIL_CONTACTS_TABLE,
    Select: 'COUNT',
  };

  const command = new ScanCommand(params);
  const result = await docClient.send(command);

  return result.Count;
}
