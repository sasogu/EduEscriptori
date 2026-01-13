import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'timer',
    title: 'widgets.timer.title',
    icon: (() => {
      const WidgetIcon: FC = () => {
        const { t } = useTranslation();
        return <img src={withBaseUrl('icons/Timer.png')} alt={t('widgets.timer.title')} width={52} height={52} />;
      };
      return <WidgetIcon />;
    })(),
    defaultSize: { width: 300, height: 300 },
};
