/**
 * 乱数モジュール
 */

import { RandomXor4096 } from './RandomXor4096';

const _mt = new RandomXor4096(0);

/**
 * 種まきをする
 * @param seed
 */
export const setSeed = (seed: number) => {
  _mt.setSeed(seed);
};

/**
 * 乱数の状態を設定する
 * @param s1
 * @param s2
 * @param s3
 * @param s4
 */
export const setState = (s1: number, s2: number, s3: number, s4: number) => {
  _mt.setState(s1, s2, s3, s4);
};

/**
 * 乱数の状態を取得する
 * @returns
 */
export const getState = () => {
  return _mt.getState();
};

/**
 * 0～1までの乱数を取得する
 * @returns
 */
export const next = () => {
  return _mt.next();
};

/**
 * min～maxの整数の乱数を取得する
 * @param min
 * @param max
 * @returns
 */
export const nextInt = (min: number, max: number) => {
  return _mt.nextInt(min, max);
};
