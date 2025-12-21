
import { db } from '../services/db';
import type { Conversation } from '../types';

export const useMemory = () => {
  const saveConversation = async (conversation: Conversation) => {
    await db.put('conversations', conversation);
  };
  
  const loadConversation = async (id: string): Promise<Conversation | null> => {
    const convo = await db.get<Conversation>('conversations', id);
    return convo || null;
  };
  
  const listConversations = async (): Promise<Conversation[]> => {
    // We could optimize with index query in db.ts but getting all and sorting is fine for <1000 items locally
    const all = await db.getAll<Conversation>('conversations');
    // Sort by updatedAt desc
    return all.sort((a, b) => {
        const timeA = new Date(a.metadata.updatedAt).getTime();
        const timeB = new Date(b.metadata.updatedAt).getTime();
        return timeB - timeA;
    });
  };
  
  const deleteConversation = async (id: string) => {
    await db.delete('conversations', id);
  };
  
  return {
    saveConversation,
    loadConversation,
    listConversations,
    deleteConversation
  };
};
