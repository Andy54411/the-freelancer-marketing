import { getAllChats } from '@/lib/chat-data';
import { ChatsClientPage } from './components/ChatsClientPage';

export const dynamic = 'force-dynamic';

export default async function ChatsPage() {
  const chats = await getAllChats();

  return <ChatsClientPage chats={chats} />;
}
