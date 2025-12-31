import { useState } from 'react';
import { User, Copy, Check, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface HumanizeResult {
  humanized: string;
  changesApplied: string[];
  humanScore: number;
}

interface AIHumanizerProps {
  text: string;
  onHumanize: (text: string) => Promise<HumanizeResult | null>;
  onApply: (newText: string) => void;
  isLoading: boolean;
}

export function AIHumanizer({ text, onHumanize, onApply, isLoading }: AIHumanizerProps) {
  const [result, setResult] = useState<HumanizeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleHumanize = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to humanize',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }
    const data = await onHumanize(text);
    if (data) {
      setResult(data);
    }
  };

  const handleCopy = async () => {
    if (result?.humanized) {
      await navigator.clipboard.writeText(result.humanized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (result?.humanized) {
      onApply(result.humanized);
      toast({
        title: 'Applied!',
        description: 'The humanized text has been applied to the editor.',
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Humanizer</h3>
        </div>
        <Button onClick={handleHumanize} disabled={isLoading || !text.trim()}>
          <User className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Humanizing...' : 'Humanize'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Make AI-generated text sound more natural and human-like.
      </p>

      {result && (
        <Card className="p-4 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Human Score:</span>
              <div className="flex items-center gap-2 w-32">
                <Progress value={result.humanScore} className="h-2" />
                <span className="text-sm font-semibold text-primary">{result.humanScore}%</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">{result.humanized}</p>
          </div>

          {result.changesApplied.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Humanization techniques applied:</p>
              <div className="flex flex-wrap gap-2">
                {result.changesApplied.map((change, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">
                    {change}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
