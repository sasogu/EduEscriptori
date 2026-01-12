import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
  const { t } = useTranslation();
  return <img src={withBaseUrl('icons/ImageCarousel.png')} alt={t('widgets.image_carousel.title')} width={52} height={52} />;
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'image-carousel',
  title: 'widgets.image_carousel.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 500, height: 400 },
};
