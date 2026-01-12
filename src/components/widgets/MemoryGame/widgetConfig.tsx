import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
  const { t } = useTranslation();
  return <img src={withBaseUrl('icons/MemoryGame.png')} alt={t('widgets.memory_game.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'memory-game',
  title: 'widgets.memory_game.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 500, height: 550 },
};
