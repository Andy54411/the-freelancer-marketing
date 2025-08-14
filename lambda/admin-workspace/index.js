// AWS Lambda Function für Admin Workspace Management
// Ersetzt Firebase Realtime Database mit AWS DynamoDB für Admin-Workspaces

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
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

// DynamoDB Table Namen
const TABLES = {
  ADMIN_WORKSPACES: process.env.ADMIN_WORKSPACES_TABLE || 'TaskiloAdminWorkspaces',
  WORKSPACE_TASKS: process.env.WORKSPACE_TASKS_TABLE || 'TaskiloWorkspaceTasks',
  WORKSPACE_MEMBERS: process.env.WORKSPACE_MEMBERS_TABLE || 'TaskiloWorkspaceMembers',
  WORKSPACE_BOARDS: process.env.WORKSPACE_BOARDS_TABLE || 'TaskiloWorkspaceBoards',
  WORKSPACE_ACTIVITY: process.env.WORKSPACE_ACTIVITY_TABLE || 'TaskiloWorkspaceActivity',
};

// CORS Headers für alle Responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // In Produktion sollte dies spezifischer sein
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async event => {
  console.log('Admin Workspace Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  try {
    // Normalisiere den Pfad - entferne /admin prefix falls vorhanden
    const normalizedPath = path.replace(/^\/admin/, '') || '/';

    // Router basierend auf HTTP Method und normalisierten Path
    if (httpMethod === 'GET') {
      if (normalizedPath === '/workspaces') {
        return await getAllWorkspaces(queryStringParameters);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/tasks')) {
        const workspaceId = extractWorkspaceId(normalizedPath);
        return await getWorkspaceTasks(workspaceId, queryStringParameters);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/members')) {
        const workspaceId = extractWorkspaceId(normalizedPath);
        return await getWorkspaceMembers(workspaceId);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/boards')) {
        const workspaceId = extractWorkspaceId(normalizedPath);
        return await getWorkspaceBoards(workspaceId);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/activity')) {
        const workspaceId = extractWorkspaceId(normalizedPath);
        return await getWorkspaceActivity(workspaceId, queryStringParameters);
      } else if (normalizedPath.includes('/workspaces/')) {
        const workspaceId = extractWorkspaceId(normalizedPath);
        return await getWorkspace(workspaceId);
      }
    } else if (httpMethod === 'POST') {
      if (normalizedPath === '/workspaces') {
        return await createWorkspace(parsedBody);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/tasks')) {
        const workspaceId = extractWorkspaceId(normalizedPath);
        return await createTask(workspaceId, parsedBody);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/members')) {
        const workspaceId = extractWorkspaceId(path);
        return await addWorkspaceMember(workspaceId, parsedBody);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/boards')) {
        const workspaceId = extractWorkspaceId(path);
        return await createBoard(workspaceId, parsedBody);
      }
    } else if (httpMethod === 'PUT') {
      if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/tasks/')) {
        const workspaceId = extractWorkspaceId(path);
        const taskId = extractTaskId(path);
        return await updateTask(workspaceId, taskId, parsedBody);
      } else if (normalizedPath.includes('/workspaces/')) {
        const workspaceId = extractWorkspaceId(path);
        return await updateWorkspace(workspaceId, parsedBody);
      }
    } else if (httpMethod === 'DELETE') {
      if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/tasks/')) {
        const workspaceId = extractWorkspaceId(path);
        const taskId = extractTaskId(path);
        return await deleteTask(workspaceId, taskId);
      } else if (normalizedPath.includes('/workspaces/') && normalizedPath.includes('/members/')) {
        const workspaceId = extractWorkspaceId(path);
        const memberId = extractMemberId(path);
        return await removeWorkspaceMember(workspaceId, memberId);
      } else if (normalizedPath.includes('/workspaces/')) {
        const workspaceId = extractWorkspaceId(path);
        return await deleteWorkspace(workspaceId);
      }
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Lambda Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Hilfsfunktionen für Path-Parsing
function extractWorkspaceId(path) {
  const match = path.match(/\/workspaces\/([^\/]+)/);
  return match ? match[1] : null;
}

function extractTaskId(path) {
  const match = path.match(/\/tasks\/([^\/]+)/);
  return match ? match[1] : null;
}

function extractMemberId(path) {
  const match = path.match(/\/members\/([^\/]+)/);
  return match ? match[1] : null;
}

// Workspace Management Functions
async function getAllWorkspaces(queryParams) {
  const limit = queryParams?.limit ? parseInt(queryParams.limit) : 50;
  const adminId = queryParams?.adminId;

  let params = {
    TableName: TABLES.ADMIN_WORKSPACES,
    Limit: limit,
  };

  // Filter nach Admin ID falls angegeben
  if (adminId) {
    params.FilterExpression =
      'contains(#assignedTo, :adminId) OR #adminId = :adminId OR #createdBy = :adminId';
    params.ExpressionAttributeNames = {
      '#assignedTo': 'assignedTo',
      '#adminId': 'adminId',
      '#createdBy': 'createdBy',
    };
    params.ExpressionAttributeValues = { ':adminId': adminId };
  }

  const result = await docClient.send(new ScanCommand(params));

  // Transformiere alle Workspaces zu Frontend-Format
  const transformedWorkspaces = (result.Items || []).map(transformWorkspaceToFrontend);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      workspaces: transformedWorkspaces,
      count: result.Count,
    }),
  };
}

