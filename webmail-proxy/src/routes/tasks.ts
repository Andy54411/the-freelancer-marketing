/**
 * Tasks Routes - API für Aufgabenverwaltung
 * ==========================================
 * 
 * MongoDB-basierte Aufgaben für Webmail und Chat.
 * 
 * Endpoints:
 * GET    /api/tasks                    - Alle Tasks abrufen
 * POST   /api/tasks                    - Neue Task erstellen
 * GET    /api/tasks/:taskId            - Einzelne Task abrufen
 * PUT    /api/tasks/:taskId            - Task aktualisieren
 * DELETE /api/tasks/:taskId            - Task löschen
 * 
 * GET    /api/tasks/lists              - Alle Listen abrufen
 * POST   /api/tasks/lists              - Neue Liste erstellen
 * PUT    /api/tasks/lists/:listId      - Liste aktualisieren
 * DELETE /api/tasks/lists/:listId      - Liste löschen
 * 
 * GET    /api/tasks/space/:spaceId     - Tasks für Space abrufen
 * GET    /api/tasks/stats              - Statistiken abrufen
 * POST   /api/tasks/reorder            - Tasks neu ordnen
 * DELETE /api/tasks/completed          - Erledigte Tasks löschen
 */

import { Router, Request, Response } from 'express';
import tasksService from '../services/TasksService';

const router = Router();

// User ID aus Request holen
const getUserId = (req: Request): string => {
  const userId = req.headers['x-user-id'] as string || req.body?.userId;
  if (!userId) {
    throw new Error('User ID required');
  }
  return userId;
};

// ==================== TASK LISTS ====================

/**
 * GET /tasks/lists
 * Alle Task-Listen abrufen
 */
router.get('/lists', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const lists = await tasksService.getTaskLists(userId);

    res.json({
      success: true,
      lists,
    });
  } catch (error) {
    console.error('[Tasks] Error getting lists:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Listen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /tasks/lists
 * Neue Liste erstellen
 */
router.post('/lists', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, color } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Listenname ist erforderlich',
      });
    }

    const list = await tasksService.createTaskList(userId, name, color);

    res.json({
      success: true,
      list,
      message: 'Liste erstellt',
    });
  } catch (error) {
    console.error('[Tasks] Error creating list:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Liste',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * PUT /tasks/lists/:listId
 * Liste aktualisieren
 */
router.put('/lists/:listId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId } = req.params;
    const { name, color, order } = req.body;

    const list = await tasksService.updateTaskList(userId, listId, {
      name,
      color,
      order,
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        error: 'Liste nicht gefunden',
      });
    }

    res.json({
      success: true,
      list,
      message: 'Liste aktualisiert',
    });
  } catch (error) {
    console.error('[Tasks] Error updating list:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Liste',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /tasks/lists/:listId
 * Liste löschen
 */
router.delete('/lists/:listId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId } = req.params;

    const deleted = await tasksService.deleteTaskList(userId, listId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Liste nicht gefunden',
      });
    }

    res.json({
      success: true,
      message: 'Liste gelöscht',
    });
  } catch (error) {
    console.error('[Tasks] Error deleting list:', error);
    
    if (error instanceof Error && error.message.includes('Standardliste')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Liste',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== TASKS ====================

/**
 * GET /tasks
 * Alle Tasks abrufen (mit Filteroptionen)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId, spaceId, completed, starred, limit } = req.query;

    const tasks = await tasksService.getTasks(userId, {
      listId: listId as string | undefined,
      spaceId: spaceId as string | undefined,
      completed: completed === 'true' ? true : completed === 'false' ? false : undefined,
      starred: starred === 'true' ? true : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('[Tasks] Error getting tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Aufgaben',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /tasks/space/:spaceId
 * Tasks für einen Space abrufen
 */
router.get('/space/:spaceId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { spaceId } = req.params;

    const tasks = await tasksService.getSpaceTasks(userId, spaceId);

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('[Tasks] Error getting space tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Space-Aufgaben',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /tasks/stats
 * Task-Statistiken abrufen
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const stats = await tasksService.getTaskStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Tasks] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Statistiken',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /tasks
 * Neue Task erstellen
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { title, notes, listId, spaceId, dueDate, starred, priority, repeat } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Titel ist erforderlich',
      });
    }

    const task = await tasksService.createTask(userId, {
      title,
      notes,
      listId,
      spaceId,
      dueDate,
      starred,
      priority,
      repeat,
    });

    res.json({
      success: true,
      task,
      message: 'Aufgabe erstellt',
    });
  } catch (error) {
    console.error('[Tasks] Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Aufgabe',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /tasks/:taskId
 * Einzelne Task abrufen
 */
router.get('/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;

    const task = await tasksService.getTask(userId, taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden',
      });
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('[Tasks] Error getting task:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Aufgabe',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * PUT /tasks/:taskId
 * Task aktualisieren
 */
router.put('/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const updates = req.body;

    const task = await tasksService.updateTask(userId, taskId, updates);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden',
      });
    }

    res.json({
      success: true,
      task,
      message: 'Aufgabe aktualisiert',
    });
  } catch (error) {
    console.error('[Tasks] Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Aufgabe',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * PUT /tasks/:taskId/complete
 * Task als erledigt markieren
 */
router.put('/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;
    const { completed } = req.body;

    const task = await tasksService.completeTask(
      userId, 
      taskId, 
      completed !== false
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden',
      });
    }

    res.json({
      success: true,
      task,
      message: completed !== false ? 'Aufgabe erledigt' : 'Aufgabe wieder geöffnet',
    });
  } catch (error) {
    console.error('[Tasks] Error completing task:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Aufgabe',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /tasks/:taskId
 * Task löschen
 */
router.delete('/:taskId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { taskId } = req.params;

    const deleted = await tasksService.deleteTask(userId, taskId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden',
      });
    }

    res.json({
      success: true,
      message: 'Aufgabe gelöscht',
    });
  } catch (error) {
    console.error('[Tasks] Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Aufgabe',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /tasks/reorder
 * Tasks neu ordnen
 */
router.post('/reorder', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds)) {
      return res.status(400).json({
        success: false,
        error: 'taskIds muss ein Array sein',
      });
    }

    await tasksService.reorderTasks(userId, taskIds);

    res.json({
      success: true,
      message: 'Reihenfolge aktualisiert',
    });
  } catch (error) {
    console.error('[Tasks] Error reordering tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Neuordnen der Aufgaben',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /tasks/completed
 * Alle erledigten Tasks löschen
 */
router.delete('/completed', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { listId } = req.query;

    const count = await tasksService.clearCompletedTasks(
      userId, 
      listId as string | undefined
    );

    res.json({
      success: true,
      deletedCount: count,
      message: `${count} erledigte Aufgaben gelöscht`,
    });
  } catch (error) {
    console.error('[Tasks] Error clearing completed tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der erledigten Aufgaben',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /tasks/from-email
 * Task aus E-Mail erstellen
 */
router.post('/from-email', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { mailbox, uid, title } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Titel ist erforderlich',
      });
    }

    // Erstelle Task mit E-Mail-Referenz
    const task = await tasksService.createTask(userId, {
      title: title,
      notes: `Erstellt aus E-Mail (UID: ${uid}, Ordner: ${mailbox})`,
      starred: true, // E-Mail-Tasks automatisch als wichtig markieren
      priority: 'medium',
      emailRef: {
        mailbox,
        uid,
      },
    });

    res.json({
      success: true,
      task,
      message: 'Aufgabe aus E-Mail erstellt',
    });
  } catch (error) {
    console.error('[Tasks] Error creating task from email:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Aufgabe',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

export default router;
