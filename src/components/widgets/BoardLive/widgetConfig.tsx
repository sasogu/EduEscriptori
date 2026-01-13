import type { WidgetConfig } from '../../../types';
import { Presentation } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'boardlive',
    title: 'widgets.boardlive.title',
    icon: <Presentation size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
