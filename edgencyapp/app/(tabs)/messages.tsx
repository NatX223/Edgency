// app/(tabs)/messages.tsx
// Replace your stub with this to navigate into the chat screen.

import { useEffect } from 'react';
import { router } from 'expo-router';

export default function MessagesTab() {
  useEffect(() => {
    // Navigate into the chat session immediately when the Messages tab is opened.
    // In a real app you'd show a conversation list first and navigate with a session ID.
    router.push('/(tabs)/chat');
  }, []);

  return null;
}
