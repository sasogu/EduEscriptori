import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
  const { t } = useTranslation();
  return <img src={withBaseUrl('icons/Iframe.png')} alt={t('widgets.iframe.title')} width={52} height={52} />;
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'iframe',
  title: 'widgets.iframe.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 600, height: 500 },
};