async function getWorkspace(workspaceId) {
  // Unterstütze sowohl workspaceId als auch id als Key
  let result;

  // Zuerst versuche mit workspaceId (alte Struktur)
  result = await docClient.send(
    new GetCommand({
      TableName: TABLES.ADMIN_WORKSPACES,
      Key: { workspaceId },
    })
  );

  // Falls nicht gefunden, versuche mit id (neue Struktur)
  if (!result.Item) {
    result = await docClient.send(
      new GetCommand({
        TableName: TABLES.ADMIN_WORKSPACES,
        Key: { id: workspaceId },
      })
    );
  }

  if (!result.Item) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Workspace not found' }),
    };
  }

  // Transformiere Backend-Daten zu Frontend-Format
  const workspace = transformWorkspaceToFrontend(result.Item);

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      workspace: workspace,
    }),
  };
}

// Hilfsfunktion: Backend-Daten zu Frontend-Format transformieren
function transformWorkspaceToFrontend(backendWorkspace) {
  return {
    id: backendWorkspace.id || backendWorkspace.workspaceId,
    title: backendWorkspace.title || backendWorkspace.name,
    description: backendWorkspace.description || '',
    type: backendWorkspace.type || 'project',
    status: backendWorkspace.status || 'active',
    priority: backendWorkspace.priority || 'medium',
    assignedTo: backendWorkspace.assignedTo || backendWorkspace.members || [],
    dueDate: backendWorkspace.dueDate || null,
    createdAt:
      backendWorkspace.createdAt || backendWorkspace.createdAtISO || new Date().toISOString(),
    updatedAt:
      backendWorkspace.updatedAt || backendWorkspace.updatedAtISO || new Date().toISOString(),
    tags: backendWorkspace.tags || [],
    adminId: backendWorkspace.adminId || backendWorkspace.owner || 'admin',
    createdBy: backendWorkspace.createdBy || backendWorkspace.owner || 'admin',
    progress: backendWorkspace.progress || 0,
    boardColumns: backendWorkspace.boardColumns || [],
    tasks: backendWorkspace.tasks || [],
    archivedTasks: backendWorkspace.archivedTasks || [],
    members: backendWorkspace.members || [],
    relatedCompanies: backendWorkspace.relatedCompanies || [],
    systemLevel: backendWorkspace.systemLevel || 'platform',
    permissions: backendWorkspace.permissions || {
      viewLevel: 'admin',
      editLevel: 'admin',
      deleteLevel: 'admin',
    },
  };
}

