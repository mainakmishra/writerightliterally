import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Subscript, 
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Undo,
  Redo,
  Printer,
  RemoveFormatting,
  Highlighter,
  Type,
  Palette,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface EditorToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onPrint: () => void;
}

const fontSizes = [
  { value: '1', label: '8pt' },
  { value: '2', label: '10pt' },
  { value: '3', label: '12pt' },
  { value: '4', label: '14pt' },
  { value: '5', label: '18pt' },
  { value: '6', label: '24pt' },
  { value: '7', label: '36pt' },
];

const fontFamilies = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
];

const highlightColors = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'lime', label: 'Green' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'pink', label: 'Pink' },
  { value: 'orange', label: 'Orange' },
];

export function EditorToolbar({ onFormat, onPrint }: EditorToolbarProps) {
  const isMobile = useIsMobile();

  const ToolbarButton = ({ 
    icon: Icon, 
    command, 
    value, 
    tooltip 
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    command: string; 
    value?: string;
    tooltip: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => onFormat(command, value)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Mobile toolbar with dropdown menus
  if (isMobile) {
    return (
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 overflow-x-auto">
        {/* Essential formatting buttons always visible */}
        <ToolbarButton icon={Bold} command="bold" tooltip="Bold" />
        <ToolbarButton icon={Italic} command="italic" tooltip="Italic" />
        <ToolbarButton icon={Underline} command="underline" tooltip="Underline" />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Format Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Type className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Font Family</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {fontFamilies.map((font) => (
                  <DropdownMenuItem 
                    key={font.value} 
                    onClick={() => onFormat('fontName', font.value)}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Font Size</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {fontSizes.map((size) => (
                  <DropdownMenuItem 
                    key={size.value} 
                    onClick={() => onFormat('fontSize', size.value)}
                  >
                    {size.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onFormat('strikeThrough')}>
              <Strikethrough className="h-4 w-4 mr-2" /> Strikethrough
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFormat('subscript')}>
              <Subscript className="h-4 w-4 mr-2" /> Subscript
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFormat('superscript')}>
              <Superscript className="h-4 w-4 mr-2" /> Superscript
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onFormat('removeFormat')}>
              <RemoveFormatting className="h-4 w-4 mr-2" /> Clear Formatting
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Highlight Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Highlighter className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {highlightColors.map((color) => (
              <DropdownMenuItem 
                key={color.value} 
                onClick={() => onFormat('backColor', color.value)}
              >
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: color.value }}
                />
                {color.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* More Options Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AlignLeft className="h-4 w-4 mr-2" /> Alignment
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onFormat('justifyLeft')}>
                  <AlignLeft className="h-4 w-4 mr-2" /> Left
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('justifyCenter')}>
                  <AlignCenter className="h-4 w-4 mr-2" /> Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('justifyRight')}>
                  <AlignRight className="h-4 w-4 mr-2" /> Right
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('justifyFull')}>
                  <AlignJustify className="h-4 w-4 mr-2" /> Justify
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <List className="h-4 w-4 mr-2" /> Lists
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onFormat('insertUnorderedList')}>
                  <List className="h-4 w-4 mr-2" /> Bullet List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('insertOrderedList')}>
                  <ListOrdered className="h-4 w-4 mr-2" /> Numbered List
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('outdent')}>
                  <Outdent className="h-4 w-4 mr-2" /> Decrease Indent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onFormat('indent')}>
                  <Indent className="h-4 w-4 mr-2" /> Increase Indent
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onFormat('undo')}>
              <Undo className="h-4 w-4 mr-2" /> Undo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFormat('redo')}>
              <Redo className="h-4 w-4 mr-2" /> Redo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop toolbar
  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
      {/* Undo/Redo */}
      <ToolbarButton icon={Undo} command="undo" tooltip="Undo (Ctrl+Z)" />
      <ToolbarButton icon={Redo} command="redo" tooltip="Redo (Ctrl+Y)" />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Font Family */}
      <Select onValueChange={(value) => onFormat('fontName', value)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {fontFamilies.map((font) => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select onValueChange={(value) => onFormat('fontSize', value)}>
        <SelectTrigger className="h-8 w-[80px] text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting */}
      <ToolbarButton icon={Bold} command="bold" tooltip="Bold (Ctrl+B)" />
      <ToolbarButton icon={Italic} command="italic" tooltip="Italic (Ctrl+I)" />
      <ToolbarButton icon={Underline} command="underline" tooltip="Underline (Ctrl+U)" />
      <ToolbarButton icon={Strikethrough} command="strikeThrough" tooltip="Strikethrough" />
      <ToolbarButton icon={Subscript} command="subscript" tooltip="Subscript" />
      <ToolbarButton icon={Superscript} command="superscript" tooltip="Superscript" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Highlight */}
      <Select onValueChange={(value) => onFormat('backColor', value)}>
        <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-full h-full">
                <Highlighter className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Highlight</p>
            </TooltipContent>
          </Tooltip>
        </SelectTrigger>
        <SelectContent>
          {highlightColors.map((color) => (
            <SelectItem key={color.value} value={color.value}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: color.value }}
                />
                {color.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToolbarButton icon={RemoveFormatting} command="removeFormat" tooltip="Remove Formatting" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <ToolbarButton icon={AlignLeft} command="justifyLeft" tooltip="Align Left" />
      <ToolbarButton icon={AlignCenter} command="justifyCenter" tooltip="Align Center" />
      <ToolbarButton icon={AlignRight} command="justifyRight" tooltip="Align Right" />
      <ToolbarButton icon={AlignJustify} command="justifyFull" tooltip="Justify" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolbarButton icon={List} command="insertUnorderedList" tooltip="Bullet List" />
      <ToolbarButton icon={ListOrdered} command="insertOrderedList" tooltip="Numbered List" />
      <ToolbarButton icon={Outdent} command="outdent" tooltip="Decrease Indent" />
      <ToolbarButton icon={Indent} command="indent" tooltip="Increase Indent" />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Print */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onPrint}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Print (Ctrl+P)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}