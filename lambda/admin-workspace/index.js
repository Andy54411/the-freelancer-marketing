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

exports.handler = async event => {
  console.log('Admin Workspace Event:', JSON.stringify(event, null, 2));

  const { httpMethod, path, pathParameters, body, queryStringParameters } = event;
  const parsedBody = body ? JSON.parse(body) : {};

  try {
    // Router basierend auf HTTP Method und Path
    if (httpMethod === 'GET') {
      if (path === '/workspaces') {
        return await getAllWorkspaces(queryStringParameters);
      } else if (path.includes('/workspaces/') && path.includes('/tasks')) {
        const workspaceId = extractWorkspaceId(path);
        return await getWorkspaceTasks(workspaceId, queryStringParameters);
      } else if (path.includes('/workspaces/') && path.includes('/members')) {
        const workspaceId = extractWorkspaceId(path);
        return await getWorkspaceMembers(workspaceId);
      } else if (path.includes('/workspaces/') && path.includes('/boards')) {
        const workspaceId = extractWorkspaceId(path);
        return await getWorkspaceBoards(workspaceId);
      } else if (path.includes('/workspaces/') && path.includes('/activity')) {
        const workspaceId = extractWorkspaceId(path);
        return await getWorkspaceActivity(workspaceId, queryStringParameters);
      } else if (path.includes('/workspaces/')) {
        const workspaceId = extractWorkspaceId(path);
        return await getWorkspace(workspaceId);
      }
    } else if (httpMethod === 'POST') {
      if (path === '/workspaces') {
        return await createWorkspace(parsedBody);
      } else if (path.includes('/workspaces/') && path.includes('/tasks')) {
        const workspaceId = extractWorkspaceId(path);
        return await createTask(workspaceId, parsedBody);
      } else if (path.includes('/workspaces/') && path.includes('/members')) {
        const workspaceId = extractWorkspaceId(path);
        return await addWorkspaceMember(workspaceId, parsedBody);
      } else if (path.includes('/workspaces/') && path.includes('/boards')) {
        const workspaceId = extractWorkspaceId(path);
        return await createBoard(workspaceId, parsedBody);
      }
    } else if (httpMethod === 'PUT') {
      if (path.includes('/workspaces/') && path.includes('/tasks/')) {
        const workspaceId = extractWorkspaceId(path);
        const taskId = extractTaskId(path);
        return await updateTask(workspaceId, taskId, parsedBody);
      } else if (path.includes('/workspaces/')) {
        const workspaceId = extractWorkspaceId(path);
        return await updateWorkspace(workspaceId, parsedBody);
      }
    } else if (httpMethod === 'DELETE') {
      if (path.includes('/workspaces/') && path.includes('/tasks/')) {
        const workspaceId = extractWorkspaceId(path);
        const taskId = extractTaskId(path);
        return await deleteTask(workspaceId, taskId);
      } else if (path.includes('/workspaces/') && path.includes('/members/')) {
        const workspaceId = extractWorkspaceId(path);
        const memberId = extractMemberId(path);
        return await removeWorkspaceMember(workspaceId, memberId);
      } else if (path.includes('/workspaces/')) {
        const workspaceId = extractWorkspaceId(path);
        return await deleteWorkspace(workspaceId);
      }
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Lambda Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
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
    params.FilterExpression = 'contains(#members, :adminId)';
    params.ExpressionAttributeNames = { '#members': 'members' };
    params.ExpressionAttributeValues = { ':adminId': adminId };
  }

  const result = await docClient.send(new ScanCommand(params));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      workspaces: result.Items || [],
      count: result.Count,
    }),
  };
}

async function getWorkspace(workspaceId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.ADMIN_WORKSPACES,
      Key: { workspaceId },
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Workspace not found' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      workspace: result.Item,
    }),
  };
}

async function createWorkspace(workspaceData) {
  const workspaceId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const workspace = {
    workspaceId,
    name: workspaceData.name,
    description: workspaceData.description || '',
    owner: workspaceData.owner,
    members: workspaceData.members || [workspaceData.owner],
    type: 'admin', // Unterscheidung von Company-Workspaces
    status: 'active',
    settings: {
      isPublic: workspaceData.isPublic || false,
      allowGuests: workspaceData.allowGuests || false,
      notifications: true,
      ...workspaceData.settings,
    },
    createdAt: now,
    updatedAt: now,
    createdBy: workspaceData.owner,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.ADMIN_WORKSPACES,
      Item: workspace,
    })
  );

  // Activity Log erstellen
  await logActivity(workspaceId, {
    action: 'workspace_created',
    actor: workspaceData.owner,
    details: { workspaceName: workspaceData.name },
    timestamp: now,
  });

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      workspace,
    }),
  };
}

async function updateWorkspace(workspaceId, updateData) {
  const now = new Date().toISOString();

  const params = {
    TableName: TABLES.ADMIN_WORKSPACES,
    Key: { workspaceId },
    UpdateExpression: 'SET #updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#updatedAt': 'updatedAt' },
    ExpressionAttributeValues: { ':updatedAt': now },
    ReturnValues: 'ALL_NEW',
  };

  // Dynamisch Update-Expression erstellen
  const updateFields = ['name', 'description', 'settings', 'status'];
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
      action: 'workspace_updated',
      actor: updateData.updatedBy,
      details: updateData,
      timestamp: now,
    });
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      workspace: result.Attributes,
    }),
  };
}

async function deleteWorkspace(workspaceId) {
  // Erstelle Backup bevor gelöscht wird
  const workspace = await docClient.send(
    new GetCommand({
      TableName: TABLES.ADMIN_WORKSPACES,
      Key: { workspaceId },
    })
  );

  if (workspace.Item) {
    // Soft Delete - setze Status auf 'deleted'
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.ADMIN_WORKSPACES,
        Key: { workspaceId },
        UpdateExpression: 'SET #status = :status, #deletedAt = :deletedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#deletedAt': 'deletedAt',
        },
        ExpressionAttributeValues: {
          ':status': 'deleted',
          ':deletedAt': new Date().toISOString(),
        },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Workspace deleted successfully',
      }),
    };
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Workspace not found' }),
  };
}

// Task Management Functions
async function getWorkspaceTasks(workspaceId, queryParams) {
  const limit = queryParams?.limit ? parseInt(queryParams.limit) : 100;
  const status = queryParams?.status;
  const assignee = queryParams?.assignee;

  let params = {
    TableName: TABLES.WORKSPACE_TASKS,
    IndexName: 'WorkspaceIndex', // GSI für workspaceId
    KeyConditionExpression: 'workspaceId = :workspaceId',
    ExpressionAttributeValues: { ':workspaceId': workspaceId },
    Limit: limit,
  };

  // Filter hinzufügen
  let filterExpressions = [];
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

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
  }

  const result = await docClient.send(new QueryCommand(params));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
