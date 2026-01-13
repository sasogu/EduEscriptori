import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/Scoreboard.png')} alt={t('widgets.scoreboard.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'scoreboard',
  title: 'widgets.scoreboard.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 400, height: 450 },
};
