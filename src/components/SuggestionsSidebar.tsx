import { Suggestion } from '@/types/grammar';
import { SuggestionCard } from './SuggestionCard';
import { AlertCircle, Lightbulb, BookOpen, CheckCircle2, RefreshCw, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestionsSidebarProps {
  suggestions: Suggestion[];
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  onAcceptAll: () => void;
  onReanalyze: () => void;
  activeSuggestionId?: string;
  isAnalyzing?: boolean;
}

export function SuggestionsSidebar({ 
  suggestions, 
  onApply, 
  onDismiss,
  onAcceptAll,
  onReanalyze,
  activeSuggestionId,
  isAnalyzing 
}: SuggestionsSidebarProps) {
  const grammarCount = suggestions.filter(s => s.type === 'grammar' || s.type === 'spelling').length;
  const clarityCount = suggestions.filter(s => s.type === 'clarity' || s.type === 'punctuation').length;
  const styleCount = suggestions.filter(s => s.type === 'style').length;

  if (isAnalyzing) {
    return (
      <div className="w-80 shrink-0 bg-card border-l border-border p-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Analyzing your text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 bg-card border-l border-border overflow-y-auto">
      {/* Stats Header */}
      <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Suggestions</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReanalyze}
            className="h-8 px-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Re-analyze
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
            <span className="text-muted-foreground">
              {grammarCount} <span className="hidden sm:inline">errors</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Lightbulb className="w-3.5 h-3.5 text-warning" />
            <span className="text-muted-foreground">
              {clarityCount} <span className="hidden sm:inline">clarity</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-info" />
            <span className="text-muted-foreground">
              {styleCount} <span className="hidden sm:inline">style</span>
            </span>
          </div>
        </div>
        
        {suggestions.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onAcceptAll}
            className="w-full mt-3 h-8 text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Accept All ({suggestions.length})
          </Button>
        )}
      </div>

      {/* Suggestions List */}
      <div className="p-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Looking good!</p>
            <p className="text-xs text-muted-foreground">No suggestions at this time.</p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApply={onApply}
              onDismiss={onDismiss}
              isActive={suggestion.id === activeSuggestionId}
            />
          ))
        )}
      </div>
    </div>
  );
}
