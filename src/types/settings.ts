export interface Settings {
  theme: string; // Selected theme ID
  currency: string; // Selected currency ID
  language: string; // Selected language ID
}

export const defaultSettings: Settings = {
  theme: 'forest',
  currency: 'cny',
  language: 'zh-cn',
};

