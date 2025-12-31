import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ToolType = 
  | 'proofread'
  | 'rewrite'
  | 'paraphrase'
  | 'humanize'
  | 'detect-ai'
  | 'fact-check'
  | 'find-citations'
  | 'grade'
  | 'reader-reactions'
  | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useAITools() {
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const callTool = useCallback(async <T>(tool: ToolType, text: string, message?: string): Promise<T | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-writing-tools', {
        body: { 
          tool, 
          text, 
          message,
          conversationHistory: tool === 'chat' ? chatHistory : undefined
        },
      });

      if (error) {
        throw error;
      }

      return data as T;
    } catch (error: any) {
      console.error(`Error calling ${tool}:`, error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast, chatHistory]);

  const sendChatMessage = useCallback(async (text: string, message: string) => {
    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);

    const result = await callTool<{ response: string }>('chat', text, message);
    
    if (result?.response) {
      const assistantMessage: ChatMessage = { role: 'assistant', content: result.response };
      setChatHistory(prev => [...prev, assistantMessage]);
      return result.response;
    }
    
    // Remove the user message if there was an error
    setChatHistory(prev => prev.slice(0, -1));
    return null;
  }, [callTool]);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  return {
    isLoading,
    callTool,
    chatHistory,
    sendChatMessage,
    clearChatHistory,
  };
}
