import { useState } from 'react';
import { GraduationCap, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CriteriaScore {
  score: number;
  feedback: string;
}

interface GradeResult {
  overallGrade: string;
  numericScore: number;
  criteria: {
    clarity: CriteriaScore;
    organization: CriteriaScore;
    grammar: CriteriaScore;
    vocabulary: CriteriaScore;
    argumentation: CriteriaScore;
    originality: CriteriaScore;
  };
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

interface AIGraderProps {
  text: string;
  onGrade: (text: string) => Promise<GradeResult | null>;
  isLoading: boolean;
}

export function AIGrader({ text, onGrade, isLoading }: AIGraderProps) {
  const [result, setResult] = useState<GradeResult | null>(null);
  const { toast } = useToast();

  const handleGrade = async () => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'No text to grade',
        description: 'Please enter some text in the editor first.',
      });
      return;
    }
    const data = await onGrade(text);
    if (data) {
      setResult(data);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500 text-white';
      case 'B': return 'bg-blue-500 text-white';
      case 'C': return 'bg-yellow-500 text-white';
      case 'D': return 'bg-orange-500 text-white';
      case 'F': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const criteriaLabels = {
    clarity: 'Clarity',
    organization: 'Organization',
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    argumentation: 'Argumentation',
    originality: 'Originality',
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Grader</h3>
        </div>
        <Button onClick={handleGrade} disabled={isLoading || !text.trim()}>
          <Award className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Grading...' : 'Grade'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Get detailed academic-style grading and feedback on your writing.
      </p>

      {result && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-6 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold ${getGradeColor(result.overallGrade)}`}>
              {result.overallGrade}
            </div>
            <p className="text-2xl font-bold mt-3">{result.numericScore}/100</p>
            <p className="text-sm text-muted-foreground">Overall Score</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium mb-4">Criteria Breakdown</p>
            <div className="space-y-3">
              {Object.entries(result.criteria).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{criteriaLabels[key as keyof typeof criteriaLabels]}</span>
                    <span className="font-semibold">{value.score}/100</span>
                  </div>
                  <Progress value={value.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{value.feedback}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium">Strengths</p>
              </div>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-warning" />
                <p className="text-sm font-medium">To Improve</p>
              </div>
              <ul className="space-y-1">
                {result.improvements.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-warning">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-4">
            <p className="text-sm font-medium mb-2">Detailed Feedback</p>
            <p className="text-sm text-muted-foreground">{result.detailedFeedback}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
