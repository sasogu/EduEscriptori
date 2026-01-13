import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { withBaseUrl } from '../../../utils/assetPaths';
import type { WidgetConfig } from '../../../types';

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
  id: 'latex-markdown',
  title: 'widgets.latex_markdown.title',
  icon: (() => {
    const WidgetIcon: FC = () => {
      const { t } = useTranslation();
      return <img src={withBaseUrl('icons/LatexMarkdown.png')} alt={t('widgets.latex_markdown.title')} width={52} height={52} />;
    };
    return <WidgetIcon />;
  })(),
  defaultSize: { width: 900, height: 550 },
};
