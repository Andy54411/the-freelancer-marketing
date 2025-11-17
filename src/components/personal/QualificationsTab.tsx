'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GraduationCap, Award, Languages, Briefcase } from 'lucide-react';
import { Employee } from '@/services/personalService';

interface QualificationsTabProps {
  employee: Employee | null;
  isEditing: boolean;
  onUpdate: (updates: Partial<Employee>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  grade?: string;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

interface Language {
  id: string;
  language: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
}

interface Skill {
  id: string;
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  category: 'Technical' | 'Soft Skills' | 'Industry' | 'Other';
}

export default function QualificationsTab({
  employee,
  isEditing,
  onUpdate,
  onSave,
  onCancel,
  onEdit,
}: QualificationsTabProps) {
  const [education, setEducation] = useState<Education[]>(
    employee?.qualifications?.education || []
  );
  const [certifications, setCertifications] = useState<Certification[]>(
    employee?.qualifications?.certifications || []
  );
  const [languages, setLanguages] = useState<Language[]>(employee?.qualifications?.languages || []);
  const [skills, setSkills] = useState<Skill[]>(employee?.qualifications?.skills || []);

  // Education Management
  const addEducation = () => {
    const newEducation: Education = {
      id: Date.now().toString(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      grade: '',
    };
    setEducation([...education, newEducation]);
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setEducation(education.map(edu => (edu.id === id ? { ...edu, [field]: value } : edu)));
  };

  const removeEducation = (id: string) => {
    setEducation(education.filter(edu => edu.id !== id));
  };

  // Certification Management
  const addCertification = () => {
    const newCert: Certification = {
      id: Date.now().toString(),
      name: '',
      issuer: '',
      issueDate: '',
      expiryDate: '',
      credentialId: '',
    };
    setCertifications([...certifications, newCert]);
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    setCertifications(
      certifications.map(cert => (cert.id === id ? { ...cert, [field]: value } : cert))
    );
  };

  const removeCertification = (id: string) => {
    setCertifications(certifications.filter(cert => cert.id !== id));
  };

  // Language Management
  const addLanguage = () => {
    const newLang: Language = {
      id: Date.now().toString(),
      language: '',
      level: 'A1',
    };
    setLanguages([...languages, newLang]);
  };

  const updateLanguage = (id: string, field: keyof Language, value: string) => {
    setLanguages(languages.map(lang => (lang.id === id ? { ...lang, [field]: value } : lang)));
  };

  const removeLanguage = (id: string) => {
    setLanguages(languages.filter(lang => lang.id !== id));
  };

  // Skills Management
  const addSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: '',
      level: 'Beginner',
      category: 'Technical',
    };
    setSkills([...skills, newSkill]);
  };

  const updateSkill = (id: string, field: keyof Skill, value: string) => {
    setSkills(skills.map(skill => (skill.id === id ? { ...skill, [field]: value } : skill)));
  };

  const removeSkill = (id: string) => {
    setSkills(skills.filter(skill => skill.id !== id));
  };

  const handleSave = () => {
    onUpdate({
      qualifications: {
        education,
        certifications,
        languages,
        skills,
      },
    });
    onSave();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Expert':
      case 'C2':
      case 'Native':
        return 'bg-[#14ad9f] text-white';
      case 'Advanced':
      case 'C1':
      case 'B2':
        return 'bg-green-100 text-green-800';
      case 'Intermediate':
      case 'B1':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!employee) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-gray-500">Mitarbeiter nicht gefunden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ausbildung */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#14ad9f]" />
            Ausbildung & Studium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {education.map(edu => (
            <div key={edu.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={edu.institution}
                      onChange={e => updateEducation(edu.id, 'institution', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Universität/Schule"
                    />
                  </div>
                  <div>
                    <Label>Abschluss</Label>
                    <Input
                      value={edu.degree}
                      onChange={e => updateEducation(edu.id, 'degree', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Bachelor, Master, Ausbildung..."
                    />
                  </div>
                  <div>
                    <Label>Fachrichtung</Label>
                    <Input
                      value={edu.field}
                      onChange={e => updateEducation(edu.id, 'field', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Informatik, BWL, etc."
                    />
                  </div>
                  <div>
                    <Label>Note (optional)</Label>
                    <Input
                      value={edu.grade || ''}
                      onChange={e => updateEducation(edu.id, 'grade', e.target.value)}
                      disabled={!isEditing}
                      placeholder="1,5 / Sehr gut"
                    />
                  </div>
                  <div>
                    <Label>Von</Label>
                    <Input
                      type="date"
                      value={edu.startDate}
                      onChange={e => updateEducation(edu.id, 'startDate', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Bis</Label>
                    <Input
                      type="date"
                      value={edu.endDate}
                      onChange={e => updateEducation(edu.id, 'endDate', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEducation(edu.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isEditing && (
            <Button variant="outline" onClick={addEducation} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Ausbildung hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Zertifikate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#14ad9f]" />
            Zertifikate & Weiterbildungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {certifications.map(cert => (
            <div key={cert.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label>Zertifikat</Label>
                    <Input
                      value={cert.name}
                      onChange={e => updateCertification(cert.id, 'name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="AWS Certified Developer"
                    />
                  </div>
                  <div>
                    <Label>Aussteller</Label>
                    <Input
                      value={cert.issuer}
                      onChange={e => updateCertification(cert.id, 'issuer', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Amazon Web Services"
                    />
                  </div>
                  <div>
                    <Label>Ausstellungsdatum</Label>
                    <Input
                      type="date"
                      value={cert.issueDate}
                      onChange={e => updateCertification(cert.id, 'issueDate', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Ablaufdatum (optional)</Label>
                    <Input
                      type="date"
                      value={cert.expiryDate || ''}
                      onChange={e => updateCertification(cert.id, 'expiryDate', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Zertifikat-ID (optional)</Label>
                    <Input
                      value={cert.credentialId || ''}
                      onChange={e => updateCertification(cert.id, 'credentialId', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Eindeutige Zertifikat-Nummer"
                    />
                  </div>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCertification(cert.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isEditing && (
            <Button variant="outline" onClick={addCertification} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Zertifikat hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sprachen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-[#14ad9f]" />
            Sprachkenntnisse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {languages.map(lang => (
            <div key={lang.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label>Sprache</Label>
                    <Input
                      value={lang.language}
                      onChange={e => updateLanguage(lang.id, 'language', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Deutsch, Englisch, Französisch..."
                    />
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Select
                      value={lang.level}
                      onValueChange={value => updateLanguage(lang.id, 'level', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A1">A1 - Anfänger</SelectItem>
                        <SelectItem value="A2">A2 - Grundlegende Kenntnisse</SelectItem>
                        <SelectItem value="B1">B1 - Fortgeschrittene Sprachverwendung</SelectItem>
                        <SelectItem value="B2">B2 - Selbständige Sprachverwendung</SelectItem>
                        <SelectItem value="C1">C1 - Fachkundige Sprachkenntnisse</SelectItem>
                        <SelectItem value="C2">
                          C2 - Annähernd muttersprachliche Kenntnisse
                        </SelectItem>
                        <SelectItem value="Native">Muttersprache</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getLevelColor(lang.level)}>{lang.level}</Badge>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLanguage(lang.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isEditing && (
            <Button variant="outline" onClick={addLanguage} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Sprache hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Fähigkeiten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#14ad9f]" />
            Fähigkeiten & Kompetenzen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skills.map(skill => (
            <div key={skill.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  <div>
                    <Label>Fähigkeit</Label>
                    <Input
                      value={skill.name}
                      onChange={e => updateSkill(skill.id, 'name', e.target.value)}
                      disabled={!isEditing}
                      placeholder="JavaScript, Projektmanagement..."
                    />
                  </div>
                  <div>
                    <Label>Kategorie</Label>
                    <Select
                      value={skill.category}
                      onValueChange={value => updateSkill(skill.id, 'category', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technical">Technisch</SelectItem>
                        <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                        <SelectItem value="Industry">Branchenspezifisch</SelectItem>
                        <SelectItem value="Other">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Select
                      value={skill.level}
                      onValueChange={value => updateSkill(skill.id, 'level', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Anfänger</SelectItem>
                        <SelectItem value="Intermediate">Fortgeschritten</SelectItem>
                        <SelectItem value="Advanced">Erfahren</SelectItem>
                        <SelectItem value="Expert">Experte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getLevelColor(skill.level)}>{skill.level}</Badge>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSkill(skill.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isEditing && (
            <Button variant="outline" onClick={addSkill} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" />
              Fähigkeit hinzufügen
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isEditing ? (
        <div className="flex gap-3">
          <Button onClick={handleSave} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
            Speichern
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button onClick={onEdit} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
          Bearbeiten
        </Button>
      )}
    </div>
  );
}
