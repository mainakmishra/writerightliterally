import { useState } from 'react';
import { Bot, User, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Indicator {
  type: 'ai' | 'human';
  description: string;
  evidence: string;
}

interface DetectionResult {
  aiProbability: number;
  humanProbability: number;
  indicators: Indicator[];
  verdict: string;
  explanation: string;
}

interface AIDetectorProps {
  text: string;
}

export function AIDetector({ text }: AIDetectorProps) {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDetect = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to analyze',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-writing-tools', {
        body: { tool: 'detect-ai', text },
      });

      if (error) throw error;
      
      // Validate response structure
      if (data && typeof data.aiProbability === 'number' && typeof data.humanProbability === 'number' && data.verdict) {
        setResult(data);
      } else {
        throw new Error('Invalid response from AI. Please try again.');
      }
    } catch (error: any) {
      console.error('Detection error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict.includes('AI')) return 'bg-destructive/10 text-destructive';
    if (verdict.includes('Human')) return 'bg-green-500/10 text-green-600';
    return 'bg-warning/10 text-warning-foreground';
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict.includes('AI')) return <Bot className="w-4 h-4" />;
    if (verdict.includes('Human')) return <User className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Content Detector</h3>
        </div>
        <Button onClick={handleDetect} disabled={isLoading || !text.trim()}>
          <Search className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Analyzing...' : 'Detect'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Analyze text to determine if it was written by AI or a human.
      </p>

      {result && (
        <Card className="p-4 space-y-4 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <Badge className={`text-base py-2 px-4 ${getVerdictColor(result.verdict)}`}>
              {getVerdictIcon(result.verdict)}
              <span className="ml-2">{result.verdict}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Bot className="w-4 h-4 text-destructive" />
                  AI
                </span>
                <span className="font-semibold">{result.aiProbability}%</span>
              </div>
              <Progress value={result.aiProbability} className="h-2 bg-muted [&>div]:bg-destructive" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4 text-green-600" />
                  Human
                </span>
                <span className="font-semibold">{result.humanProbability}%</span>
              </div>
              <Progress value={result.humanProbability} className="h-2 bg-muted [&>div]:bg-green-500" />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{result.explanation}</p>

          {result.indicators.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Indicators found:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.indicators.map((indicator, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-muted">
                    <div className="flex items-center gap-2 mb-1">
                      {indicator.type === 'ai' ? (
                        <Bot className="w-3 h-3 text-destructive" />
                      ) : (
                        <User className="w-3 h-3 text-green-600" />
                      )}
                      <span className="font-medium">{indicator.description}</span>
                    </div>
                    <p className="text-muted-foreground italic">"{indicator.evidence}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
