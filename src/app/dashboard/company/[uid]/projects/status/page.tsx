'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Folder,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Table,
  FolderKanban,
} from 'lucide-react';
import Link from 'next/link';
import { ProjectService, type Project } from '@/services/ProjectService';

// Status-Spalten Konfiguration wie bei das-programm.io
const STATUS_COLUMNS = [
  { id: 'neu', label: 'neu', color: 'bg-blue-500' },
  { id: 'angebotserstellung', label: 'Angebotserstellung', color: 'bg-purple-500' },
  { id: 'vertrieb', label: 'Vertrieb', color: 'bg-indigo-500' },
  { id: 'beauftragt', label: 'beauftragt', color: 'bg-teal-500' },
  { id: 'verloren', label: 'verloren', color: 'bg-red-500' },
  { id: 'auftragserfuellung', label: 'Auftragserfüllung', color: 'bg-yellow-500' },
  { id: 'rechnung', label: 'Rechnung', color: 'bg-orange-500' },
  { id: 'warten_auf_zahlung', label: 'warten auf Zahlungseingang', color: 'bg-amber-500' },
  { id: 'abgeschlossen', label: 'abgeschlossen', color: 'bg-green-500' },
];

interface ProjectCard {
  id: string;
  name: string;
  number: string;
  customer?: string;
  status: string;
  progress: number;
  startDate: Date;
  endDate: Date;
}

export default function ProjectStatusPage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedProject, setDraggedProject] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const projectList = await ProjectService.getProjects(uid);
      setProjects(projectList);
    } catch {
      // Fehler silent ignorieren
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Projekte nach Status gruppieren
  const getProjectsByStatus = (statusId: string): Project[] => {
    return projects.filter(p => {
      const matchesStatus = p.status === statusId;
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  };

  // Drag & Drop Handler
  const handleDragStart = (projectId: string) => {
    setDraggedProject(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedProject) return;

    try {
      await ProjectService.updateProject(uid, draggedProject, { 
        status: newStatus as Project['status'] 
      });
      
      // Lokales Update
      setProjects(prev => prev.map(p => 
        p.id === draggedProject ? { ...p, status: newStatus as Project['status'] } : p
      ));
    } catch {
      // Fehler silent ignorieren
    }
    
    setDraggedProject(null);
  };

  // Projekt-Nummer generieren (P-YYYY-XXX Format)
  const getProjectNumber = (project: Project): string => {
    const year = project.createdAt.getFullYear();
    const index = projects.indexOf(project) + 1;
    return `P-${year}-${index.toString().padStart(3, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Status Ansicht</h1>
          </div>
        </div>
        
        <button
          onClick={() => router.push(`/dashboard/company/${uid}/projects`)}
          className="p-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors"
          title="Tabellenansicht"
        >
          <Table className="w-5 h-5" />
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6 bg-white">
        <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
          {STATUS_COLUMNS.map((column) => {
            const columnProjects = getProjectsByStatus(column.id);
            
            return (
              <div
                key={column.id}
                className="w-72 shrink-0 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Spalten-Header - grauer Balken wie bei das-programm.io */}
                <div className="bg-gray-100 rounded-t-lg px-4 py-3">
                  <span className="font-medium text-gray-900">{column.label}</span>
                </div>

                {/* Projekt-Karten */}
                <div className="flex-1 bg-white border border-gray-200 border-t-0 rounded-b-lg p-3 space-y-3 min-h-[400px]">
                  {columnProjects.map((project) => (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={() => handleDragStart(project.id)}
                      className={`border-b border-gray-100 pb-3 last:border-b-0 cursor-grab active:cursor-grabbing ${
                        draggedProject === project.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <FolderKanban className="w-4 h-4 text-[#14ad9f] mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={`/dashboard/company/${uid}/projects/${project.id}`}
                            className="text-sm text-[#14ad9f] hover:underline leading-tight"
                          >
                            {project.name}
                            {project.description && ` - ${project.description}`}
                            {` (${getProjectNumber(project)})`}
                          </Link>
                          {project.members.length > 0 && (
                            <p className="text-sm text-gray-600 mt-0.5">
                              {project.members[0]?.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Leerer Zustand */}
                  {columnProjects.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                      <FolderKanban className="w-16 h-16 mb-2 opacity-30" />
                      <p className="text-sm">Keine Projekte</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
