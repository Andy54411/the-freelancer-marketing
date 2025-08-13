// AWS Lambda für AI-basierte Ticket-Klassifizierung
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

// Ticket Analysis Interface als JSDoc
/**
 * @typedef {Object} TicketAnalysis
 * @property {'low'|'medium'|'high'|'urgent'} priority
 * @property {'bug'|'feature'|'support'|'question'|'billing'|'technical'|'other'} category
 * @property {'positive'|'neutral'|'negative'|'angry'} sentiment
 * @property {number} urgencyScore
 * @property {string} [suggestedAssignee]
 * @property {string} [estimatedResolutionTime]
 * @property {string[]} tags
 */

exports.handler = async event => {
  try {
    const { ticketId, title, description, customerEmail } = event;

    // Ticket-Analyse durchführen
    const analysis = await analyzeTicket(title, description, customerEmail);

    // DynamoDB Ticket aktualisieren
    await updateTicketWithAnalysis(ticketId, analysis);

    // Automatische Zuweisung bei dringenden Tickets
    if (analysis.priority === 'urgent') {
      await assignUrgentTicket(ticketId, analysis);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        analysis,
        message: 'Ticket erfolgreich analysiert und klassifiziert',
      }),
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Fehler bei der Ticket-Analyse',
      }),
    };
  }
};

/**
 * Analysiert ein Ticket und extrahiert relevante Metadaten
 * @param {string} title
 * @param {string} description
 * @param {string} [customerEmail]
 * @returns {Promise<TicketAnalysis>}
 */
async function analyzeTicket(title, description, customerEmail) {
  const text = `${title} ${description}`.toLowerCase();

  // Prioritäts-Analyse
  const priority = analyzePriority(text);

  // Kategorie-Analyse
  const category = analyzeCategory(text);

  // Sentiment-Analyse
  const sentiment = analyzeSentiment(text);

  // Urgency Score berechnen
  const urgencyScore = calculateUrgencyScore(text, sentiment, customerEmail);

  // Tags extrahieren
  const tags = extractTags(text);

  // Geschätzte Bearbeitungszeit
  const estimatedResolutionTime = estimateResolutionTime(category, priority);

  // Empfohlener Assignee
  const suggestedAssignee = suggestAssignee(category, priority);

  return {
    priority,
    category,
    sentiment,
    urgencyScore,
    suggestedAssignee,
    estimatedResolutionTime,
    tags,
  };
}

/**
 * Analysiert die Priorität basierend auf Keywords
 * @param {string} text
 * @returns {'low'|'medium'|'high'|'urgent'}
 */
function analyzePriority(text) {
  const urgentKeywords = [
    'sofort',
    'dringend',
    'notfall',
    'kritisch',
    'down',
    'offline',
    'fehler',
    'problem',
    'kaputt',
    'funktioniert nicht',
    'emergency',
    'urgent',
    'critical',
    'broken',
    'crash',
    'error',
    'bug',
    'urgent',
    'asap',
    'immediately',
  ];

  const highKeywords = [
    'wichtig',
    'schnell',
    'bald',
    'heute',
    'morgen',
    'issue',
    'important',
    'soon',
    'today',
    'tomorrow',
    'high priority',
  ];

  const lowKeywords = [
    'frage',
    'feature',
    'verbesserung',
    'suggestion',
    'enhancement',
    'nice to have',
    'when possible',
    'low priority',
  ];

  const urgentCount = urgentKeywords.filter(keyword => text.includes(keyword)).length;
  const highCount = highKeywords.filter(keyword => text.includes(keyword)).length;
  const lowCount = lowKeywords.filter(keyword => text.includes(keyword)).length;

  if (urgentCount >= 2) return 'urgent';
  if (urgentCount >= 1 || highCount >= 2) return 'high';
  if (lowCount >= 1) return 'low';

  return 'medium';
}