async function createWorkspace(workspaceData) {
  const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const nowISO = now.toISOString();

  // Standard Board Columns für neue Workspaces
  const defaultBoardColumns = [
    {
      id: 'todo',
      title: 'Zu erledigen',
      color: '#ef4444',
      position: 0,
      tasks: [],
    },
    {
      id: 'in-progress',
      title: 'In Bearbeitung',
      color: '#f97316',
      position: 1,
      tasks: [],
    },
    {
      id: 'review',
      title: 'Review',
      color: '#eab308',
      position: 2,
      tasks: [],
    },
    {
      id: 'done',
      title: 'Erledigt',
      color: '#22c55e',
      position: 3,
      tasks: [],
    },
  ];

  const workspace = {
    // Frontend Interface Kompatibilität
    id: workspaceId,
    title: workspaceData.title || workspaceData.name,
    description: workspaceData.description || '',
    type: workspaceData.type || 'project',
    status: workspaceData.status || 'active',
    priority: workspaceData.priority || 'medium',
    assignedTo: workspaceData.assignedTo || [workspaceData.createdBy || 'admin'],
    dueDate: workspaceData.dueDate || null,
    createdAt: nowISO,
    updatedAt: nowISO,
    tags: workspaceData.tags || [],
    adminId: workspaceData.adminId || workspaceData.createdBy || 'admin',
    createdBy: workspaceData.createdBy || 'admin',
    progress: workspaceData.progress || 0,
    boardColumns: workspaceData.boardColumns || defaultBoardColumns,
    tasks: [],
    archivedTasks: [],
    members: workspaceData.members || [],
    relatedCompanies: workspaceData.relatedCompanies || [],
    systemLevel: workspaceData.systemLevel || 'platform',
    permissions: workspaceData.permissions || {
      viewLevel: 'admin',
      editLevel: 'admin',
      deleteLevel: 'admin',
    },

    // Backend-spezifische Felder (für Kompatibilität)
    workspaceId, // Alias für Backend-Kompatibilität
    name: workspaceData.title || workspaceData.name, // Alias für Backend-Kompatibilität
    owner: workspaceData.createdBy || 'admin',
    createdAtTimestamp: now.getTime(), // Für DynamoDB Indexing
    updatedAtTimestamp: now.getTime(),
  };

  // Entferne undefined values
  Object.keys(workspace).forEach(key => {
    if (workspace[key] === undefined || workspace[key] === null) {
      delete workspace[key];
    }
  });

  await docClient.send(
    new PutCommand({
      TableName: TABLES.ADMIN_WORKSPACES,
      Item: workspace,
    })
  );

  // Activity Log erstellen
  await logActivity(workspaceId, {
    action: 'workspace_created',
    actor: workspaceData.createdBy || 'admin',
    details: { workspaceTitle: workspace.title, workspaceType: workspace.type },
    timestamp: nowISO,
  });

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      workspace,
    }),
  };
}

async function updateWorkspace(workspaceId, updateData) {
  const now = new Date();
  const nowISO = now.toISOString();

  // Unterstütze beide Key-Strukturen (alte: workspaceId, neue: id)
  let params = {
    TableName: TABLES.ADMIN_WORKSPACES,
    Key: { workspaceId },
    UpdateExpression: 'SET #updatedAt = :updatedAt, #updatedAtTimestamp = :updatedAtTimestamp',
    ExpressionAttributeNames: {
      '#updatedAt': 'updatedAt',
      '#updatedAtTimestamp': 'updatedAtTimestamp',
    },
    ExpressionAttributeValues: {
      ':updatedAt': nowISO,
      ':updatedAtTimestamp': now.getTime(),
    },
    ReturnValues: 'ALL_NEW',
  };

  // Mapping von Frontend-Feldern zu Backend-Feldern
  const fieldMapping = {
    title: ['title', 'name'], // Frontend: title -> Backend: title + name (alias)
    description: ['description'],
    type: ['type'],
    status: ['status'],
    priority: ['priority'],
    assignedTo: ['assignedTo', 'members'], // Frontend: assignedTo -> Backend: assignedTo + members (alias)
    dueDate: ['dueDate'],
    tags: ['tags'],
    progress: ['progress'],
    boardColumns: ['boardColumns'],
    tasks: ['tasks'],
    archivedTasks: ['archivedTasks'],
    members: ['members'],
    relatedCompanies: ['relatedCompanies'],
    systemLevel: ['systemLevel'],
    permissions: ['permissions'],
  };

  // Dynamisch Update-Expression erstellen
  Object.keys(updateData).forEach(frontendField => {
    if (updateData[frontendField] !== undefined && fieldMapping[frontendField]) {
      fieldMapping[frontendField].forEach(backendField => {
        params.UpdateExpression += `, #${backendField} = :${backendField}`;
        params.ExpressionAttributeNames[`#${backendField}`] = backendField;
        params.ExpressionAttributeValues[`:${backendField}`] = updateData[frontendField];
      });
    } else if (updateData[frontendField] !== undefined) {
      // Direktes Mapping für Felder ohne Alias
      params.UpdateExpression += `, #${frontendField} = :${frontendField}`;
      params.ExpressionAttributeNames[`#${frontendField}`] = frontendField;
      params.ExpressionAttributeValues[`:${frontendField}`] = updateData[frontendField];
    }
  });

  let result;
  try {
    result = await docClient.send(new UpdateCommand(params));
  } catch (error) {
    // Falls workspaceId nicht funktioniert, versuche mit id
    if (error.name === 'ValidationException' || error.statusCode === 400) {
      params.Key = { id: workspaceId };
      result = await docClient.send(new UpdateCommand(params));
    } else {
      throw error;
    }
  }

  // Activity Log
  if (updateData.updatedBy || updateData.createdBy) {
    await logActivity(workspaceId, {
      action: 'workspace_updated',
      actor: updateData.updatedBy || updateData.createdBy || 'admin',
      details: updateData,
      timestamp: nowISO,
    });
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      workspace: transformWorkspaceToFrontend(result.Attributes),
    }),
  };
}

