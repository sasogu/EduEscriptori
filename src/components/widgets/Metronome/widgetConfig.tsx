import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'metronome',
  title: 'widgets.metronome.title',
  icon: (() => {
    const WidgetIcon: FC = () => {
      const { t } = useTranslation();
      return <img src={withBaseUrl('icons/Metronome.png')} alt={t('widgets.metronome.title')} width={52} height={52} />;
    };
    return <WidgetIcon />;
  })(),
  defaultSize: { width: 300, height: 400 },
};
