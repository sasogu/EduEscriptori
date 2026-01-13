import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
  const { t } = useTranslation();
  return <img src={withBaseUrl('icons/Stopwatch.png')} alt={t('widgets.stopwatch.title')} width={52} height={52} />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'stopwatch',
  title: 'widgets.stopwatch.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 320, height: 450 },
};
