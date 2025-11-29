import Link from 'next/link';
import { JobPosting } from '@/types/career';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Building, Euro } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

interface JobCardProps {
  job: JobPosting;
  userId: string;
}

export function JobCard({ job, userId }: JobCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl mb-1">{job.title}</CardTitle>
            <div className="flex items-center text-muted-foreground text-sm">
              <Building className="h-3 w-3 mr-1" />
              {job.companyName}
            </div>
          </div>
          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
            {job.type === 'full-time' ? 'Vollzeit' : 
             job.type === 'part-time' ? 'Teilzeit' : 
             job.type === 'freelance' ? 'Freelance' : job.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grow">
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            {job.location}
          </div>
          {job.salaryRange && (
            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-2 text-gray-400" />
              {job.salaryRange.min} - {job.salaryRange.max} {job.salaryRange.currency}
            </div>
          )}
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            Vor {formatDistanceToNow(new Date(job.postedAt), { locale: de, addSuffix: false })}
          </div>
        </div>
        <p className="text-sm text-gray-500 line-clamp-3">
          {job.description}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/dashboard/user/${userId}/career/jobs/${job.id}`}>
            Details & Bewerben
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
