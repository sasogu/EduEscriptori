import type { WidgetConfig } from '../../../types';
import { BookOpen } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'program-guide',
    title: 'widgets.program_guide.title',
    icon: <BookOpen size={44} />,
    defaultSize: { width: 800, height: 600 },
};
