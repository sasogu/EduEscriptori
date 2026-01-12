import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/RandomSpinner.png')} alt={t('widgets.random_spinner.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'random-spinner',
  title: 'widgets.random_spinner.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 720, height: 420 },
};
