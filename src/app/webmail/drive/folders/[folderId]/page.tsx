'use client';

import { useParams } from 'next/navigation';
import WebmailDrivePage from '../../page';

export default function FolderPage() {
  const params = useParams();
  const folderId = params.folderId as string;
  
  // The main page component will handle the folder navigation
  // We just pass the folderId through the URL
  return <WebmailDrivePage initialFolderId={folderId} />;
}
