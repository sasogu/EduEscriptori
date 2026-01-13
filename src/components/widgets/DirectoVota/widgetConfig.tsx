import type { WidgetConfig } from '../../../types';
import { BarChart3 } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-vota',
    title: 'widgets.directo_vota.title',
    icon: <BarChart3 size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
