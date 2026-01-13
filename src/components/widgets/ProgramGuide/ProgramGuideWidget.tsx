import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { withBaseUrl } from '../../../utils/assetPaths';
import './ProgramGuideWidget.css';

const guideFiles: Record<string, string> = {
    es: 'Guia-Escritorio-Digital.md',
    ca: 'Guia-Escritorio-Digital.ca.md',
    eu: 'Guia-Escritorio-Digital.eu.md',
    gl: 'Guia-Escritorio-Digital.gl.md',
    en: 'Guia-Escritorio-Digital.en.md',
    fr: 'Guia-Escritorio-Digital.fr.md',
    it: 'Guia-Escritorio-Digital.it.md',
    de: 'Guia-Escritorio-Digital.de.md',
    pt: 'Guia-Escritorio-Digital.pt.md',
};

const getGuideFile = (language: string) => {
    const base = language.split('-')[0];
    return guideFiles[base] ?? guideFiles.es;
};

export const ProgramGuideWidget = () => {
    const { t, i18n } = useTranslation();
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const guideFile = useMemo(() => getGuideFile(i18n.language), [i18n.language]);

    useEffect(() => {
        let isMounted = true;
        const loadGuide = async () => {
            setIsLoading(true);
            setHasError(false);
            try {
                const response = await fetch(withBaseUrl(guideFile), { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('Guide not found');
                }
                const markdown = await response.text();
                const html = marked.parse(markdown) as string;
                if (isMounted) {
                    setContent(html);
                }
            } catch {
                if (isMounted) {
                    setHasError(true);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        loadGuide();
        return () => {
            isMounted = false;
        };
    }, [guideFile]);

    if (isLoading) {
        return <div className="program-guide-status">{t('loading')}</div>;
    }

    if (hasError) {
        return <div className="program-guide-status">{t('widgets.program_guide.load_error')}</div>;
    }

    return (
        <div className="program-guide-content">
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
};

export { widgetConfig } from './widgetConfig';
