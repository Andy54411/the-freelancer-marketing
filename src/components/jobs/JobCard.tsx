import React from 'react';
import { MapPin, Clock, Calendar, Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { JobPosting } from '@/types/career';
import { useJobFavorites } from '@/hooks/useJobFavorites';
import { useAuth } from '@/contexts/AuthContext';

interface JobCardProps {
  job: JobPosting;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useJobFavorites(job.id);

  const jobLink = user ? `/dashboard/user/${user.uid}/career/jobs/${job.id}` : `/jobs/${job.id}`;

  const jobTypeTranslations: Record<string, string> = {
    'full-time': 'Vollzeit',
    'part-time': 'Teilzeit',
    contract: 'Freiberuflich',
    freelance: 'Freelance',
    internship: 'Praktikum',
    apprenticeship: 'Ausbildung',
    working_student: 'Werkstudent',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative group">
      <div className="flex gap-4">
        {/* Logo */}
        <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
          {job.logoUrl ? (
            <img src={job.logoUrl} alt={job.companyName} className="w-full h-full object-contain" />
          ) : (
            <div className="text-gray-300 font-bold text-xl">{job.companyName.charAt(0)}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <Link href={jobLink} className="hover:underline focus:outline-none">
                <span className="absolute inset-0" aria-hidden="true" />
                <h3 className="text-lg font-bold text-[#14ad9f] mb-1 group-hover:text-teal-700 transition-colors">
                  {job.title}
                </h3>
              </Link>
              <p className="text-gray-600 font-medium mb-2">{job.companyName}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`text-gray-400 hover:text-red-500 ${isFavorite ? 'text-red-500' : ''} relative z-10`}
              onClick={toggleFavorite}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {jobTypeTranslations[job.type] || job.type}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(job.postedAt).toLocaleDateString('de-DE')}
            </div>
          </div>

          <div className="text-sm text-gray-600 line-clamp-2 mb-4">{job.description}</div>
        </div>
      </div>
    </div>
  );
};