async function deleteWorkspace(workspaceId) {
  // Versuche zuerst mit workspaceId, dann mit id
  let workspace;

  try {
    workspace = await docClient.send(
      new GetCommand({
        TableName: TABLES.ADMIN_WORKSPACES,
        Key: { workspaceId },
      })
    );
  } catch (error) {
    // Falls workspaceId nicht funktioniert, versuche mit id
    workspace = await docClient.send(
      new GetCommand({
        TableName: TABLES.ADMIN_WORKSPACES,
        Key: { id: workspaceId },
      })
    );
  }

  if (workspace.Item) {
    const deleteKey = workspace.Item.workspaceId ? { workspaceId } : { id: workspaceId };

    // Soft Delete - setze Status auf 'archived'
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.ADMIN_WORKSPACES,
        Key: deleteKey,
        UpdateExpression: 'SET #status = :status, #deletedAt = :deletedAt, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#deletedAt': 'deletedAt',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': 'archived',
          ':deletedAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Workspace deleted successfully',
      }),
    };
  }

  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'Workspace not found' }),
  };
}

// Task Management Functions
async function getWorkspaceTasks(workspaceId, queryParams) {
  const limit = queryParams?.limit ? parseInt(queryParams.limit) : 100;
  const status = queryParams?.status;
  const assignee = queryParams?.assignee;

  // Use Scan with FilterExpression instead of Query with GSI
  let params = {
    TableName: TABLES.WORKSPACE_TASKS,
    FilterExpression: 'workspaceId = :workspaceId',
    ExpressionAttributeValues: { ':workspaceId': workspaceId },
    Limit: limit,
  };

  // Add additional filters
  let filterExpressions = ['workspaceId = :workspaceId'];
  if (status) {
    filterExpressions.push('#status = :status');
    params.ExpressionAttributeNames = { ...params.ExpressionAttributeNames, '#status': 'status' };
    params.ExpressionAttributeValues[':status'] = status;
  }
  if (assignee) {
    filterExpressions.push('contains(#assignees, :assignee)');
    params.ExpressionAttributeNames = {
      ...params.ExpressionAttributeNames,
      '#assignees': 'assignees',
    };
    params.ExpressionAttributeValues[':assignee'] = assignee;
  }

  params.FilterExpression = filterExpressions.join(' AND ');

  const result = await docClient.send(new ScanCommand(params));

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      tasks: result.Items || [],
      count: result.Count,
    }),
  };
}

async function createTask(workspaceId, taskData) {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const task = {
    taskId,
    workspaceId,
    title: taskData.title,
    description: taskData.description || '',
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    assignees: taskData.assignees || [],
    labels: taskData.labels || [],
    dueDate: taskData.dueDate || null,
    createdAt: now,
    updatedAt: now,
    createdBy: taskData.createdBy,
    comments: [],
    attachments: [],
    checklist: taskData.checklist || [],
    estimatedHours: taskData.estimatedHours || null,
    actualHours: 0,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.WORKSPACE_TASKS,
      Item: task,
    })
  );

  // Activity Log
  await logActivity(workspaceId, {
    action: 'task_created',
    actor: taskData.createdBy,
    details: { taskId, taskTitle: taskData.title },
    timestamp: now,
  });

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      task,
    }),
  };
}

