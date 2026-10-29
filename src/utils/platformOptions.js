// Shared Portal platform enums. Importing these must never initialize scenario storage.
export const PLATFORM_OPTIONS_OVERSEAS = ['apple', 'google', 'PSN', 'windows']
export const PLATFORM_OPTIONS_DOMESTIC = [
  'apple',
  'huawei',
  'vivo',
  'PSN',
  'windows',
  'he',
]

export function getPlatformOptions(region = 'overseas') {
  return region === 'domestic'
    ? PLATFORM_OPTIONS_DOMESTIC
    : PLATFORM_OPTIONS_OVERSEAS
}
