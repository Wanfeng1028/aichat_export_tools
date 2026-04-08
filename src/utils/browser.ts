export function isExtensionEnvironment(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
}
