import type { WidgetConfig } from '../../../types';
import { Gamepad2 } from 'lucide-react';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'qplay',
    title: 'widgets.qplay.title',
    icon: <Gamepad2 size={44} className="text-indigo-600" />,
    defaultSize: { width: 900, height: 600 },
};
