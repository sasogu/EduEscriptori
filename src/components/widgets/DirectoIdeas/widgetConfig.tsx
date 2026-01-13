import type { WidgetConfig } from '../../../types';
import { Lightbulb } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-ideas',
    title: 'widgets.directo_ideas.title',
    icon: <Lightbulb size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