function analyzeCategory(text) {
  const bugKeywords = [
    'fehler',
    'bug',
    'error',
    'kaputt',
    'funktioniert nicht',
    'crash',
    'problem',
  ];
  const featureKeywords = ['feature', 'verbesserung', 'enhancement', 'new', 'add', 'implement'];
  const supportKeywords = ['hilfe', 'help', 'support', 'anleitung', 'how to', 'wie'];
  const questionKeywords = ['frage', 'question', 'warum', 'why', 'what', 'was', 'wie'];
  const billingKeywords = ['rechnung', 'billing', 'payment', 'zahlung', 'price', 'cost', 'preis'];
  const technicalKeywords = ['api', 'integration', 'technical', 'development', 'code', 'webhook'];

  if (bugKeywords.some(keyword => text.includes(keyword))) return 'bug';
  if (featureKeywords.some(keyword => text.includes(keyword))) return 'feature';
  if (billingKeywords.some(keyword => text.includes(keyword))) return 'billing';
  if (technicalKeywords.some(keyword => text.includes(keyword))) return 'technical';
  if (supportKeywords.some(keyword => text.includes(keyword))) return 'support';
  if (questionKeywords.some(keyword => text.includes(keyword))) return 'question';

  return 'other';
}

function analyzeSentiment(text) {
  const angryKeywords = [
    'furchtbar',
    'schrecklich',
    'katastrophe',
    'unverschämtheit',
    'frechheit',
    'terrible',
    'awful',
    'horrible',
    'worst',
    'hate',
    'angry',
    'frustrated',
  ];

  const negativeKeywords = [
    'schlecht',
    'enttäuscht',
    'problem',
    'fehler',
    'ärgerlich',
    'bad',
    'disappointed',
    'issue',
    'wrong',
    'broken',
    'annoying',
  ];

  const positiveKeywords = [
    'gut',
    'toll',
    'super',
    'fantastisch',
    'danke',
    'great',
    'good',
    'excellent',
    'amazing',
    'thank you',
    'thanks',
    'love',
    'perfect',
  ];

  if (angryKeywords.some(keyword => text.includes(keyword))) return 'angry';
  if (negativeKeywords.some(keyword => text.includes(keyword))) return 'negative';
  if (positiveKeywords.some(keyword => text.includes(keyword))) return 'positive';

  return 'neutral';
}

function calculateUrgencyScore(text, sentiment, customerEmail) {
  let score = 50; // Base score

  // Sentiment-Einfluss
  if (sentiment === 'angry') score += 30;
  else if (sentiment === 'negative') score += 15;
  else if (sentiment === 'positive') score -= 10;

  // Premium-Kunden (erkennung über E-Mail-Domain oder spezielle Keywords)
  if (
    customerEmail &&
    (customerEmail.includes('enterprise') || customerEmail.includes('premium'))
  ) {
    score += 20;
  }

  // Text-Länge (längere Beschreibungen = mehr Details = höhere Priorität)
  if (text.length > 500) score += 10;

  // Zeitbezogene Keywords
  if (text.includes('heute') || text.includes('today')) score += 15;
  if (text.includes('sofort') || text.includes('immediately')) score += 25;

  return Math.min(100, Math.max(0, score));
}

function extractTags(text) {
  const tags = [];

  // Technische Tags
  if (text.includes('api')) tags.push('API');
  if (text.includes('payment') || text.includes('zahlung')) tags.push('Payment');
  if (text.includes('mobile') || text.includes('app')) tags.push('Mobile');
  if (text.includes('web') || text.includes('website')) tags.push('Website');
  if (text.includes('email') || text.includes('mail')) tags.push('E-Mail');

  // Service-Tags
  if (text.includes('handwerker')) tags.push('Handwerker');
  if (text.includes('reinigung')) tags.push('Reinigung');
  if (text.includes('umzug')) tags.push('Umzug');
  if (text.includes('garten')) tags.push('Garten');

  // Problem-Tags
  if (text.includes('login') || text.includes('anmeldung')) tags.push('Login');
  if (text.includes('registrierung') || text.includes('registration')) tags.push('Registrierung');
  if (text.includes('buchung') || text.includes('booking')) tags.push('Buchung');

  return tags;
}

