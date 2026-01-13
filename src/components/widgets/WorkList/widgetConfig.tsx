import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'work-list',
    title: 'widgets.work_list.title',
    icon: (() => {
      const WidgetIcon: FC = () => {
        const { t } = useTranslation();
        return <img src={withBaseUrl('icons/WorkList.png')} alt={t('widgets.work_list.title')} width={52} height={52} />;
      };
      return <WidgetIcon />;
    })(),
    defaultSize: { width: 380, height: 400 },
};
