import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  RefreshCw, 
  FileText, 
  User, 
  Shield, 
  CheckCircle, 
  BookOpen, 
  GraduationCap, 
  Users,
  X,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIChat } from '@/components/tools/AIChat';
import { AIRewriter } from '@/components/tools/AIRewriter';
import { AIParaphraser } from '@/components/tools/AIParaphraser';
import { AIHumanizer } from '@/components/tools/AIHumanizer';
import { AIDetector } from '@/components/tools/AIDetector';
import { FactChecker } from '@/components/tools/FactChecker';
import { CitationFinder } from '@/components/tools/CitationFinder';
import { AIGrader } from '@/components/tools/AIGrader';
import { ReaderReactions } from '@/components/tools/ReaderReactions';

interface Tool {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

interface ToolsIconBarProps {
  text: string;
  onApplyRewrite: (newText: string) => void;
}

const tools: Tool[] = [
  { id: 'chat', label: 'AI Chat', icon: MessageSquare, color: 'text-primary' },
  { id: 'rewriter', label: 'Rewriter', icon: RefreshCw, color: 'text-blue-500' },
  { id: 'paraphraser', label: 'Paraphraser', icon: FileText, color: 'text-violet-500' },
  { id: 'humanizer', label: 'Humanizer', icon: User, color: 'text-emerald-500' },
  { id: 'detector', label: 'AI Detector', icon: Shield, color: 'text-amber-500' },
  { id: 'factcheck', label: 'Fact Check', icon: CheckCircle, color: 'text-green-500' },
  { id: 'citation', label: 'Citations', icon: BookOpen, color: 'text-pink-500' },
  { id: 'grader', label: 'Grader', icon: GraduationCap, color: 'text-orange-500' },
  { id: 'reactions', label: 'Reactions', icon: Users, color: 'text-cyan-500' },
];

export function ToolsIconBar({ text, onApplyRewrite }: ToolsIconBarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const handleToolClick = (toolId: string) => {
    setActiveTool(activeTool === toolId ? null : toolId);
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'chat':
        return <AIChat text={text} />;
      case 'rewriter':
        return <AIRewriter text={text} onApply={onApplyRewrite} />;
      case 'paraphraser':
        return <AIParaphraser text={text} onApply={onApplyRewrite} />;
      case 'humanizer':
        return <AIHumanizer text={text} onApply={onApplyRewrite} />;
      case 'detector':
        return <AIDetector text={text} />;
      case 'factcheck':
        return <FactChecker text={text} />;
      case 'citation':
        return <CitationFinder text={text} />;
      case 'grader':
        return <AIGrader text={text} />;
      case 'reactions':
        return <ReaderReactions text={text} />;
      default:
        return null;
    }
  };

  const activeToolData = tools.find(t => t.id === activeTool);

  return (
    <div className="flex h-full">
      {/* Expanded Tool Panel */}
      {activeTool && (
        <div className="w-80 lg:w-96 bg-card border-l border-border flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              {activeToolData && (
                <>
                  <activeToolData.icon className={cn("h-5 w-5", activeToolData.color)} />
                  <h3 className="font-semibold text-foreground">{activeToolData.label}</h3>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setActiveTool(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {renderToolContent()}
          </div>
        </div>
      )}

      {/* Icon Bar */}
      <div className="w-14 bg-card border-l border-border flex flex-col items-center py-4 gap-1">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const isHovered = hoveredTool === tool.id;
          
          return (
            <div
              key={tool.id}
              className="relative"
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
            >
              <button
                onClick={() => handleToolClick(tool.id)}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 ring-2 ring-primary" 
                    : "hover:bg-muted"
                )}
              >
                <tool.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? tool.color : "text-muted-foreground hover:text-foreground"
                )} />
              </button>
              
              {/* Tooltip */}
              {isHovered && !isActive && (
                <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50">
                  <div className="bg-popover text-popover-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-lg border border-border whitespace-nowrap animate-fade-in">
                    {tool.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
