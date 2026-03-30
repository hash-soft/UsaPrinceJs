/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Random from './Random';

export type Constructor<T> = new (...args: any[]) => T;

export interface SuspendObjectUtils {
  frameCount: number;
  startPlayCount: number;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}

/**
 * ゲームに依存しないユーティリティクラス
 */
export default class Utils {
  /**
   * フレームカウント
   */
  private static _frameCount = 0;
  /**
   * 開始時のプレイカウント
   */
  private static _startPlayCount = 0;
  /**
   * プログラムエラー例外に入れるテキスト
   * プログラムが正しければ起こりえない場所の例外に入れる
   */
  static programErrorText = 'Program Error!!';
  /**
   * 数値をそのまま返すだけの関数
   * @param value
   * @returns
   */
  static getAsFn = (value: number) => value;
  /**
   * 数値をマイナスにして返すだけの関数
   * @param value
   * @returns
   */
  static getMinusFn = (value: number) => -value;
  /**
   * Error配列
   */
  private static Errors = new Array<Error>();

  /**
   * electron上で実行しているか
   * @returns
   */
  static runningElectron() {
    return typeof window.file === 'object';
  }

  static runningAndroid() {
    return typeof window.android === 'object';
  }

  //---------------------------------------------
  // 中断データ

  /**
   * 中断データから読み込み
   * @param data
   */
  static loadSuspend(data: SuspendObjectUtils) {
    this._frameCount = data.frameCount ?? this._frameCount;
    this._startPlayCount = data.startPlayCount ?? this._startPlayCount;
    const sTotal = data.s0 + data.s1 + data.s2 + data.s3;
    if (typeof sTotal === 'number') {
      this.setRandomState(data.s0, data.s1, data.s2, data.s3);
    } else {
      this.seed();
    }
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  static createSuspendObject(): SuspendObjectUtils {
    const [s0, s1, s2, s3] = [...this.getRandomState()];
    return {
      frameCount: this._frameCount,
      startPlayCount: this._startPlayCount,
      s0,
      s1,
      s2,
      s3,
    };
  }

  //---------------------------------------------
  // エラー

  /**
   * エラーを追加する
   * @param error
   */
  static pushError(error: Error) {
    this.Errors.push(error);
  }

  /**
   * エラーの最後を取り出す
   * @returns
   */
  static popError() {
    return this.Errors.pop();
  }

  /**
   * エラーの先頭を取り出す
   * @returns
   */
  static shiftError() {
    return this.Errors.shift();
  }

  //---------------------------------------------
  // システム

  /**
   * クラスを取得する
   * @param obj
   */
  static getClass(obj: string) {
    return Function('return (' + obj + ')')();
  }

  /**
   * ファイル名から拡張子を取り除く
   * @param {String} str
   */
  static baseName(str: string) {
    if (str.lastIndexOf('.') !== -1) {
      return str.substring(0, str.lastIndexOf('.'));
    }
    return str;
  }

  /**
   * インデックス配列に変換する
   * @param array
   * @returns
   */
  static toIndices<T>(array: T[]) {
    return this.makeIndices(array.length);
  }

  /**
   * インデックス配列を作成する
   * @param length
   * @returns
   */
  static makeIndices(length: number) {
    return Array.from({ length }).map((_, i) => i);
  }

  /**
   * 配列インデックスに変換する
   * @param array
   * @param index
   * @returns
   */
  static toArrayIndex(array: number[], index: number) {
    for (let i = 0; i < array.length; i++) {
      if (index < array[i]) {
        return [i, index];
      }
      index -= array[i];
    }
    return [-1, -1];
  }

  /**
   * 配列の指定インデックスから一周回って検索する
   * @param array
   * @param callBackFn
   * @param fromIndex
   * @returns
   */
  static findArrayIndexRound<T>(
    array: T[],
    callBackFn: () => boolean,
    fromIndex: number,
  ) {
    const array1 = array.slice(fromIndex);
    const find1 = array1.findIndex(callBackFn);
    if (find1 >= 0) {
      return fromIndex + find1;
    }
    const array2 = array.slice(0, fromIndex);
    return array2.findIndex(callBackFn);
  }

  //---------------------------------------------
  // 計測

  /**
   * 計測開始
   */
  static measureStart() {
    performance.mark('UtilsPerformanceStart');
  }

  /**
   * 計測終了
   * コンソールの表示が目的なので素のconsole.logを使用する
   */
  static measureEnd() {
    performance.mark('UtilsPerformanceStop');
    performance.measure(
      'UtilsPerformance',
      'UtilsPerformanceStart',
      'UtilsPerformanceStop',
    );
    const entries = performance.getEntriesByName('UtilsPerformance');
    console.log(`measure: ${entries[0].duration}`);
    performance.clearMeasures();
  }

  //---------------------------------------------
  // ゲーム

  /**
   * 開始時のプレイカウントを設定する
   * @param count
   */
  static setStartPlayCount(count: number) {
    this._startPlayCount = count;
  }

  /**
   * 開始時のプレイカウントを取得する
   * @returns
   */
  static getStartPlayCount() {
    return this._startPlayCount;
  }

  /**
   * プレイカウントを取得する
   * @returns
   */
  static getPlayCount() {
    const playCount = this._startPlayCount + this._frameCount;
    // 99時間59分59秒を最大値とする
    // 1秒60フレーム
    return Math.min(playCount, (99 * 60 * 60 + 59 * 60 + 59) * 60);
  }

  /**
   * フレームカウントを進める
   * フレームカウントは起動からの経過時間や乱数の種に使用する
   */
  static addFrameCount() {
    this._frameCount += 1;
  }

  /**
   * フレームカウントをリセットする
   */
  static resetFrameCount() {
    this._frameCount = 0;
  }

  /**
   * フレームカウントを取得する
   */
  static getFrameCount() {
    return this._frameCount;
  }

  /**
   * 乱数の種まき
   */
  static seed() {
    Random.setSeed(Utils.getFrameCount());
  }

  /**
   * 乱数の状態を設定する
   * @param s1
   * @param s2
   * @param s3
   * @param s4
   */
  static setRandomState(s1: number, s2: number, s3: number, s4: number) {
    Random.setState(s1, s2, s3, s4);
  }

  /**
   * 乱数の状態を取得する
   * @returns
   */
  static getRandomState() {
    return Random.getState();
  }

  /**
   * 範囲の乱数整数で取得 min <= value < max
   * @param {*} min
   * @param {*} max
   */
  static randomInt(min?, max?) {
    return Random.nextInt(min, max);
  }

  /**
   * 偏り付き乱数取得
   * @param min
   * @param max
   * @param bias
   * @returns
   */
  static biasedRandomInt(min: number, max: number, bias: number) {
    if (bias) {
      const biasedMin = bias < 0 ? min + bias : min;
      const biasedMax = bias > 0 ? max + bias : max;
      const rand = this.randomInt(biasedMin, biasedMax);
      return this.clamp(rand, min, max - 1);
    } else {
      return this.randomInt(min, max);
    }
  }

  /**
   * 0～1の乱数を取得する
   * @returns
   */
  static random() {
    return Random.next();
  }

  /**
   * ランダムで大小を決定する
   * @param num
   * @param max
   * @returns false:大 true:小
   */
  static bigOrSmall(num: number, max: number) {
    return this.randomInt(0, max) < num;
  }

  /**
   * 値が下限か上限を超えていたら補正する
   * @param value
   * @param min
   * @param max
   */
  static clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 割合計算
   * @param value
   * @param rate
   */
  static calcRate(value: number, rate: number) {
    return Math.floor(value * rate * 0.01);
  }

  /**
   * 矩形オブジェクトを作成
   * @param x
   * @param y
   * @param width
   * @param height
   */
  static rect(x: number, y: number, width: number, height: number) {
    return { x, y, width, height };
  }

  /**
   * 処理を計測しコンソールに表示する
   * コンソールの表示が目的なので素のconsole.logを使用する
   * @param name
   * @param fn
   * @param context
   * @param arg
   */
  static measureFunc(name: string, fn, context, ...arg) {
    const start = performance.now();
    fn.call(context, ...arg);
    const end = performance.now();

    const elapsed = end - start;
    const elapsedStr = elapsed.toPrecision(3);
    console.log(`${name}: ${elapsedStr}`);
  }

  /**
   * 半角を全角に変換
   * @param item 変換対象のテキストまたは数値
   * @param char 前方に埋める文字
   * @param cnt 変換後の桁数 +前方に埋める -後方に埋める
   */
  static convertFull(item: string | number, char?: string, cnt = 0): string {
    const itemText = typeof item === 'number' ? item.toString() : item;
    const text = itemText.replace(/./g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) + 65248);
    });
    if (char) {
      if (cnt > 0) {
        return text.padStart(cnt, char);
      } else {
        return text.padEnd(-cnt, char);
      }
    } else {
      return text;
    }
  }

  /**
   * idを0パディングする
   * @param id
   * @param digits
   * @returns
   */
  static alignId(id: number, digits = 3) {
    return id.toString().padStart(digits, '0');
  }

  /**
   * 配列の最後の要素を取得する
   * @param value
   * @returns
   */
  static lastElement<T>(value: T[]): T | undefined {
    return value[value.length - 1];
  }

  /**
   * 配列インデクス上限を超える場合最後の要素を取得する
   * @param value
   * @param n
   * @returns
   */
  static upperLimitedElement<T>(value: T[], n: number) {
    return n < value.length ? value[n] : (Utils.lastElement(value) ?? 0);
  }

  /**
   * 指定のリストのルーレットを回す
   * @param list
   * @returns 選択されたリストインデックス
   */
  static roulette(list: number[]) {
    const sum = list.reduce((total, value) => total + value);
    let zone = sum * this.random();
    for (let i = 0; i < list.length; i++) {
      zone -= list[i];
      if (zone < 0) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 配列をランダムに並び替える
   * @param array
   * @returns
   */
  static shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * 配列を重み付きででランダムに並び替える
   * @param array
   * @param weights
   * @returns
   */
  static shuffleArrayWeight<T>(array: T[], weights: number[]) {
    const shuffledArray: T[] = [];
    const items = [...array];
    const itemWeights = [...weights];

    while (items.length > 0) {
      const totalWeight = itemWeights.reduce((sum, weight) => sum + weight, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < items.length; i++) {
        random -= itemWeights[i];
        if (random < 0) {
          shuffledArray.push(items[i]);
          items.splice(i, 1);
          itemWeights.splice(i, 1);
          break;
        }
      }
    }
    return shuffledArray;
  }

  /**
   * 指定リストの重み付きルーレットを回す
   * @param array
   * @param weights
   * @returns
   */
  static rouletteWeight<T>(array: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < array.length; i++) {
      random -= weights[i];
      if (random < 0) {
        return array[i];
      }
    }
    return array[0];
  }

  //---------------------------------------------
  // 圧縮展開

  /**
   * 指定の文字列をdeflateで圧縮する
   * @param text 圧縮する文字列
   * @returns 圧縮された文字列
   */
  static async compress(text: string) {
    const targetStream = new Blob([text]).stream();
    const compressedStream = targetStream.pipeThrough(
      new CompressionStream('deflate'),
    );
    const result = await new Response(compressedStream).arrayBuffer();

    const uint8Array = new Uint8Array(result);
    const chunkSize = 8192; // 一度に処理するサイズ
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binaryString += String.fromCharCode(
        ...uint8Array.subarray(i, i + chunkSize),
      );
    }
    return binaryString;
  }

  /**
   * deflateで圧縮された文字列を展開する
   * @param text 圧縮された文字列
   * @returns 展開された文字列
   * 呼びもとで 先頭2文字のコードが 0x78 0x9c なら圧縮とみなし展開する
   */
  static async decompress(text: string) {
    const charCodes: number[] = [].map.call(text, (c: string) =>
      c.charCodeAt(0),
    ) as number[];
    const data = new Uint8Array(charCodes).buffer;
    const targetStream = new Blob([data]).stream();
    const decompressedStream = targetStream.pipeThrough(
      new DecompressionStream('deflate'),
    );
    const result = await new Response(decompressedStream).text();
    return result;
  }
}
