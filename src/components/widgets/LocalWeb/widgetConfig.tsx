import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'local-web',
    title: 'widgets.local_web.title',
    icon: (() => {
        const WidgetIcon: FC = () => {
            const { t } = useTranslation();
            return <img src={withBaseUrl('icons/LocalWeb.png')} alt={t('widgets.local_web.title')} width={52} height={52} />;
        };
        return <WidgetIcon />;
    })(),
    defaultSize: { width: 900, height: 600 },
};
