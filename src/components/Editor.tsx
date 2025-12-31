import { useRef, useEffect, useCallback } from 'react';
import { Suggestion } from '@/types/grammar';
import { EditorToolbar } from './EditorToolbar';

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
  const editorRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // Sync external value changes to contentEditable
  useEffect(() => {
    if (editorRef.current) {
      const currentText = editorRef.current.innerText;
      if (currentText !== value && !editorRef.current.contains(document.activeElement)) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText;
      onChange(text);
    }
  }, [onChange]);

  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handlePrint = useCallback(() => {
    if (!editorRef.current) return;

    const printContent = editorRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Document</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                line-height: 1.6;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            handleFormat('bold');
            break;
          case 'i':
            e.preventDefault();
            handleFormat('italic');
            break;
          case 'u':
            e.preventDefault();
            handleFormat('underline');
            break;
          case 'p':
            if (editorRef.current?.contains(document.activeElement)) {
              e.preventDefault();
              handlePrint();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleFormat, handlePrint]);

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
      <EditorToolbar onFormat={handleFormat} onPrint={handlePrint} />
      
      <div className="relative p-8 min-h-[450px]">
        {/* Overlay for highlighting - shown only when there are suggestions */}
        {suggestions.length > 0 && (
          <div 
            className="editor-content absolute inset-0 p-8 whitespace-pre-wrap break-words text-foreground overflow-hidden pointer-events-none"
            style={{ 
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
            aria-hidden="true"
          >
            {getHighlightedText()}
          </div>
        )}
        
        {/* Rich Text Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="editor-content w-full min-h-[350px] bg-transparent outline-none relative z-10"
          style={{ 
            color: suggestions.length > 0 ? 'transparent' : 'inherit',
            caretColor: 'hsl(var(--foreground))',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
        
        {/* Placeholder */}
        {!value && (
          <div className="absolute top-8 left-8 text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}