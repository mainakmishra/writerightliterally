import { forwardRef } from 'react';
import { Check, X, AlertCircle, Lightbulb, Type, BookOpen } from 'lucide-react';
import { Suggestion, SuggestionType } from '@/types/grammar';
import { Button } from '@/components/ui/button';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  isActive?: boolean;
}

const typeConfig: Record<SuggestionType, { icon: typeof AlertCircle; label: string; className: string }> = {
  grammar: { icon: AlertCircle, label: 'Grammar', className: 'text-destructive bg-destructive/10' },
  spelling: { icon: Type, label: 'Spelling', className: 'text-destructive bg-destructive/10' },
  clarity: { icon: Lightbulb, label: 'Clarity', className: 'text-warning bg-warning/10' },
  style: { icon: BookOpen, label: 'Style', className: 'text-info bg-info/10' },
  punctuation: { icon: Type, label: 'Punctuation', className: 'text-warning bg-warning/10' },
};

export const SuggestionCard = forwardRef<HTMLDivElement, SuggestionCardProps>(
  ({ suggestion, onApply, onDismiss, isActive }, ref) => {
    const config = typeConfig[suggestion.type];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        className={`suggestion-card animate-fade-in ${isActive ? 'ring-2 ring-primary border-primary' : ''}`}
        style={{ animationDelay: '0.05s' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        </div>

        {/* Message */}
        <p className="text-sm text-foreground mb-3">{suggestion.message}</p>

        {/* Original and Replacement */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-14 pt-1 shrink-0">Original:</span>
            <span className="text-sm text-foreground line-through opacity-60 bg-destructive/5 px-2 py-1 rounded">
              {suggestion.original}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-14 pt-1 shrink-0">Replace:</span>
            <span className="text-sm text-foreground font-medium bg-success/10 text-success px-2 py-1 rounded">
              {suggestion.replacement}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onApply(suggestion)}
            className="flex-1 gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Check className="w-3.5 h-3.5" />
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(suggestion)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
);

SuggestionCard.displayName = 'SuggestionCard';

