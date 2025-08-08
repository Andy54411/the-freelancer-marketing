'use client';

import React, { useState } from 'react';
import { ProfileTabProps } from './types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, GraduationCap, Award } from 'lucide-react';

const SkillsEducationTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Grundkenntnisse' });
  const [newEducation, setNewEducation] = useState({ school: '', degree: '', year: '' });
  const [newCertification, setNewCertification] = useState({ name: '', from: '', year: '' });

  // Skills Management
  const addSkill = () => {
    if (!newSkill.trim() || !profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            skills: [...(prev.skills || []), newSkill.trim()],
          }
        : null
    );
    setNewSkill('');
  };

  const removeSkill = (index: number) => {
    if (!profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            skills: prev.skills?.filter((_, i) => i !== index) || [],
          }
        : null
    );
  };

  // Languages Management
  const addLanguage = () => {
    if (!newLanguage.language.trim() || !profile) return;

    setProfile(prev => {
      if (!prev) return null;

      // Ensure languages is always an object array
      const currentLanguages = prev.languages || [];
      const normalizedLanguages = currentLanguages.map(lang =>
        typeof lang === 'string' ? { language: lang, proficiency: 'Grundkenntnisse' } : lang
      ) as { language: string; proficiency: string }[];

      return {
        ...prev,
        languages: [...normalizedLanguages, { ...newLanguage }],
      };
    });
    setNewLanguage({ language: '', proficiency: 'Grundkenntnisse' });
  };

  const removeLanguage = (index: number) => {
    if (!profile) return;

    setProfile(prev => {
      if (!prev) return null;

      // Ensure languages is always an object array
      const currentLanguages = prev.languages || [];
      const normalizedLanguages = currentLanguages.map(lang =>
        typeof lang === 'string' ? { language: lang, proficiency: 'Grundkenntnisse' } : lang
      ) as { language: string; proficiency: string }[];

      return {
        ...prev,
        languages: normalizedLanguages.filter((_, i) => i !== index),
      };
    });
  };

  // Education Management
  const addEducation = () => {
    if (!newEducation.school.trim() || !newEducation.degree.trim() || !profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            education: [...(prev.education || []), { ...newEducation }],
          }
        : null
    );
    setNewEducation({ school: '', degree: '', year: '' });
  };

  const removeEducation = (index: number) => {
    if (!profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            education: prev.education?.filter((_, i) => i !== index) || [],
          }
        : null
    );
  };

  // Certification Management
  const addCertification = () => {
    if (!newCertification.name.trim() || !newCertification.from.trim() || !profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            certifications: [...(prev.certifications || []), { ...newCertification }],
          }
        : null
    );
    setNewCertification({ name: '', from: '', year: '' });
  };

  const removeCertification = (index: number) => {
    if (!profile) return;

    setProfile(prev =>
      prev
        ? {
            ...prev,
            certifications: prev.certifications?.filter((_, i) => i !== index) || [],
          }
        : null
    );
  };

  const proficiencyLevels = ['Grundkenntnisse', 'Fortgeschritten', 'Fließend', 'Muttersprache'];

  return (
    <div className="space-y-8">
      {/* Skills */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-[#14ad9f]" />
          Fähigkeiten
        </h3>

        {/* Add new skill */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSkill}
            onChange={e => setNewSkill(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addSkill()}
            placeholder="Neue Fähigkeit hinzufügen..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
          <Button onClick={addSkill} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Skills list */}
        <div className="flex flex-wrap gap-2">
          {profile?.skills?.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#14ad9f] text-white"
            >
              {skill}
              <button onClick={() => removeSkill(index)} className="ml-2 hover:text-red-200">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprachen</h3>

        {/* Add new language */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input
            type="text"
            value={newLanguage.language}
            onChange={e => setNewLanguage(prev => ({ ...prev, language: e.target.value }))}
            placeholder="Sprache..."
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          />
          <select
            value={newLanguage.proficiency}
            onChange={e => setNewLanguage(prev => ({ ...prev, proficiency: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
          >
            {proficiencyLevels.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <Button onClick={addLanguage} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Hinzufügen
          </Button>
        </div>

        {/* Languages list */}
        <div className="space-y-2">
          {profile?.languages?.map((lang, index) => {
            // Handle both string and object formats
            const languageData =
              typeof lang === 'string' ? { language: lang, proficiency: 'Grundkenntnisse' } : lang;

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <span className="font-medium">{languageData.language}</span>
                  <span className="ml-2 text-sm text-gray-600">({languageData.proficiency})</span>
                </div>
                <button
                  onClick={() => removeLanguage(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Education */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <GraduationCap className="w-5 h-5 mr-2 text-[#14ad9f]" />
          Ausbildung
        </h3>

        {/* Add new education */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              value={newEducation.school}
              onChange={e => setNewEducation(prev => ({ ...prev, school: e.target.value }))}
              placeholder="Bildungseinrichtung..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
            <input
              type="text"
              value={newEducation.degree}
              onChange={e => setNewEducation(prev => ({ ...prev, degree: e.target.value }))}
              placeholder="Abschluss/Qualifikation..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
            <input
              type="text"
              value={newEducation.year}
              onChange={e => setNewEducation(prev => ({ ...prev, year: e.target.value }))}
              placeholder="Jahr (z.B. 2020)..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
          <Button onClick={addEducation} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Ausbildung hinzufügen
          </Button>
        </Card>

        {/* Education list */}
        <div className="space-y-3">
          {profile?.education?.map((edu, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                  <p className="text-sm text-gray-600">{edu.school}</p>
                  {edu.year && <p className="text-sm text-gray-500">{edu.year}</p>}
                </div>
                <button
                  onClick={() => removeEducation(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-[#14ad9f]" />
          Zertifizierungen
        </h3>

        {/* Add new certification */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              value={newCertification.name}
              onChange={e => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Zertifikat-Name..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
            <input
              type="text"
              value={newCertification.from}
              onChange={e => setNewCertification(prev => ({ ...prev, from: e.target.value }))}
              placeholder="Ausstellende Organisation..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
            <input
              type="text"
              value={newCertification.year}
              onChange={e => setNewCertification(prev => ({ ...prev, year: e.target.value }))}
              placeholder="Jahr (z.B. 2023)..."
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
          <Button onClick={addCertification} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Zertifizierung hinzufügen
          </Button>
        </Card>

        {/* Certifications list */}
        <div className="space-y-3">
          {profile?.certifications?.map((cert, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{cert.name}</h4>
                  <p className="text-sm text-gray-600">{cert.from}</p>
                  {cert.year && <p className="text-sm text-gray-500">{cert.year}</p>}
                </div>
                <button
                  onClick={() => removeCertification(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillsEducationTab;
