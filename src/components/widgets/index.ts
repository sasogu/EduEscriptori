import { lazy } from 'react';
import type { FC } from 'react';
import type { WidgetConfig } from '../../types';

type WidgetConfigModule = {
    widgetConfig: Omit<WidgetConfig, 'component'>;
};

// 1. Importamos solo la configuración (ligera) de forma síncrona.
const configModules = import.meta.glob<WidgetConfigModule>('./*/widgetConfig.tsx', { eager: true });

// 2. Preparamos los loaders asíncronos para los componentes.
const componentLoaders = import.meta.glob('./*/*Widget.tsx');

// 3. Creamos el registro que vamos a exportar.
const WIDGET_REGISTRY_TEMP: Record<string, WidgetConfig> = {};

// 4. Iteramos sobre las configuraciones encontradas.
for (const path in configModules) {
    const mod = configModules[path];
    if (!mod || !mod.widgetConfig) {
        console.warn(`[Widget Registry] El módulo en "${path}" no parece ser un widget válido porque le falta la exportación 'widgetConfig'.`);
        continue;
    }
    const config = mod.widgetConfig;
    const folderPath = path.slice(0, path.lastIndexOf('/'));
    const componentPath = Object.keys(componentLoaders).find(
        (modulePath) => modulePath.startsWith(`${folderPath}/`) && modulePath.endsWith('Widget.tsx')
    );

    if (!componentPath) {
        console.warn(`[Widget Registry] No se encontró un componente para la carpeta "${folderPath}".`);
        continue;
    }

    const loader = componentLoaders[componentPath] as () => Promise<Record<string, unknown>>;
    const LazyComponent = lazy(async () => {
        const componentModule = await loader();
        const componentKey = Object.keys(componentModule).find((key) => key.endsWith('Widget'));
        const Component = componentKey ? componentModule[componentKey] : componentModule.default;
        if (!Component) {
            throw new Error(`[Widget Registry] El módulo "${componentPath}" no exporta un componente válido.`);
        }
        return { default: Component as FC };
    });

    WIDGET_REGISTRY_TEMP[config.id] = {
        ...config,
        component: LazyComponent,
    };
}

// 5. Exportamos el registro final y completo.
export const WIDGET_REGISTRY = WIDGET_REGISTRY_TEMP;
