import { useState } from 'react';
import { RefreshCw, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RewriteResult {
  rewritten: string;
  changes: string[];
  improvementScore: number;
}

interface AIRewriterProps {
  text: string;
  onApply: (newText: string) => void;
}

export function AIRewriter({ text, onApply }: AIRewriterProps) {
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRewrite = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to rewrite',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-writing-tools', {
        body: { tool: 'rewrite', text },
      });

      if (error) throw error;
      if (data) setResult(data);
    } catch (error: any) {
      console.error('Rewrite error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result?.rewritten) {
      await navigator.clipboard.writeText(result.rewritten);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (result?.rewritten) {
      onApply(result.rewritten);
      toast({
        title: 'Applied!',
        description: 'The rewritten text has been applied to the editor.',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Rewriter</h3>
        </div>
        <Button onClick={handleRewrite} disabled={isLoading || !text.trim()}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Rewriting...' : 'Rewrite'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Transform your text with improved clarity, flow, and impact while preserving the original meaning.
      </p>

      {result && (
        <Card className="p-4 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              +{result.improvementScore}% Improved
            </Badge>
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
            <p className="text-foreground whitespace-pre-wrap">{result.rewritten}</p>
          </div>

          {result.changes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Changes made:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {result.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
