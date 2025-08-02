import { ProjectsComponent } from '@/components/finance/ProjectsComponent';

interface ProjectsPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { uid } = await params;

  return (
    <div className="p-6">
      <ProjectsComponent companyId={uid} />
    </div>
  );
}

export const metadata = {
  title: 'Projekte | Tasko',
  description: 'Projektverwaltung mit Budget- und Zeiterfassung',
};
