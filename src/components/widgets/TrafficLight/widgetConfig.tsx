import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/TrafficLight.png')} alt={t('widgets.traffic_light.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'traffic-light',
  title: 'widgets.traffic_light.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 150, height: 350 },
};
