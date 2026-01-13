import type { WidgetConfig } from '../../../types';
import { SlidersHorizontal } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'directo-escala',
    title: 'widgets.directo_escala.title',
    icon: <SlidersHorizontal size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
