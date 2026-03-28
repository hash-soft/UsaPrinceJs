export const enum EResolve {
  Width = 512,
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  Height = 512,
}

export const enum EMapScale {
  /**
   * マップの内部倍率 8
   */
  Scale = 8,
  /**
   * 標準速度 4 * 8
   */
  DefaultSpeed = 4 * Scale,
  /**
   * 標準足踏み速度 2 * 8
   */
  DefaultStepSpeed = 2 * Scale,
}

export const enum EMap {
  /**
   * タイルサイズ 32
   */
  TileSize = 32,
  /**
   * 内部尺度 32 * 8
   */
  RealScale = TileSize * EMapScale.Scale,
}

export const enum ECharacter {
  /**
   * 切替アニメカウント 32 * 8
   * 切替カウント * 尺度
   */
  SwitchAnimeCount = 32 * EMapScale.Scale,
  /**
   * 最大アニメカウント 32 * 8 * 4 * 3
   * 切替アニメカウント * 最大パターン数 * (最大パターン数-1)
   */
  MaxAnimeCount = SwitchAnimeCount * 4 * 3,
  /**
   * 左の表示位置はみ出しサイズ
   */
  LeftOut = 16,
  /**
   * 上の表示位置はみ出しサイズ
   */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  TopOut = 16,
}

declare const $testPlay: boolean | undefined;
/**
 * テストプレイかどうかを取得する
 * @returns
 */
export const checkTestPlay = () => {
  return typeof $testPlay === 'boolean' ? $testPlay : false;
};

export interface Screenshot {
  path: string;
  format: string;
}

export interface UsaConfig {
  logLevel: number;
  compress: boolean;
  screenshot: Screenshot;
  keyboard: string[][];
  gamePad: string[][];
}

export const usaConfigName = 'config.json';

export const defaultScreenshot: Screenshot = {
  path: 'screenshots',
  format: 'UsaPrince_[d].png',
};

let saveDataCompress = true;
export const setSaveDataCompress = (compress: boolean) => {
  saveDataCompress = compress;
};
export const getSaveDataCompress = () => {
  return saveDataCompress;
};
