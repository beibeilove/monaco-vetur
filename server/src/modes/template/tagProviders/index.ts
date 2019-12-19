import { IHTMLTagProvider } from './common';
import { getHTML5TagProvider } from './htmlTags';
import { getVueTagProvider } from './vueTags';
import { getRouterTagProvider } from './routerTags';
export { getComponentInfoTagProvider as getComponentTags } from './componentInfoTagProvider';
export { IHTMLTagProvider } from './common';

export let allTagProviders: IHTMLTagProvider[] = [getHTML5TagProvider(), getVueTagProvider(), getRouterTagProvider()];

export interface CompletionConfiguration {
  [provider: string]: boolean;
}

export function getTagProviderSettings() {
  const settings: CompletionConfiguration = {
    html5: true,
    vue: true
  };

  return settings;
}

export function getEnabledTagProviders(tagProviderSetting: CompletionConfiguration) {
  return allTagProviders.filter(p => tagProviderSetting[p.getId()] !== false);
}
