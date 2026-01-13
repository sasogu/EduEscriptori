import type { WidgetConfig } from '../../../types';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';

const WidgetIcon: FC = () => {
    const { t } = useTranslation();
    return <img src={withBaseUrl('icons/Notepad.png')} alt={t('widgets.notepad.icon_alt')} width="52" height="52" />;
}

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'notepad',
  title: 'widgets.notepad.title',
  icon: <WidgetIcon />,
  defaultSize: { width: 500, height: 450 },
};
