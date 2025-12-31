import { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, HelpCircle, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Claim {
  claim: string;
  verdict: string;
  explanation: string;
  confidence: number;
  sources?: string[];
}

interface FactCheckResult {
  claims: Claim[];
  overallCredibility: number;
  summary: string;
}

interface FactCheckerProps {
  text: string;
}

export function FactChecker({ text }: FactCheckerProps) {
  const [result, setResult] = useState<FactCheckResult | null>(null);
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
    
    setIsLoading(true);
    try {
      // Use Perplexity for web-powered fact checking
      const { data, error } = await supabase.functions.invoke('perplexity-search', {
        body: { type: 'fact-check', text },
      });

      if (error) throw error;
      
      if (data && Array.isArray(data.claims) && typeof data.overallCredibility === 'number') {
        setResult(data);
      } else {
        throw new Error('Invalid response. Please try again.');
      }
    } catch (error: any) {
      console.error('Fact check error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'True': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'False': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'Partially True': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'True': return 'bg-green-500/10 text-green-600';
      case 'False': return 'bg-destructive/10 text-destructive';
      case 'Partially True': return 'bg-warning/10 text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Fact Checker</h3>
          <Badge variant="secondary" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            Web Search
          </Badge>
        </div>
        <Button onClick={handleCheck} disabled={isLoading || !text.trim()}>
          <ShieldCheck className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Searching...' : 'Check Facts'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Verify claims using real-time web search for accuracy.
      </p>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Overall Credibility</span>
              <span className="text-lg font-bold text-primary">{result.overallCredibility}%</span>
            </div>
            <Progress value={result.overallCredibility} className="h-3" />
            <p className="text-sm text-muted-foreground mt-3">{result.summary}</p>
          </Card>

          {result.claims.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Claims analyzed:</p>
              {result.claims.map((claim, i) => (
                <Card key={i} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium flex-1">"{claim.claim}"</p>
                    <Badge className={getVerdictColor(claim.verdict)}>
                      {getVerdictIcon(claim.verdict)}
                      <span className="ml-1">{claim.verdict}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{claim.explanation}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Confidence:</span>
                    <Progress value={claim.confidence} className="h-1 w-20" />
                    <span className="font-medium">{claim.confidence}%</span>
                  </div>
                  {claim.sources && claim.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      {claim.sources.map((source, j) => (
                        <Button
                          key={j}
                          variant="outline"
                          size="sm"
                          className="text-xs h-6"
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
        </div>
      )}
    </div>
  );
}
