const wallpaperImports = import.meta.glob('../assets/backgrounds/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

type WallpaperOption = {
  id: string;
  sizes: number[];
  urlsBySize: Record<number, string>;
  previewUrl: string;
  urls: string[];
};

const grouped: Record<string, Record<number, string>> = {};
const pattern = /\/([^/]+?)(?:-(\d+))?\.webp$/;

Object.entries(wallpaperImports).forEach(([path, url]) => {
  const match = path.match(pattern);
  if (!match) return;
  const id = match[1];
  const size = match[2] ? Number(match[2]) : 0;
  if (!grouped[id]) grouped[id] = {};
  grouped[id][size] = url;
});

export const wallpaperOptions: WallpaperOption[] = Object.entries(grouped)
  .map(([id, urlsBySize]) => {
    const sizes = Object.keys(urlsBySize).map(Number).sort((a, b) => a - b);
    const previewSize = sizes[0];
    return {
      id,
      sizes,
      urlsBySize,
      previewUrl: urlsBySize[previewSize],
      urls: sizes.map(size => urlsBySize[size]),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const getTargetWidth = () => {
  if (typeof window === 'undefined') return 1920;
  return Math.floor(window.innerWidth * (window.devicePixelRatio || 1));
};

export const getBestWallpaperUrl = (option: WallpaperOption) => {
  const target = getTargetWidth();
  const match = option.sizes.find(size => size >= target);
  const size = match ?? option.sizes[option.sizes.length - 1];
  return option.urlsBySize[size];
};

export const getWallpaperValue = (option: WallpaperOption) => `url(${getBestWallpaperUrl(option)})`;

export const wallpaperValues = new Set(
  wallpaperOptions.flatMap(option => option.urls.map(url => `url(${url})`))
);

export const isWallpaperValueValid = (value: string) => wallpaperValues.has(value);

export const defaultWallpaperValue = wallpaperOptions[0]
  ? getWallpaperValue(wallpaperOptions[0])
  : 'none';
