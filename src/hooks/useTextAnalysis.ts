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

    // Calculate the length difference for adjusting other suggestions
    const lengthDiff = suggestion.replacement.length - suggestion.original.length;

    // Apply the replacement
    const newText =
      currentText.slice(0, startIdx) +
      suggestion.replacement +
      currentText.slice(endIdx);

    setText(newText);

    // Update lastAnalyzedTextRef to prevent auto re-analysis
    lastAnalyzedTextRef.current = newText;

    // Remove the applied suggestion and adjust indices of remaining suggestions
    setSuggestions(prev => {
      const remaining = prev.filter(s => s.id !== suggestion.id);

      // If all suggestions are handled, trigger re-analysis
      if (remaining.length === 0) {
        lastAnalyzedTextRef.current = '';
        setTimeout(() => {
          analyze(newText);
        }, 100);
        return [];
      }

      // Adjust indices for suggestions that come after the applied one
      return remaining.map(s => {
        if (s.startIndex > startIdx) {
          return {
            ...s,
            startIndex: s.startIndex + lengthDiff,
            endIndex: s.endIndex + lengthDiff,
          };
        }
        return s;
      });
    });
  }, [analyze]);

  const dismissSuggestion = useCallback((suggestion: Suggestion) => {
    setSuggestions(prev => {
      const remaining = prev.filter(s => s.id !== suggestion.id);

      // If all suggestions are handled, trigger re-analysis
      if (remaining.length === 0) {
        lastAnalyzedTextRef.current = '';
        setTimeout(() => {
          analyze(text);
        }, 100);
      }

      return remaining;
    });
  }, [analyze, text]);

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



  const reanalyze = useCallback(() => {
    lastAnalyzedTextRef.current = '';
    analyzeWithAI(text);
  }, [text, analyzeWithAI]);

  const acceptAllSuggestions = useCallback(() => {
    if (!suggestions.length) return;

    let newText = textRef.current;

    // Sort by index in descending order to prevent index shifting issues
    const sortedSuggestions = [...suggestions].sort((a, b) => b.startIndex - a.startIndex);

    let appliedCount = 0;

    sortedSuggestions.forEach(suggestion => {
      const { startIndex, endIndex, original, replacement } = suggestion;

      // Verify that the text at this position matches what we expect
      // checking case-insensitively to be more robust
      const actualText = newText.slice(startIndex, endIndex);

      if (actualText.toLowerCase() === original.toLowerCase()) {
        newText = newText.slice(0, startIndex) + replacement + newText.slice(endIndex);
        appliedCount++;
      }
    });

    if (appliedCount > 0) {
      setText(newText);
      setSuggestions([]);

      // Force re-analysis after changes
      lastAnalyzedTextRef.current = '';
      setTimeout(() => {
        analyzeWithAI(newText); // Use analyzeWithAI directly to bypass debounce if desired, or analyze() to debounce
      }, 100);
    }
  }, [suggestions, analyzeWithAI]);

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
    acceptAllSuggestions,
    reanalyze,
    clearText,
  };
}
