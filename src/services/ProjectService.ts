/**
 * ProjectService - Projektmanagement mit Gantt-Funktionalität
 * 
 * Erweiterte Features:
 * - Critical Path Method (CPM) Berechnung
 * - Resource Management
 * - Auto-Scheduling basierend auf Dependencies
 * - Projekt-Phasen und Meilensteine
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ProjectMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: 'owner' | 'manager' | 'member' | 'viewer';
  hoursPerDay?: number; // Für Resource Management
}

export interface ProjectResource {
  id: string;
  name: string;
  type: 'person' | 'equipment' | 'material';
  capacity: number; // Stunden pro Tag
  costPerHour?: number;
  color?: string;
}

export interface TaskDependency {
  taskId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, etc.
  lag?: number; // Verzögerung in Tagen (kann negativ sein für Lead)
}

export interface ProjectTask {
  id: string;
  name: string;
  description?: string;
  type: 'task' | 'milestone' | 'project'; // project = Zusammenfassung/Phase
  
  // Zeitplanung
  startDate: Date;
  endDate: Date;
  duration: number; // in Tagen
  progress: number; // 0-100
  
  // Hierarchie
  parentId?: string;
  order: number;
  
  // Dependencies (Abhängigkeiten)
  dependencies: TaskDependency[];
  
  // Resources
  assignedTo: string[]; // Resource IDs
  resourceAllocation?: { [resourceId: string]: number }; // Stunden pro Tag
  
  // Critical Path Berechnungen (werden dynamisch berechnet)
  earlyStart?: Date;
  earlyFinish?: Date;
  lateStart?: Date;
  lateFinish?: Date;
  slack?: number; // Float/Puffer in Tagen
  isCritical?: boolean;
  
  // Styling
  color?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Status-Typ für Projekte (das-programm.io kompatibel)
export type ProjectStatus = 
  | 'planning' | 'active' | 'paused' | 'completed' | 'cancelled'  // Legacy
  | 'neu' | 'angebotserstellung' | 'vertrieb' | 'beauftragt' | 'verloren'  // das-programm.io
  | 'auftragserfuellung' | 'rechnung' | 'warten_auf_zahlung' | 'abgeschlossen';

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  
  // Status
  status: ProjectStatus;
  progress: number;
  
  // Zeitraum
  startDate: Date;
  endDate: Date;
  
  // Team
  members: ProjectMember[];
  resources: ProjectResource[];
  
  // Tasks
  tasks: ProjectTask[];
  
  // Einstellungen
  workingDays: number[]; // 0=Sonntag, 1=Montag, etc. [1,2,3,4,5] = Mo-Fr
  hoursPerDay: number;
  
  // Metadata
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Für gantt-task-react Kompatibilität
export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  type: 'task' | 'milestone' | 'project';
  dependencies?: string[];
  project?: string;
  hideChildren?: boolean;
  styles?: {
    backgroundColor?: string;
    backgroundSelectedColor?: string;
    progressColor?: string;
    progressSelectedColor?: string;
  };
  // Erweiterte Felder
  isCritical?: boolean;
  slack?: number;
}

// ============================================
// CRITICAL PATH ALGORITHM
// ============================================

export class CriticalPathCalculator {
  private tasks: ProjectTask[];
  private workingDays: number[];
  private hoursPerDay: number;

  constructor(tasks: ProjectTask[], workingDays: number[] = [1, 2, 3, 4, 5], hoursPerDay: number = 8) {
    this.tasks = tasks;
    this.workingDays = workingDays;
    this.hoursPerDay = hoursPerDay;
  }

  /**
   * Berechnet den kritischen Pfad für alle Tasks
   */
  calculate(): ProjectTask[] {
    if (this.tasks.length === 0) return [];

    // 1. Topologische Sortierung (für Forward Pass)
    const sortedTasks = this.topologicalSort();
    
    // 2. Forward Pass - Berechne Early Start (ES) und Early Finish (EF)
    this.forwardPass(sortedTasks);
    
    // 3. Backward Pass - Berechne Late Start (LS) und Late Finish (LF)
    this.backwardPass(sortedTasks);
    
    // 4. Berechne Slack und markiere kritische Tasks
    this.calculateSlack();
    
    return this.tasks;
  }

  /**
   * Topologische Sortierung basierend auf Dependencies
   */
  private topologicalSort(): ProjectTask[] {
    const visited = new Set<string>();
    const result: ProjectTask[] = [];
    const taskMap = new Map(this.tasks.map(t => [t.id, t]));

    const visit = (task: ProjectTask) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      // Besuche alle Vorgänger zuerst
      for (const dep of task.dependencies) {
        const predecessor = taskMap.get(dep.taskId);
        if (predecessor) {
          visit(predecessor);
        }
      }

      result.push(task);
    };

    for (const task of this.tasks) {
      visit(task);
    }

    return result;
  }

  /**
   * Forward Pass: Berechne früheste Start- und Endzeiten
   */
  private forwardPass(sortedTasks: ProjectTask[]): void {
    const taskMap = new Map(this.tasks.map(t => [t.id, t]));
    
    // Finde das früheste Projektdatum
    const projectStart = this.tasks.reduce((earliest, task) => {
      return task.startDate < earliest ? task.startDate : earliest;
    }, this.tasks[0].startDate);

    for (const task of sortedTasks) {
      if (task.dependencies.length === 0) {
        // Task ohne Vorgänger - startet am Projektanfang
        task.earlyStart = projectStart;
      } else {
        // Task mit Vorgängern - startet nach dem spätesten Vorgänger
        let maxEarlyFinish = projectStart;
        
        for (const dep of task.dependencies) {
          const predecessor = taskMap.get(dep.taskId);
          if (predecessor?.earlyFinish) {
            const depDate = this.addWorkingDays(predecessor.earlyFinish, dep.lag || 0);
            if (depDate > maxEarlyFinish) {
              maxEarlyFinish = depDate;
            }
          }
        }
        
        task.earlyStart = maxEarlyFinish;
      }
      
      // Early Finish = Early Start + Duration
      task.earlyFinish = this.addWorkingDays(task.earlyStart, task.duration);
    }
  }

  /**
   * Backward Pass: Berechne späteste Start- und Endzeiten
   */
  private backwardPass(sortedTasks: ProjectTask[]): void {
    const taskMap = new Map(this.tasks.map(t => [t.id, t]));
    
    // Finde das späteste Early Finish (= Projektende)
    const projectEnd = this.tasks.reduce((latest, task) => {
      return (task.earlyFinish && task.earlyFinish > latest) ? task.earlyFinish : latest;
    }, this.tasks[0].earlyFinish || new Date());

    // Reverse durchgehen
    const reversedTasks = [...sortedTasks].reverse();
    
    for (const task of reversedTasks) {
      // Finde alle Nachfolger
      const successors = this.tasks.filter(t => 
        t.dependencies.some(d => d.taskId === task.id)
      );
      
      if (successors.length === 0) {
        // Task ohne Nachfolger - endet am Projektende
        task.lateFinish = projectEnd;
      } else {
        // Task mit Nachfolgern - endet vor dem frühesten Nachfolger
        let minLateStart = projectEnd;
        
        for (const successor of successors) {
          if (successor.lateStart) {
            const dep = successor.dependencies.find(d => d.taskId === task.id);
            const depDate = this.subtractWorkingDays(successor.lateStart, dep?.lag || 0);
            if (depDate < minLateStart) {
              minLateStart = depDate;
            }
          }
        }
        
        task.lateFinish = minLateStart;
      }
      
      // Late Start = Late Finish - Duration
      task.lateStart = this.subtractWorkingDays(task.lateFinish, task.duration);
    }
  }

  /**
   * Berechne Slack (Float) und markiere kritische Tasks
   */
  private calculateSlack(): void {
    for (const task of this.tasks) {
      if (task.earlyStart && task.lateStart) {
        // Slack = Late Start - Early Start (in Arbeitstagen)
        task.slack = this.getWorkingDaysBetween(task.earlyStart, task.lateStart);
        task.isCritical = task.slack === 0;
      }
    }
  }

  /**
   * Addiert Arbeitstage zu einem Datum
   */
  private addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (this.workingDays.includes(result.getDay())) {
        addedDays++;
      }
    }
    
    return result;
  }

  /**
   * Subtrahiert Arbeitstage von einem Datum
   */
  private subtractWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let subtractedDays = 0;
    
    while (subtractedDays < days) {
      result.setDate(result.getDate() - 1);
      if (this.workingDays.includes(result.getDay())) {
        subtractedDays++;
      }
    }
    
    return result;
  }

  /**
   * Berechnet die Anzahl der Arbeitstage zwischen zwei Daten
   */
  private getWorkingDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    
    while (current < end) {
      if (this.workingDays.includes(current.getDay())) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Gibt alle Tasks auf dem kritischen Pfad zurück
   */
  getCriticalPath(): ProjectTask[] {
    return this.tasks.filter(t => t.isCritical);
  }

  /**
   * Berechnet die Gesamtprojektdauer
   */
  getProjectDuration(): number {
    const projectStart = this.tasks.reduce((earliest, task) => {
      return task.startDate < earliest ? task.startDate : earliest;
    }, this.tasks[0]?.startDate || new Date());

    const projectEnd = this.tasks.reduce((latest, task) => {
      return (task.earlyFinish && task.earlyFinish > latest) ? task.earlyFinish : latest;
    }, projectStart);

    return this.getWorkingDaysBetween(projectStart, projectEnd);
  }
}

