import { useState } from 'react';
import { Users, ThumbsUp, ThumbsDown, Meh, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Reaction {
  emoji: string;
  reaction: string;
  percentage: number;
  explanation: string;
}

interface ReactionsResult {
  reactions: Reaction[];
  engagement: {
    score: number;
    factors: string[];
  };
  sentiment: {
    overall: string;
    breakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
  recommendations: string[];
}

interface ReaderReactionsProps {
  text: string;
}

export function ReaderReactions({ text }: ReaderReactionsProps) {
  const [result, setResult] = useState<ReactionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
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
        body: { tool: 'reader-reactions', text },
      });

      if (error) throw error;
      
      // Validate response structure
      if (data && data.engagement && typeof data.engagement.score === 'number' && data.sentiment) {
        setResult(data);
      } else {
        throw new Error('Invalid response from AI. Please try again.');
      }
    } catch (error: any) {
      console.error('Reader reactions error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="w-5 h-5 text-green-600" />;
      case 'negative': return <ThumbsDown className="w-5 h-5 text-destructive" />;
      default: return <Meh className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Reader Reactions</h3>
        </div>
        <Button onClick={handleAnalyze} disabled={isLoading || !text.trim()}>
          <Users className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Analyzing...' : 'Predict'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Predict how readers will react to your content.
      </p>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Engagement Score</span>
              <span className="text-lg font-bold text-primary">{result.engagement.score}%</span>
            </div>
            <Progress value={result.engagement.score} className="h-3" />
            <div className="flex flex-wrap gap-1 mt-3">
              {result.engagement.factors.map((factor, i) => (
                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {factor}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              {getSentimentIcon(result.sentiment.overall)}
              <span className="text-sm font-medium capitalize">
                {result.sentiment.overall} Sentiment
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <Progress value={result.sentiment.breakdown.positive} className="h-2 flex-1 [&>div]:bg-green-500" />
                <span className="text-xs w-8">{result.sentiment.breakdown.positive}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Meh className="w-4 h-4 text-muted-foreground" />
                <Progress value={result.sentiment.breakdown.neutral} className="h-2 flex-1 [&>div]:bg-muted-foreground" />
                <span className="text-xs w-8">{result.sentiment.breakdown.neutral}%</span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-4 h-4 text-destructive" />
                <Progress value={result.sentiment.breakdown.negative} className="h-2 flex-1 [&>div]:bg-destructive" />
                <span className="text-xs w-8">{result.sentiment.breakdown.negative}%</span>
              </div>
            </div>
          </Card>

          {result.reactions.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-medium mb-3">Predicted Reactions</p>
              <div className="space-y-3">
                {result.reactions.map((reaction, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-2xl">{reaction.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{reaction.reaction}</span>
                        <span className="text-xs text-muted-foreground">{reaction.percentage}%</span>
                      </div>
                      <Progress value={reaction.percentage} className="h-1 my-1" />
                      <p className="text-xs text-muted-foreground">{reaction.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.recommendations.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-warning" />
                <p className="text-sm font-medium">Improve Reception</p>
              </div>
              <ul className="space-y-1">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
