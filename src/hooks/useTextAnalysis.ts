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

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastAnalyzedTextRef = useRef<string>('');
  const textRef = useRef<string>('');

  // Keeps a lightweight “memory” of what the user already accepted,
  // so the proofreader doesn’t keep proposing the same kinds of edits.
  const acceptedEditsRef = useRef<Array<Pick<Suggestion, 'type' | 'original' | 'replacement' | 'message'>>>([]);

  // After the first full accept pass, switch to a stricter mode to avoid endless style nitpicks.
  const analysisPassRef = useRef<number>(0);

  // Tracks the latest in-flight analysis so loading state doesn't flicker.
  const latestRunIdRef = useRef<number>(0);

  // Keep textRef in sync
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const analyzeWithAI = useCallback(
    async (
      textToAnalyze: string,
      opts?: {
        reason?: 'typing' | 'post_accept' | 'manual';
      }
    ) => {
      const runId = ++latestRunIdRef.current;
      const setAnalyzingSafe = (value: boolean) => {
        if (runId === latestRunIdRef.current) setIsAnalyzing(value);
      };

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
        setAnalyzingSafe(false);
        return;
      }

      // Update stats immediately (local calculation)
      setStats(calculateStats(textToAnalyze));
      setAnalyzingSafe(true);

      // After a pass of accepted edits, keep the checker strict so it can actually reach “0 suggestions”.
      const strict = analysisPassRef.current > 0 || opts?.reason === 'post_accept';
      const acceptedEdits = acceptedEditsRef.current.slice(-25);

      try {
        const { data, error } = await supabase.functions.invoke('ai-writing-tools', {
          body: {
            tool: 'proofread',
            text: textToAnalyze,
            strict,
            acceptedEdits,
          },
        });

        if (error) {
          console.error('AI proofreading error:', error);
          setAnalyzingSafe(false);
          return;
        }

        // Only update if the text hasn't changed since we started
        if (textRef.current !== textToAnalyze) {
          console.log('Text changed during analysis, skipping update');
          setAnalyzingSafe(false);
          return;
        }

        const rawSuggestions: any[] = Array.isArray(data?.suggestions) ? data.suggestions : [];

        const validSuggestions: Suggestion[] = rawSuggestions
          .filter((s: any) => {
            const startIdx = s.startIndex ?? 0;
            const endIdx = s.endIndex ?? 0;
            if (!s?.original || !s?.replacement) return false;
            if (typeof s.original !== 'string' || typeof s.replacement !== 'string') return false;
            if (s.original.trim() === s.replacement.trim()) return false;
            if (startIdx < 0 || endIdx > textToAnalyze.length || endIdx <= startIdx) return false;

            const textAtLocation = textToAnalyze.slice(startIdx, endIdx);

            // Prefer exact match, but allow a small fuzziness for safety.
            const o = s.original.toLowerCase();
            const t = textAtLocation.toLowerCase();
            const o3 = o.substring(0, 3);
            const t3 = t.substring(0, 3);

            return (
              t === o ||
              (o3 && t.includes(o3)) ||
              (t3 && o.includes(t3))
            );
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

        // Safety: in strict mode, drop endless preference edits.
        const finalSuggestions = strict
          ? validSuggestions.filter((s) => s.type !== 'style' && s.type !== 'clarity')
          : validSuggestions;

        setSuggestions(finalSuggestions);

        if (typeof data?.overallScore === 'number') {
          setOverallScore(data.overallScore);
        } else {
          setOverallScore(finalSuggestions.length ? 85 : 100);
        }
      } catch (err) {
        console.error('Error calling AI proofreader:', err);
      } finally {
        setAnalyzingSafe(false);
      }
    },
    []
  );

  const analyze = useCallback(
    (newText: string) => {
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
          analyzeWithAI(newText, { reason: 'typing' });
        }
      }, 1400);
    },
    [analyzeWithAI]
  );

  const handleTextChange = useCallback(
    (newText: string) => {
      setText(newText);
      analyze(newText);
    },
    [analyze]
  );

  const applySuggestion = useCallback(
    (suggestion: Suggestion) => {
      const currentText = textRef.current;

      // Find the original text in the current text
      // First try exact position match
      let startIdx = suggestion.startIndex;
      let endIdx = suggestion.endIndex;

      const textAtOriginalPos = currentText.slice(startIdx, endIdx);

      // If the text at the original position doesn't match, search for it
      if (textAtOriginalPos.toLowerCase() !== suggestion.original.toLowerCase()) {
        const searchIdx = currentText.toLowerCase().indexOf(suggestion.original.toLowerCase());
        if (searchIdx !== -1) {
          startIdx = searchIdx;
          endIdx = searchIdx + suggestion.original.length;
        } else {
          // Can't find the text to replace, remove this suggestion
          console.log('Could not find original text to replace:', suggestion.original);
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
          return;
        }
      }

      // Track accepted edit (for AI context)
      acceptedEditsRef.current = [
        ...acceptedEditsRef.current,
        {
          type: suggestion.type,
          original: suggestion.original,
          replacement: suggestion.replacement,
          message: suggestion.message,
        },
      ].slice(-50);

      const lengthDiff = suggestion.replacement.length - suggestion.original.length;

      const newText = currentText.slice(0, startIdx) + suggestion.replacement + currentText.slice(endIdx);

      setText(newText);

      // Update lastAnalyzedTextRef to prevent auto re-analysis
      lastAnalyzedTextRef.current = newText;

      // Remove the applied suggestion and adjust indices of remaining suggestions
      setSuggestions((prev) => {
        const remaining = prev.filter((s) => s.id !== suggestion.id);

        // If all suggestions are handled, trigger a strict re-analysis
        if (remaining.length === 0) {
          analysisPassRef.current += 1;
          lastAnalyzedTextRef.current = '';
          setTimeout(() => {
            analyzeWithAI(newText, { reason: 'post_accept' });
          }, 150);
          return [];
        }

        // Adjust indices for suggestions that come after the applied one
        return remaining.map((s) => {
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
    },
    [analyzeWithAI]
  );

  const dismissSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setSuggestions((prev) => {
        const remaining = prev.filter((s) => s.id !== suggestion.id);

        // If all suggestions are handled, trigger re-analysis
        if (remaining.length === 0) {
          lastAnalyzedTextRef.current = '';
          setTimeout(() => {
            analyzeWithAI(textRef.current, { reason: 'manual' });
          }, 150);
        }

        return remaining;
      });
    },
    [analyzeWithAI]
  );

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
    acceptedEditsRef.current = [];
    analysisPassRef.current = 0;
  }, []);

  const acceptAllSuggestions = useCallback(() => {
    if (suggestions.length === 0) return;

    // Track accepted edits (for AI context)
    acceptedEditsRef.current = [
      ...acceptedEditsRef.current,
      ...suggestions.map((s) => ({
        type: s.type,
        original: s.original,
        replacement: s.replacement,
        message: s.message,
      })),
    ].slice(-50);

    analysisPassRef.current += 1;

    // Sort suggestions by startIndex in descending order to apply from end to start
    const sortedSuggestions = [...suggestions].sort((a, b) => b.startIndex - a.startIndex);

    let currentText = textRef.current;

    for (const suggestion of sortedSuggestions) {
      let startIdx = suggestion.startIndex;
      let endIdx = suggestion.endIndex;

      const textAtOriginalPos = currentText.slice(startIdx, endIdx);

      if (textAtOriginalPos.toLowerCase() !== suggestion.original.toLowerCase()) {
        const searchIdx = currentText.toLowerCase().indexOf(suggestion.original.toLowerCase());
        if (searchIdx !== -1) {
          startIdx = searchIdx;
          endIdx = searchIdx + suggestion.original.length;
        } else {
          continue;
        }
      }

      currentText = currentText.slice(0, startIdx) + suggestion.replacement + currentText.slice(endIdx);
    }

    setText(currentText);
    setSuggestions([]);
    lastAnalyzedTextRef.current = '';

    setTimeout(() => {
      analyzeWithAI(currentText, { reason: 'post_accept' });
    }, 150);
  }, [suggestions, analyzeWithAI]);

  const reanalyze = useCallback(() => {
    lastAnalyzedTextRef.current = '';
    analyzeWithAI(textRef.current, { reason: 'manual' });
  }, [analyzeWithAI]);

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
    acceptAllSuggestions,
    reanalyze,
  };
}

