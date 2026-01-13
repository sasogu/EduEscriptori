import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'global-clocks',
  title: 'widgets.global_clocks.title',
  icon: (() => {
    const WidgetIcon: FC = () => {
      const { t } = useTranslation();
      return <img src={withBaseUrl('icons/GlobalClocks.png')} alt={t('widgets.global_clocks.title')} width={52} height={52} />;
    };
    return <WidgetIcon />;
  })(),
  defaultSize: { width: 350, height: 400 },
};
