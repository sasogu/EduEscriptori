import type { FC } from 'react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';
import './TrafficLight.css';

type LightState = 'red' | 'yellow' | 'green';

const Light: FC<{ color: string; active: boolean }> = ({ color, active }) => {
  const baseStyle = 'traffic-light-bulb rounded-full border-gray-700 transition-all duration-300';
  
  const colorVariants = {
    red: 'bg-red-500 shadow-[0_0_20px_5px_var(--tw-shadow-color)] shadow-red-400',
    yellow: 'bg-yellow-500 shadow-[0_0_20px_5px_var(--tw-shadow-color)] shadow-yellow-400',
    green: 'bg-green-500 shadow-[0_0_20px_5px_var(--tw-shadow-color)] shadow-green-400',
  };

  const inactiveStyle = 'bg-gray-500 opacity-30';
  const dynamicActiveStyle = active ? colorVariants[color as keyof typeof colorVariants] : inactiveStyle;

  return <div className={`${baseStyle} ${dynamicActiveStyle}`} />;
};

export const TrafficLightWidget: FC = () => {
  const { t } = useTranslation();
  const [activeLight, setActiveLight] = useLocalStorage<LightState>('traffic-light-state', 'red');

  const handleClick = () => {
    if (activeLight === 'red') {
      setActiveLight('green');
    } else if (activeLight === 'green') {
      setActiveLight('yellow');
    } else {
      setActiveLight('red');
    }
  };

  return (
    <div 
      className="traffic-light-widget cursor-pointer"
      onClick={handleClick}
      title={t('widgets.traffic_light.tooltip')}
    >
      <div className="traffic-light-housing">
        <Light color="red" active={activeLight === 'red'} />
        <Light color="yellow" active={activeLight === 'yellow'} />
        <Light color="green" active={activeLight === 'green'} />
      </div>
    </div>
  );
};

export { widgetConfig } from './widgetConfig';
