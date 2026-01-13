import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/SlidePuzzle.png')} alt={t('widgets.sliding_puzzle.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'sliding-puzzle',
  title: 'widgets.sliding_puzzle.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 450, height: 550 },
};
