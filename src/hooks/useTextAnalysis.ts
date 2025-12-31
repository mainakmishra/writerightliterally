import { useState, useCallback, useRef, useEffect } from 'react';
import { Suggestion, WritingStats, AnalysisResult } from '@/types/grammar';
import { supabase } from '@/integrations/supabase/client';

// Calculate basic stats locally (no AI needed)
function calculateStats(text: string): WritingStats {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = text.trim() ? words.length : 0;
  const characterCount = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const sentenceCount = sentences.length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const paragraphCount = paragraphs.length;

  const readingTime = wordCount / 225;
  const speakingTime = wordCount / 130;

  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const avgWordLength = wordCount > 0 ? characterCount / wordCount : 0;
  const readabilityScore = Math.max(0, Math.min(100, 
    100 - (avgSentenceLength * 1.5) - (avgWordLength * 5) + 50
  ));

  return {
    wordCount,
    characterCount,
    sentenceCount,
    paragraphCount,
    readingTime,
    speakingTime,
    readabilityScore: Math.round(readabilityScore),
  };
}

export function useTextAnalysis() {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<WritingStats>({
    wordCount: 0,
    characterCount: 0,
    sentenceCount: 0,
    paragraphCount: 0,
    readingTime: 0,
    speakingTime: 0,
    readabilityScore: 0,
  });
  const [overallScore, setOverallScore] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | undefined>();
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastAnalyzedTextRef = useRef<string>('');

  const analyzeWithAI = useCallback(async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) {
      setSuggestions([]);
      setStats({
        wordCount: 0,
        characterCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        readingTime: 0,
        speakingTime: 0,
        readabilityScore: 0,
      });
      setOverallScore(100);
      setIsAnalyzing(false);
      return;
    }

    // Update stats immediately (local calculation)
    setStats(calculateStats(textToAnalyze));
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-writing-tools', {
        body: { tool: 'proofread', text: textToAnalyze },
      });

      if (error) {
        console.error('AI proofreading error:', error);
        setIsAnalyzing(false);
        return;
      }

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        // Add unique IDs to suggestions from AI
        const suggestionsWithIds: Suggestion[] = data.suggestions.map((s: any, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          type: s.type || 'grammar',
          original: s.original || '',
          replacement: s.replacement || '',
          message: s.message || 'Suggestion from AI',
          startIndex: s.startIndex ?? 0,
          endIndex: s.endIndex ?? 0,
        }));
        setSuggestions(suggestionsWithIds);
        setOverallScore(data.overallScore ?? 85);
      } else {
        setSuggestions([]);
        setOverallScore(data?.overallScore ?? 100);
      }
    } catch (err) {
      console.error('Error calling AI proofreader:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyze = useCallback((newText: string) => {
    // Always update stats immediately
    if (newText.trim()) {
      setStats(calculateStats(newText));
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only call AI if text has meaningfully changed
    debounceRef.current = setTimeout(() => {
      if (newText !== lastAnalyzedTextRef.current) {
        lastAnalyzedTextRef.current = newText;
        analyzeWithAI(newText);
      }
    }, 1000); // 1 second debounce for AI calls
  }, [analyzeWithAI]);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    analyze(newText);
  }, [analyze]);

  const applySuggestion = useCallback((suggestion: Suggestion) => {
    const newText = 
      text.slice(0, suggestion.startIndex) + 
      suggestion.replacement + 
      text.slice(suggestion.endIndex);
    
    setText(newText);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    
    // Re-analyze after applying
    lastAnalyzedTextRef.current = ''; // Force re-analysis
    analyze(newText);
  }, [text, analyze]);

  const dismissSuggestion = useCallback((suggestion: Suggestion) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  }, []);

  const clearText = useCallback(() => {
    setText('');
    setSuggestions([]);
    setStats({
      wordCount: 0,
      characterCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      readingTime: 0,
      speakingTime: 0,
      readabilityScore: 0,
    });
    setOverallScore(100);
    lastAnalyzedTextRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    text,
    setText: handleTextChange,
    suggestions,
    stats,
    overallScore,
    isAnalyzing,
    activeSuggestionId,
    setActiveSuggestionId,
    applySuggestion,
    dismissSuggestion,
    clearText,
  };
}
