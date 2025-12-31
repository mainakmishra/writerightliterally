import { WritingStats } from '@/types/grammar';
import { ScoreCircle } from './ScoreCircle';
import { Clock, FileText, Hash, MessageSquare, Mic } from 'lucide-react';

interface StatsPanelProps {
  stats: WritingStats;
  overallScore: number;
}

export function StatsPanel({ stats, overallScore }: StatsPanelProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getReadabilityLabel = (score: number) => {
    if (score >= 80) return 'Easy';
    if (score >= 60) return 'Standard';
    if (score >= 40) return 'Difficult';
    return 'Very Difficult';
  };

  return (
    <div className="bg-card rounded-xl shadow-medium border border-border p-6">
      {/* Score Section */}
      <div className="flex items-center gap-6 mb-6 pb-6 border-b border-border">
        <ScoreCircle score={overallScore} size="lg" />
        <div>
          <h3 className="font-semibold text-foreground mb-1">Overall Score</h3>
          <p className="text-sm text-muted-foreground">
            {overallScore >= 80 
              ? 'Excellent writing quality!' 
              : overallScore >= 60 
                ? 'Good, with room for improvement' 
                : 'Needs some work'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatItem
          icon={Hash}
          label="Words"
          value={stats.wordCount.toLocaleString()}
        />
        <StatItem
          icon={FileText}
          label="Characters"
          value={stats.characterCount.toLocaleString()}
        />
        <StatItem
          icon={MessageSquare}
          label="Sentences"
          value={stats.sentenceCount.toLocaleString()}
        />
        <StatItem
          icon={Clock}
          label="Reading Time"
          value={formatTime(stats.readingTime)}
        />
        <StatItem
          icon={Mic}
          label="Speaking Time"
          value={formatTime(stats.speakingTime)}
        />
        <StatItem
          icon={FileText}
          label="Readability"
          value={getReadabilityLabel(stats.readabilityScore)}
          sublabel={`Score: ${stats.readabilityScore}`}
        />
      </div>
    </div>
  );
}

interface StatItemProps {
  icon: typeof Clock;
  label: string;
  value: string;
  sublabel?: string;
}

function StatItem({ icon: Icon, label, value, sublabel }: StatItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-lg font-semibold text-foreground">{value}</span>
      {sublabel && (
        <span className="text-xs text-muted-foreground">{sublabel}</span>
      )}
    </div>
  );
}
