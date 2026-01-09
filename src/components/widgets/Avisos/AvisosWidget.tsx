import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { WidgetConfig } from '../../../types';
import { withBaseUrl } from '../../../utils/assetPaths';
import './AvisosWidget.css';

export const AvisosWidget: FC = () => {
    const { t } = useTranslation();

    return (
        <div className="avisos-widget">
            <iframe
                className="avisos-iframe"
                src={withBaseUrl('Avisos/index.html')}
                title={t('widgets.avisos.title')}
                sandbox="allow-same-origin allow-scripts allow-forms"
            />
        </div>
    );
};

const WidgetIcon: FC = () => {
    const { t } = useTranslation();

    return (
        <img
            src={withBaseUrl('icons/WorkList.png')}
            alt={t('widgets.avisos.title')}
            width={52}
            height={52}
        />
    );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'avisos',
    title: 'widgets.avisos.title',
    icon: <WidgetIcon />,
    defaultSize: { width: 900, height: 650 },
};
