import { useState, useCallback, useRef, useEffect } from 'react';
import { Suggestion, WritingStats } from '@/types/grammar';
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
  const textRef = useRef<string>('');

  // Keep textRef in sync
  useEffect(() => {
    textRef.current = text;
  }, [text]);

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

      // Only update if the text hasn't changed since we started
      if (textRef.current !== textToAnalyze) {
        console.log('Text changed during analysis, skipping update');
        setIsAnalyzing(false);
        return;
      }

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        // Validate and filter suggestions that have correct indices
        const validSuggestions: Suggestion[] = data.suggestions
          .filter((s: any) => {
            // Verify the original text actually exists at the specified location
            const startIdx = s.startIndex ?? 0;
            const endIdx = s.endIndex ?? 0;
            const textAtLocation = textToAnalyze.slice(startIdx, endIdx);
            
            // Only include if original matches what's actually in the text
            // or if it's a reasonable match (AI might paraphrase slightly)
            return s.original && 
                   startIdx >= 0 && 
                   endIdx <= textToAnalyze.length &&
                   (textAtLocation.toLowerCase().includes(s.original.toLowerCase().substring(0, 3)) ||
                    s.original.toLowerCase().includes(textAtLocation.toLowerCase().substring(0, 3)));
          })
          .map((s: any, idx: number) => ({
            id: `ai-${Date.now()}-${idx}`,
            type: s.type || 'grammar',
            original: s.original || '',
            replacement: s.replacement || '',
            message: s.message || 'Suggestion from AI',
            startIndex: s.startIndex ?? 0,
            endIndex: s.endIndex ?? 0,
          }));
        
        setSuggestions(validSuggestions);
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
    const currentText = textRef.current;
    
    // Find the original text in the current text
    // First try exact position match
    let startIdx = suggestion.startIndex;
    let endIdx = suggestion.endIndex;
    
    const textAtOriginalPos = currentText.slice(startIdx, endIdx);
    
    // If the text at the original position doesn't match, search for it
    if (textAtOriginalPos.toLowerCase() !== suggestion.original.toLowerCase()) {
      // Search for the original text in the current text
      const searchIdx = currentText.toLowerCase().indexOf(suggestion.original.toLowerCase());
      if (searchIdx !== -1) {
        startIdx = searchIdx;
        endIdx = searchIdx + suggestion.original.length;
      } else {
        // Can't find the text to replace, remove this suggestion
        console.log('Could not find original text to replace:', suggestion.original);
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        return;
      }
    }
    
    // Apply the replacement
    const newText = 
      currentText.slice(0, startIdx) + 
      suggestion.replacement + 
      currentText.slice(endIdx);
    
    setText(newText);
    
    // Remove the applied suggestion and clear others (they need re-analysis)
    setSuggestions([]);
    
    // Force re-analysis with the new text
    lastAnalyzedTextRef.current = '';
    
    // Small delay to let state update, then re-analyze
    setTimeout(() => {
      analyze(newText);
    }, 100);
  }, [analyze]);

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
