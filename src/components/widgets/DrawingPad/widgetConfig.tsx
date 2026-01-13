import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

export const widgetConfig = {
  id: 'drawing-pad',
  title: 'widgets.drawing_pad.title',
  // RUTA DEL ICONO PERSONALIZADA: Asegúrate de que paleta.png esté en public/icons/
  icon: (() => {
    const WidgetIcon: FC = () => {
      const { t } = useTranslation();
      return <img src={withBaseUrl('icons/paleta.png')} alt={t('widgets.drawing_pad.title')} className="w-8 h-8" />;
    };
    return <WidgetIcon />;
  })(),
  defaultSize: { width: 600, height: 450 },
};
