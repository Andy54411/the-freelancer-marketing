import { ChatsClientPage } from './components/ChatsClientPage';

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
  // Initial empty data - die Client-Komponente lädt die Daten über die API
  const initialChats: any[] = [];

  return <ChatsClientPage chats={initialChats} />;
}
