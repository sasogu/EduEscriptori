import type { WidgetConfig } from '../../../types';
import { StickyNote } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-muro',
    title: 'widgets.directo_muro.title',
    icon: <StickyNote size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
