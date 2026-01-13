import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/WorkGestures.png')} alt={t('widgets.work_gestures.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'work-gestures',
  title: 'widgets.work_gestures.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 450, height: 450 },
};