async function updateTask(workspaceId, taskId, updateData) {
  const now = new Date().toISOString();

  const params = {
    TableName: TABLES.WORKSPACE_TASKS,
    Key: { taskId },
    UpdateExpression: 'SET #updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':updatedAt': now },
    ReturnValues: 'ALL_NEW',
  };

  // Dynamisch Update-Expression erstellen
  const updateFields = [
    'title',
    'description',
    'status',
    'priority',
    'assignees',
    'labels',
    'dueDate',
    'checklist',
    'estimatedHours',
    'actualHours',
  ];
  updateFields.forEach(field => {
    if (updateData[field] !== undefined) {
      params.UpdateExpression += `, #${field} = :${field}`;
      params.ExpressionAttributeNames[`#${field}`] = field;
      params.ExpressionAttributeValues[`:${field}`] = updateData[field];
    }
  });

  const result = await docClient.send(new UpdateCommand(params));

  // Activity Log
  if (updateData.updatedBy) {
    await logActivity(workspaceId, {
      action: 'task_updated',
      actor: updateData.updatedBy,
      details: { taskId, changes: updateData },
      timestamp: now,
    });
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      task: result.Attributes,
    }),
  };
}

async function deleteTask(workspaceId, taskId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.WORKSPACE_TASKS,
      Key: { taskId },
    })
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      message: 'Task deleted successfully',
    }),
  };
}

// Members Management
async function getWorkspaceMembers(workspaceId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.WORKSPACE_MEMBERS,
      IndexName: 'WorkspaceIndex',
      KeyConditionExpression: 'workspaceId = :workspaceId',
      ExpressionAttributeValues: { ':workspaceId': workspaceId },
    })
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      members: result.Items || [],
    }),
  };
}

async function addWorkspaceMember(workspaceId, memberData) {
  const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const member = {
    memberId,
    workspaceId,
    userId: memberData.userId,
    email: memberData.email,
    role: memberData.role || 'member',
    permissions: memberData.permissions || ['read', 'write'],
    joinedAt: now,
    addedBy: memberData.addedBy,
    status: 'active',
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.WORKSPACE_MEMBERS,
      Item: member,
    })
  );

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      member,
    }),
  };
}

async function removeWorkspaceMember(workspaceId, memberId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.WORKSPACE_MEMBERS,
      Key: { memberId },
    })
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      message: 'Member removed successfully',
    }),
  };
}

// Boards Management
async function getWorkspaceBoards(workspaceId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.WORKSPACE_BOARDS,
      IndexName: 'WorkspaceIndex',
      KeyConditionExpression: 'workspaceId = :workspaceId',
      ExpressionAttributeValues: { ':workspaceId': workspaceId },
    })
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      boards: result.Items || [],
    }),
  };
}

async function createBoard(workspaceId, boardData) {
  const boardId = `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const board = {
    boardId,
    workspaceId,
    name: boardData.name,
    description: boardData.description || '',
    type: boardData.type || 'kanban', // kanban, list, calendar, etc.
    columns: boardData.columns || [
      { id: 'todo', name: 'To Do', order: 0 },
      { id: 'in_progress', name: 'In Progress', order: 1 },
      { id: 'done', name: 'Done', order: 2 },
    ],
    settings: boardData.settings || {},
    createdAt: now,
    updatedAt: now,
    createdBy: boardData.createdBy,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.WORKSPACE_BOARDS,
      Item: board,
    })
  );

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      board,
    }),
  };
}

// Activity Logging
async function getWorkspaceActivity(workspaceId, queryParams) {
  const limit = queryParams?.limit ? parseInt(queryParams.limit) : 50;

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLES.WORKSPACE_ACTIVITY,
      IndexName: 'WorkspaceIndex',
      KeyConditionExpression: 'workspaceId = :workspaceId',
      ExpressionAttributeValues: { ':workspaceId': workspaceId },
      ScanIndexForward: false, // Neueste zuerst
      Limit: limit,
    })
  );

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      activities: result.Items || [],
    }),
  };
}

async function logActivity(workspaceId, activity) {
  const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const activityRecord = {
    activityId,
    workspaceId,
    action: activity.action,
    actor: activity.actor,
    details: activity.details,
    timestamp: activity.timestamp,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLES.WORKSPACE_ACTIVITY,
        Item: activityRecord,
      })
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Aktivitäts-Logging sollte keine Fehler werfen
  }
}
