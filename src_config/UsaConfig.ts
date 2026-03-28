/**
 * 設定の定義
 */

export const enum EKeyType {
  Menu = 0,
  Close = 1,
  Multi = 2,
  AllClose = 3,
  Up = 4,
  Right = 5,
  Down = 6,
  Left = 7,
}

export type KeyMap = string[][];

export interface Screenshot {
  path: string;
  format: string;
}

export interface UsaConfig {
  logLevel?: number;
  compress?: boolean;
  screenshot?: Screenshot;
  keyboard: KeyMap;
  gamePad: KeyMap;
}

export const defaultConfig: UsaConfig = {
  keyboard: [
    ['KeyC', 'Enter'],
    ['KeyX', 'Escape'],
    ['KeyD', 'Space'],
    ['KeyA', 'Delete'],
    ['ArrowUp'],
    ['ArrowDown'],
    ['ArrowLeft'],
    ['ArrowRight'],
  ],
  gamePad: [
    ['2', '7'],
    ['3', '5'],
    ['1', '8'],
    ['4', '9'],
    ['13'],
    ['14'],
    ['15'],
    ['16'],
  ],
};

export const usaConfigName = 'config.json';