function estimateResolutionTime(category, priority) {
  const timeMatrix = {
    urgent: {
      bug: '2 Stunden',
      technical: '4 Stunden',
      billing: '1 Stunde',
      support: '30 Minuten',
      default: '2 Stunden',
    },
    high: {
      bug: '1 Tag',
      technical: '2 Tage',
      billing: '4 Stunden',
      support: '2 Stunden',
      default: '1 Tag',
    },
    medium: {
      bug: '3 Tage',
      feature: '1-2 Wochen',
      technical: '1 Woche',
      support: '1 Tag',
      default: '3 Tage',
    },
    low: {
      feature: '2-4 Wochen',
      question: '1-2 Tage',
      support: '2-3 Tage',
      default: '1 Woche',
    },
  };

  return timeMatrix[priority]?.[category] || timeMatrix[priority]?.['default'] || '3 Tage';
}

function suggestAssignee(category, priority) {
  const assigneeMatrix = {
    bug: 'Tech Team',
    technical: 'Tech Team',
    billing: 'Finance Team',
    feature: 'Product Team',
    support: 'Support Team',
    question: 'Support Team',
    other: 'Support Team',
  };

  if (priority === 'urgent') {
    return 'Lead Developer';
  }

  return assigneeMatrix[category] || 'Support Team';
}

async function updateTicketWithAnalysis(ticketId, analysis) {
  const updateParams = {
    TableName: 'taskilo-admin-data',
    Key: marshall({ id: ticketId }),
    UpdateExpression:
      'SET #priority = :priority, #category = :category, #sentiment = :sentiment, #urgencyScore = :urgencyScore, #suggestedAssignee = :suggestedAssignee, #estimatedResolutionTime = :estimatedResolutionTime, #tags = :tags, #analysisTimestamp = :timestamp',
    ExpressionAttributeNames: {
      '#priority': 'priority',
      '#category': 'category',
      '#sentiment': 'sentiment',
      '#urgencyScore': 'urgencyScore',
      '#suggestedAssignee': 'suggestedAssignee',
      '#estimatedResolutionTime': 'estimatedResolutionTime',
      '#tags': 'tags',
      '#analysisTimestamp': 'analysisTimestamp',
    },
    ExpressionAttributeValues: marshall({
      ':priority': analysis.priority,
      ':category': analysis.category,
      ':sentiment': analysis.sentiment,
      ':urgencyScore': analysis.urgencyScore,
      ':suggestedAssignee': analysis.suggestedAssignee || '',
      ':estimatedResolutionTime': analysis.estimatedResolutionTime || '',
      ':tags': analysis.tags,
      ':timestamp': new Date().toISOString(),
    }),
  };

  return dynamodb.send(new UpdateItemCommand(updateParams));
}

async function assignUrgentTicket(ticketId, analysis) {
  // Bei dringenden Tickets automatisch zuweisen
  const updateParams = {
    TableName: 'taskilo-admin-data',
    Key: marshall({ id: ticketId }),
    UpdateExpression:
      'SET #assignedTo = :assignedTo, #status = :status, #autoAssigned = :autoAssigned',
    ExpressionAttributeNames: {
      '#assignedTo': 'assignedTo',
      '#status': 'status',
      '#autoAssigned': 'autoAssigned',
    },
    ExpressionAttributeValues: marshall({
      ':assignedTo': analysis.suggestedAssignee || 'Lead Developer',
      ':status': 'in-progress',
      ':autoAssigned': true,
    }),
  };

  return dynamodb.send(new UpdateItemCommand(updateParams));
}
