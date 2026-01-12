import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
  const { t } = useTranslation();
  return <img src={withBaseUrl('icons/Directo.png')} alt={t('widgets.directo_viewer.title')} width={52} height={52} />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'directo-viewer',
  title: 'widgets.directo_viewer.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 800, height: 600 },
};
