import { useState, useCallback, useRef, useEffect } from 'react';
import { Suggestion, WritingStats, AnalysisResult } from '@/types/grammar';

// Simple client-side analysis for immediate feedback
function analyzeTextLocally(text: string): AnalysisResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = text.trim() ? words.length : 0;
  const characterCount = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const sentenceCount = sentences.length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const paragraphCount = paragraphs.length;

  // Average reading speed: 200-250 words per minute
  const readingTime = wordCount / 225;
  // Average speaking speed: 125-150 words per minute
  const speakingTime = wordCount / 130;

  // Simple Flesch-Kincaid inspired readability
  const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const avgWordLength = wordCount > 0 ? characterCount / wordCount : 0;
  const readabilityScore = Math.max(0, Math.min(100, 
    100 - (avgSentenceLength * 1.5) - (avgWordLength * 5) + 50
  ));

  // Generate suggestions based on common patterns
  const suggestions: Suggestion[] = [];
  let idCounter = 0;

  // Common grammar mistakes
  const patterns = [
    { regex: /\bi\b(?=[^'"])/g, original: 'i', replacement: 'I', type: 'grammar' as const, message: 'Capitalize "I" when used as a pronoun.' },

    // Common typos (expanded)
    { regex: /\bwhet\b/gi, original: 'whet', replacement: 'what', type: 'spelling' as const, message: 'Possible typo: "whet" → "what".' },
    { regex: /\byoue\b/gi, original: 'youe', replacement: 'your', type: 'spelling' as const, message: 'Possible typo: "youe" → "your".' },
    { regex: /\byeur\b/gi, original: 'yeur', replacement: 'your', type: 'spelling' as const, message: 'Possible typo: "yeur" → "your".' },
    { regex: /\bnme\b/gi, original: 'nme', replacement: 'name', type: 'spelling' as const, message: 'Possible typo: "nme" → "name".' },

    { regex: /\bteh\b/gi, original: 'teh', replacement: 'the', type: 'spelling' as const, message: 'Common typo for "the".' },
    { regex: /\brecieve\b/gi, original: 'recieve', replacement: 'receive', type: 'spelling' as const, message: 'Correct spelling is "receive" (i before e except after c).' },
    { regex: /\bdefinate\b/gi, original: 'definate', replacement: 'definite', type: 'spelling' as const, message: 'Correct spelling is "definite".' },
    { regex: /\boccured\b/gi, original: 'occured', replacement: 'occurred', type: 'spelling' as const, message: 'Correct spelling is "occurred" (double r).' },
    { regex: /\bseperately\b/gi, original: 'seperately', replacement: 'separately', type: 'spelling' as const, message: 'Correct spelling is "separately".' },
    { regex: /\buntill\b/gi, original: 'untill', replacement: 'until', type: 'spelling' as const, message: 'Correct spelling is "until" (single l).' },

    { regex: /\balot\b/gi, original: 'alot', replacement: 'a lot', type: 'grammar' as const, message: '"A lot" should be two words.' },
    { regex: /\byour\s+(welcome|right|wrong|crazy)\b/gi, original: 'your', replacement: "you're", type: 'grammar' as const, message: 'Use "you\'re" (you are) instead of "your".' },
    { regex: /\bthier\b/gi, original: 'thier', replacement: 'their', type: 'spelling' as const, message: 'Correct spelling is "their".' },
    { regex: /\bcould\s+of\b/gi, original: 'could of', replacement: 'could have', type: 'grammar' as const, message: 'Use "could have" instead of "could of".' },
    { regex: /\bwould\s+of\b/gi, original: 'would of', replacement: 'would have', type: 'grammar' as const, message: 'Use "would have" instead of "would of".' },
    { regex: /\bshould\s+of\b/gi, original: 'should of', replacement: 'should have', type: 'grammar' as const, message: 'Use "should have" instead of "should of".' },
    { regex: /\bits\s+(a|the|very|so|too)\b/gi, original: 'its', replacement: "it's", type: 'grammar' as const, message: 'Use "it\'s" (it is) when followed by an article or adverb.' },

    { regex: /\s{2,}/g, original: '  ', replacement: ' ', type: 'style' as const, message: 'Remove extra spaces.' },
    { regex: /very\s+(good|nice|big|small|fast|slow)/gi, original: '', replacement: '', type: 'style' as const, message: 'Consider using a stronger, more specific word.' },
    { regex: /\breally\s+really\b/gi, original: 'really really', replacement: 'extremely', type: 'style' as const, message: 'Avoid repetitive intensifiers.' },
    { regex: /\bin\s+order\s+to\b/gi, original: 'in order to', replacement: 'to', type: 'clarity' as const, message: 'Simplify "in order to" to just "to".' },
    { regex: /\bat\s+this\s+point\s+in\s+time\b/gi, original: 'at this point in time', replacement: 'now', type: 'clarity' as const, message: 'Simplify to "now" or "currently".' },
    { regex: /\bdue\s+to\s+the\s+fact\s+that\b/gi, original: 'due to the fact that', replacement: 'because', type: 'clarity' as const, message: 'Simplify to "because".' },
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const matchedText = match[0];
      suggestions.push({
        id: `local-${idCounter++}`,
        type: pattern.type,
        original: matchedText,
        replacement: pattern.replacement || matchedText,
        message: pattern.message,
        startIndex: match.index,
        endIndex: match.index + matchedText.length,
      });
    }
  }

  // Calculate overall score
  const errorPenalty = suggestions.filter(s => s.type === 'grammar' || s.type === 'spelling').length * 5;
  const stylePenalty = suggestions.filter(s => s.type === 'style' || s.type === 'clarity').length * 2;
  const overallScore = Math.max(0, Math.min(100, 85 - errorPenalty - stylePenalty + (readabilityScore * 0.15)));

  return {
    suggestions,
    stats: {
      wordCount,
      characterCount,
      sentenceCount,
      paragraphCount,
      readingTime,
      speakingTime,
      readabilityScore: Math.round(readabilityScore),
    },
    overallScore: Math.round(overallScore),
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

  const analyze = useCallback((newText: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!newText.trim()) {
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
        return;
      }

      setIsAnalyzing(true);
      
      // Simulate a brief analysis delay for UX
      setTimeout(() => {
        const result = analyzeTextLocally(newText);
        setSuggestions(result.suggestions);
        setStats(result.stats);
        setOverallScore(result.overallScore);
        setIsAnalyzing(false);
      }, 300);
    }, 500);
  }, []);

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
