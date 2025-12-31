import { useState } from 'react';
import { FileSearch, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlagiarismMatch {
  text: string;
  similarity: number;
  matchType: 'exact' | 'paraphrase' | 'common_phrase';
  explanation: string;
  sources: string[];
}

interface PlagiarismResult {
  originalityScore: number;
  matches: PlagiarismMatch[];
  totalChecked: number;
  summary: string;
}

interface PlagiarismCheckerProps {
  text: string;
}

export function PlagiarismChecker({ text }: PlagiarismCheckerProps) {
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to check',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }

    if (text.trim().length < 50) {
      toast({
        variant: 'destructive',
        title: 'Text too short',
        description: 'Please enter at least 50 characters for plagiarism checking.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: { type: 'plagiarism-check', text },
      });

      if (error) throw error;
      
      if (data && typeof data.originalityScore === 'number') {
        setResult(data);
      } else {
        throw new Error('Invalid response. Please try again.');
      }
    } catch (error: any) {
      console.error('Plagiarism check error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-destructive';
  };

  const getMatchBadgeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-destructive/10 text-destructive';
      case 'paraphrase': return 'bg-warning/10 text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Plagiarism Checker</h3>
        </div>
        <Button onClick={handleCheck} disabled={isLoading || !text.trim()}>
          <FileSearch className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Checking...' : 'Check Plagiarism'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Search the web to check your text for potential plagiarism and originality.
      </p>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {result.originalityScore >= 80 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                )}
                <span className="text-sm font-medium">Originality Score</span>
              </div>
              <span className={`text-lg font-bold ${getScoreColor(result.originalityScore)}`}>
                {result.originalityScore}%
              </span>
            </div>
            <Progress 
              value={result.originalityScore} 
              className="h-3"
            />
            <p className="text-sm text-muted-foreground mt-3">{result.summary}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Checked {result.totalChecked} sentence{result.totalChecked !== 1 ? 's' : ''} via web search
            </p>
          </Card>

          {result.matches.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Potential matches ({result.matches.length}):
              </p>
              {result.matches.map((match, i) => (
                <Card key={i} className="p-3 space-y-2 border-warning/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground flex-1">"{match.text}"</p>
                    <Badge className={getMatchBadgeColor(match.matchType)}>
                      {match.similarity}% {match.matchType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{match.explanation}</p>
                  {match.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {match.sources.map((source, j) => (
                        <Button
                          key={j}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => window.open(source, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Source {j + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {result.matches.length === 0 && result.originalityScore >= 80 && (
            <Card className="p-4 bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm font-medium">Your content appears to be original!</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
