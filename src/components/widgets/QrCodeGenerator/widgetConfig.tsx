import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/QrCodeGenerator.png')} alt={t('widgets.qr_code_generator.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'qr-code-generator',
  title: 'widgets.qr_code_generator.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 350, height: 500 },
};