// ============================================
// RESOURCE MANAGEMENT
// ============================================

export class ResourceManager {
  private tasks: ProjectTask[];
  private resources: ProjectResource[];

  constructor(tasks: ProjectTask[], resources: ProjectResource[]) {
    this.tasks = tasks;
    this.resources = resources;
  }

  /**
   * Berechnet die Auslastung einer Resource für einen bestimmten Tag
   */
  getResourceAllocation(resourceId: string, date: Date): number {
    let totalHours = 0;
    
    for (const task of this.tasks) {
      if (!task.assignedTo.includes(resourceId)) continue;
      if (date < task.startDate || date > task.endDate) continue;
      
      const allocation = task.resourceAllocation?.[resourceId] || 8;
      totalHours += allocation;
    }
    
    return totalHours;
  }

  /**
   * Prüft ob eine Resource überlastet ist
   */
  isResourceOverloaded(resourceId: string, date: Date): boolean {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) return false;
    
    const allocation = this.getResourceAllocation(resourceId, date);
    return allocation > resource.capacity;
  }

  /**
   * Gibt alle Überlastungen für einen Zeitraum zurück
   */
  getOverloadedDays(resourceId: string, startDate: Date, endDate: Date): Date[] {
    const overloadedDays: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (this.isResourceOverloaded(resourceId, current)) {
        overloadedDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return overloadedDays;
  }

  /**
   * Berechnet die Gesamtauslastung einer Resource in Prozent
   */
  getResourceUtilization(resourceId: string, startDate: Date, endDate: Date): number {
    const resource = this.resources.find(r => r.id === resourceId);
    if (!resource) return 0;
    
    let totalAllocated = 0;
    let totalCapacity = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      // Nur Arbeitstage zählen (Mo-Fr)
      if (current.getDay() >= 1 && current.getDay() <= 5) {
        totalAllocated += this.getResourceAllocation(resourceId, current);
        totalCapacity += resource.capacity;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;
  }

  /**
   * Gibt eine Übersicht aller Resources mit Auslastung zurück
   */
  getResourceOverview(startDate: Date, endDate: Date): Array<{
    resource: ProjectResource;
    utilization: number;
    overloadedDays: number;
    assignedTasks: number;
  }> {
    return this.resources.map(resource => ({
      resource,
      utilization: this.getResourceUtilization(resource.id, startDate, endDate),
      overloadedDays: this.getOverloadedDays(resource.id, startDate, endDate).length,
      assignedTasks: this.tasks.filter(t => t.assignedTo.includes(resource.id)).length,
    }));
  }
}

// ============================================
// PROJECT SERVICE (Firestore Integration)
// ============================================

class ProjectServiceClass {
  /**
   * Generiert die nächste eindeutige Projektnummer für das aktuelle Jahr
   * Format: P-{Jahr}-{fortlaufende Nummer}
   */
  async getNextProjectNumber(companyId: string): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const prefix = `P-${year}-`;
      
      // Alle Projekte laden um die höchste Nummer zu finden
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const snapshot = await getDocs(projectsRef);
      
      let maxNumber = 0;
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const projectNumber = data.projectNumber as string | undefined;
        
        if (projectNumber && projectNumber.startsWith(prefix)) {
          const numPart = projectNumber.replace(prefix, '');
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      // Nächste Nummer generieren
      const nextNumber = maxNumber + 1;
      return `${prefix}${nextNumber}`;
    } catch (error) {
      // Fallback: Zufällige Nummer falls Fehler
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 1000) + 1;
      return `P-${year}-${randomNum}`;
    }
  }

  /**
   * Alle Projekte einer Firma laden (Company-Subcollection Pattern)
   */
  async getProjects(companyId: string): Promise<Project[]> {
    try {
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const q = query(projectsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return [];
      
      const projects: Project[] = snapshot.docs.map(docSnap => 
        this.parseProject(docSnap.id, docSnap.data(), companyId)
      );
      
      return projects;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Ein einzelnes Projekt laden
   */
  async getProject(companyId: string, projectId: string): Promise<Project | null> {
    try {
      const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
      const snapshot = await getDoc(projectRef);
      
      if (!snapshot.exists()) return null;
      
      return this.parseProject(projectId, snapshot.data(), companyId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Neues Projekt erstellen
   */
  async createProject(companyId: string, projectData: Partial<Project>, userId: string): Promise<string> {
    try {
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      
      const project = {
        name: projectData.name || 'Neues Projekt',
        description: projectData.description || '',
        color: projectData.color || '#14ad9f',
        status: 'planning',
        progress: 0,
        startDate: Timestamp.fromDate(projectData.startDate || new Date()),
        endDate: Timestamp.fromDate(projectData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        members: projectData.members || [],
        resources: projectData.resources || [],
        tasks: projectData.tasks || [],
        workingDays: projectData.workingDays || [1, 2, 3, 4, 5],
        hoursPerDay: projectData.hoursPerDay || 8,
        companyId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
      };

      const docRef = await addDoc(projectsRef, project);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Projekt aktualisieren
   */
  async updateProject(companyId: string, projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
      
      const serializedUpdates: Record<string, unknown> = {
        ...updates,
        updatedAt: Timestamp.now(),
      };
      
      if (updates.startDate) {
        serializedUpdates.startDate = Timestamp.fromDate(updates.startDate);
      }
      if (updates.endDate) {
        serializedUpdates.endDate = Timestamp.fromDate(updates.endDate);
      }
      
      // Tasks mit Timestamps serialisieren
      if (updates.tasks) {
        serializedUpdates.tasks = updates.tasks.map(task => ({
          ...task,
          startDate: task.startDate instanceof Date ? Timestamp.fromDate(task.startDate) : task.startDate,
          endDate: task.endDate instanceof Date ? Timestamp.fromDate(task.endDate) : task.endDate,
          createdAt: task.createdAt instanceof Date ? Timestamp.fromDate(task.createdAt) : task.createdAt,
          updatedAt: Timestamp.now(),
        }));
      }
      
      await updateDoc(projectRef, serializedUpdates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Task zu einem Projekt hinzufügen
   */
  async addTask(companyId: string, projectId: string, task: Partial<ProjectTask>, userId: string): Promise<string> {
    try {
      const project = await this.getProject(companyId, projectId);
      if (!project) throw new Error('Projekt nicht gefunden');

      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newTask: ProjectTask = {
        id: taskId,
        name: task.name || 'Neue Aufgabe',
        description: task.description || '',
        type: task.type || 'task',
        startDate: task.startDate || new Date(),
        endDate: task.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: task.duration || 5,
        progress: task.progress || 0,
        parentId: task.parentId,
        order: project.tasks.length,
        dependencies: task.dependencies || [],
        assignedTo: task.assignedTo || [],
        color: task.color,
        priority: task.priority || 'medium',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
      };

      const updatedTasks = [...project.tasks, newTask];
      
      await this.updateProject(companyId, projectId, { 
        tasks: updatedTasks,
        progress: this.calculateProjectProgress(updatedTasks),
      });

      return taskId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Task aktualisieren
   */
  async updateTask(companyId: string, projectId: string, taskId: string, updates: Partial<ProjectTask>): Promise<void> {
    try {
      const project = await this.getProject(companyId, projectId);
      if (!project) throw new Error('Projekt nicht gefunden');

      const updatedTasks = project.tasks.map(task => 
        task.id === taskId 
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      );

      await this.updateProject(companyId, projectId, { 
        tasks: updatedTasks,
        progress: this.calculateProjectProgress(updatedTasks),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Task löschen
   */
  async deleteTask(companyId: string, projectId: string, taskId: string): Promise<void> {
    try {
      const project = await this.getProject(companyId, projectId);
      if (!project) throw new Error('Projekt nicht gefunden');

      // Entferne auch alle Dependencies zu diesem Task
      const updatedTasks = project.tasks
        .filter(task => task.id !== taskId)
        .map(task => ({
          ...task,
          dependencies: task.dependencies.filter(d => d.taskId !== taskId),
        }));

      await this.updateProject(companyId, projectId, { 
        tasks: updatedTasks,
        progress: this.calculateProjectProgress(updatedTasks),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Dependency hinzufügen
   */
  async addDependency(
    companyId: string,
    projectId: string, 
    taskId: string, 
    dependency: TaskDependency
  ): Promise<void> {
    try {
      const project = await this.getProject(companyId, projectId);
      if (!project) throw new Error('Projekt nicht gefunden');

      const task = project.tasks.find(t => t.id === taskId);
      if (!task) throw new Error('Task nicht gefunden');

      // Prüfe auf zirkuläre Abhängigkeiten
      if (this.wouldCreateCycle(project.tasks, taskId, dependency.taskId)) {
        throw new Error('Diese Abhängigkeit würde einen Zyklus erzeugen');
      }

      const updatedDependencies = [...task.dependencies, dependency];
      await this.updateTask(companyId, projectId, taskId, { dependencies: updatedDependencies });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Projekt löschen
   */
  async deleteProject(companyId: string, projectId: string): Promise<void> {
    try {
      const projectRef = doc(db, 'companies', companyId, 'projects', projectId);
      await deleteDoc(projectRef);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Critical Path berechnen
   */
  calculateCriticalPath(project: Project): ProjectTask[] {
    const calculator = new CriticalPathCalculator(
      project.tasks,
      project.workingDays,
      project.hoursPerDay
    );
    return calculator.calculate();
  }

  /**
   * Resource Auslastung berechnen
   */
  getResourceUtilization(project: Project): ReturnType<ResourceManager['getResourceOverview']> {
    const manager = new ResourceManager(project.tasks, project.resources);
    return manager.getResourceOverview(project.startDate, project.endDate);
  }

  /**
   * Konvertiert Tasks zu gantt-task-react Format
   */
  toGanttTasks(tasks: ProjectTask[]): GanttTask[] {
    return tasks.map(task => ({
      id: task.id,
      name: task.name,
      start: task.startDate,
      end: task.endDate,
      progress: task.progress,
      type: task.type,
      dependencies: task.dependencies.map(d => d.taskId),
      project: task.parentId,
      isCritical: task.isCritical,
      slack: task.slack,
      styles: task.isCritical ? {
        backgroundColor: '#ef4444',
        backgroundSelectedColor: '#dc2626',
        progressColor: '#b91c1c',
        progressSelectedColor: '#991b1b',
      } : task.color ? {
        backgroundColor: task.color,
      } : undefined,
    }));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private parseProject(id: string, data: any, companyId: string): Project {
    // Firestore Timestamps zu Date konvertieren
    const toDate = (val: any): Date => {
      if (!val) return new Date();
      if (val.toDate) return val.toDate(); // Firestore Timestamp
      if (val instanceof Date) return val;
      return new Date(val);
    };

    return {
      id,
      ...data,
      companyId,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
      tasks: (data.tasks || []).map((task: any) => ({
        ...task,
        startDate: toDate(task.startDate),
        endDate: toDate(task.endDate),
        createdAt: toDate(task.createdAt),
        updatedAt: toDate(task.updatedAt),
        earlyStart: task.earlyStart ? toDate(task.earlyStart) : undefined,
        earlyFinish: task.earlyFinish ? toDate(task.earlyFinish) : undefined,
        lateStart: task.lateStart ? toDate(task.lateStart) : undefined,
        lateFinish: task.lateFinish ? toDate(task.lateFinish) : undefined,
      })),
    };
  }

  private calculateProjectProgress(tasks: ProjectTask[]): number {
    if (tasks.length === 0) return 0;
    
    const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
    const completedDuration = tasks.reduce((sum, t) => sum + (t.duration * t.progress / 100), 0);
    
    return totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 100) : 0;
  }

  private wouldCreateCycle(tasks: ProjectTask[], taskId: string, predecessorId: string): boolean {
    // DFS um Zyklen zu erkennen
    const visited = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    const hasCycle = (currentId: string): boolean => {
      if (currentId === taskId) return true;
      if (visited.has(currentId)) return false;
      
      visited.add(currentId);
      const task = taskMap.get(currentId);
      
      if (!task) return false;
      
      for (const dep of task.dependencies) {
        if (hasCycle(dep.taskId)) return true;
      }
      
      return false;
    };
    
    return hasCycle(predecessorId);
  }
}

export const ProjectService = new ProjectServiceClass();
