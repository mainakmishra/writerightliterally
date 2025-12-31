import { useRef, useEffect } from 'react';
import { Suggestion } from '@/types/grammar';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
  placeholder?: string;
}

export function Editor({ 
  value, 
  onChange, 
  suggestions, 
  onSuggestionClick,
  placeholder = "Start writing or paste your text here..." 
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(400, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  const getHighlightedText = () => {
    if (!value || suggestions.length === 0) return null;

    const sortedSuggestions = [...suggestions].sort((a, b) => a.startIndex - b.startIndex);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion, idx) => {
      if (suggestion.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {value.slice(lastIndex, suggestion.startIndex)}
          </span>
        );
      }

      const underlineClass = 
        suggestion.type === 'grammar' || suggestion.type === 'spelling' 
          ? 'error-underline' 
          : suggestion.type === 'style' 
            ? 'style-underline' 
            : 'warning-underline';

      parts.push(
        <span
          key={`suggestion-${suggestion.id}`}
          className={`${underlineClass} cursor-pointer hover:bg-destructive/10 rounded px-0.5 transition-colors`}
          onClick={() => onSuggestionClick?.(suggestion)}
          title={suggestion.message}
        >
          {value.slice(suggestion.startIndex, suggestion.endIndex)}
        </span>
      );

      lastIndex = suggestion.endIndex;
    });

    if (lastIndex < value.length) {
      parts.push(<span key="text-end">{value.slice(lastIndex)}</span>);
    }

    return parts;
  };

  return (
    <div className="relative flex-1 bg-card rounded-xl shadow-medium border border-border overflow-hidden">
      <div className="relative p-8 min-h-[500px]">
        {/* Overlay for highlighting - must match textarea exactly */}
        <div 
          className="editor-content absolute inset-0 p-8 whitespace-pre-wrap break-words text-foreground overflow-hidden"
          style={{ 
            opacity: suggestions.length > 0 ? 1 : 0,
            pointerEvents: 'none',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
          aria-hidden="true"
        >
          {getHighlightedText()}
        </div>
        
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="editor-content w-full min-h-[400px] bg-transparent resize-none outline-none placeholder:text-muted-foreground relative z-10"
          style={{ 
            color: suggestions.length > 0 ? 'transparent' : 'inherit',
            caretColor: 'hsl(var(--foreground))',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
