'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Users, Plus, X, Search, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FREELANCER' | 'INTERN';
  isActive: boolean;
  avatar?: string;
  hourlyRate?: number;
}

interface Project {
  id: string;
  name: string;
  teamMembers: string[];
  companyId: string;
}

interface ProjectTeamManagementProps {
  project: Project;
  onProjectUpdate: (updatedProject: any) => void;
  companyId: string;
}

export const ProjectTeamManagement: React.FC<ProjectTeamManagementProps> = ({
  project,
  onProjectUpdate,
  companyId,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [companyId]);

  useEffect(() => {
    if (employees.length > 0) {
      updateTeamMembersAndAvailable();
    }
  }, [employees, project.teamMembers]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      // Verwende den PersonalService falls verfügbar, ansonsten direkte Firestore-Abfrage
      try {
        const { PersonalService } = await import('@/services/personalService');
        const employeeData = await PersonalService.getEmployees(companyId);
        // Mappe die Service-Employee auf lokale Employee-Struktur
        const mappedEmployees = employeeData
          .filter(emp => emp.isActive && emp.id) // Nur aktive Mitarbeiter mit ID
          .map(emp => ({
            id: emp.id!, // Non-null assertion da wir oben filtern
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            position: emp.position,
            department: emp.department,
            employmentType: emp.employmentType,
            isActive: emp.isActive,
            avatar: emp.avatar,
            hourlyRate: emp.hourlyRate,
          }));
        setEmployees(mappedEmployees);
      } catch (error) {
        // Fallback auf direkte Firestore-Abfrage
        console.error('Error loading employees:', error);
        const employeesQuery = query(
          collection(db, 'employees'),
          where('companyId', '==', companyId),
          where('isActive', '==', true)
        );

        const querySnapshot = await getDocs(employeesQuery);
        const employeeData: Employee[] = [];

        querySnapshot.forEach(doc => {
          const data = doc.data();
          employeeData.push({
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            position: data.position || '',
            department: data.department || '',
            employmentType: data.employmentType || 'FULL_TIME',
            isActive: data.isActive || false,
            avatar: data.avatar,
            hourlyRate: data.hourlyRate,
          });
        });

        setEmployees(employeeData);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  const updateTeamMembersAndAvailable = useCallback(async () => {
    if (!project.teamMembers || project.teamMembers.length === 0) {
      setAvailableEmployees(employees);
      return;
    }

    const teamMemberIds = new Set(project.teamMembers);
    const available = employees.filter(emp => !teamMemberIds.has(emp.id));
    setAvailableEmployees(available);
  }, [project.teamMembers, employees]);

  const addTeamMember = async (employee: Employee) => {
    try {
      const updatedTeamMembers = [...project.teamMembers, employee.id];

      // Update im Firestore
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        teamMembers: updatedTeamMembers,
        updatedAt: new Date(),
      });

      // Update lokaler State
      const updatedProject = {
        ...project,
        teamMembers: updatedTeamMembers,
      };

      onProjectUpdate(updatedProject);
      toast.success(`${employee.firstName} ${employee.lastName} wurde zum Team hinzugefügt`);
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Teammitglieds:', error);
      toast.error('Fehler beim Hinzufügen des Teammitglieds');
    }
  };

  const removeTeamMember = async (employee: Employee) => {
    try {
      const updatedTeamMembers = project.teamMembers.filter(id => id !== employee.id);

      // Update im Firestore
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        teamMembers: updatedTeamMembers,
        updatedAt: new Date(),
      });

      // Update lokaler State
      const updatedProject = {
        ...project,
        teamMembers: updatedTeamMembers,
      };

      onProjectUpdate(updatedProject);
      toast.success(`${employee.firstName} ${employee.lastName} wurde aus dem Team entfernt`);
    } catch (error) {
      console.error('Fehler beim Entfernen des Teammitglieds:', error);
      toast.error('Fehler beim Entfernen des Teammitglieds');
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Vollzeit';
      case 'PART_TIME':
        return 'Teilzeit';
      case 'FREELANCER':
        return 'Freelancer';
      case 'INTERN':
        return 'Praktikant';
      default:
        return type;
    }
  };

  const getEmploymentTypeColor = (type: string) => {
    switch (type) {
      case 'FULL_TIME':
        return 'bg-green-100 text-green-800';
      case 'PART_TIME':
        return 'bg-blue-100 text-blue-800';
      case 'FREELANCER':
        return 'bg-purple-100 text-purple-800';
      case 'INTERN':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAvailableEmployees = availableEmployees.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.position} ${emp.department}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-[#14ad9f]" />
            Team-Mitglieder ({teamMembers.length})
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Mitarbeiter hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Mitarbeiter zum Team hinzufügen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Mitarbeiter suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
                      <p className="text-gray-500 mt-2">Lade Mitarbeiter...</p>
                    </div>
                  ) : filteredAvailableEmployees.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm
                          ? 'Keine Mitarbeiter gefunden'
                          : 'Alle Mitarbeiter sind bereits im Team'}
                      </p>
                    </div>
                  ) : (
                    filteredAvailableEmployees.map(employee => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#14ad9f] bg-opacity-10 rounded-full flex items-center justify-center">
                            <span className="text-[#14ad9f] font-medium">
                              {employee.firstName[0]}
                              {employee.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{employee.position}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-400">{employee.department}</span>
                              <Badge
                                className={`text-xs ${getEmploymentTypeColor(employee.employmentType)}`}
                              >
                                {getEmploymentTypeLabel(employee.employmentType)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            addTeamMember(employee);
                            setShowAddDialog(false);
                            setSearchTerm('');
                          }}
                          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Hinzufügen
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>Team-Mitglieder die an diesem Projekt arbeiten</CardDescription>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Noch keine Team-Mitglieder zugewiesen</p>
            <p className="text-sm mt-1">Fügen Sie Mitarbeiter zum Projekt hinzu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#14ad9f] bg-opacity-10 rounded-full flex items-center justify-center">
                    <span className="text-[#14ad9f] font-medium">
                      {member.firstName[0]}
                      {member.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{member.position}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-400">{member.department}</span>
                      <Badge className={`text-xs ${getEmploymentTypeColor(member.employmentType)}`}>
                        {getEmploymentTypeLabel(member.employmentType)}
                      </Badge>
                      {member.hourlyRate && (
                        <span className="text-xs text-[#14ad9f] font-medium">
                          {member.hourlyRate}€/h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeTeamMember(member)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectTeamManagement;
