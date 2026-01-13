import type { WidgetConfig } from '../../../types';
import { Cloud } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-nube',
    title: 'widgets.directo_nube.title',
    icon: <Cloud size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
