/**
 * XorShiftで乱数を生成するクラス
 */
export class RandomXor4096 {
  /**
   * 状態
   */
  private _state: Uint32Array;

  /**
   * コンストラクタ
   * @param seed
   */
  constructor(seed = 0) {
    this._state = new Uint32Array(4);
    this.setSeed(seed);
  }

  /**
   * 乱数の種を設定する
   * @param seed
   */
  setSeed(seed: number) {
    this._state[0] = 123456789;
    this._state[1] = 362436069;
    this._state[2] = 521288629;
    this._state[3] = seed;
  }

  /**
   * 状態を設定する
   * @param s1
   * @param s2
   * @param s3
   * @param s4
   */
  setState(s1: number, s2: number, s3: number, s4: number) {
    this._state[0] = s1;
    this._state[1] = s2;
    this._state[2] = s3;
    this._state[3] = s4;
  }

  /**
   * 状態を取得する
   * @returns
   */
  getState() {
    return [...this._state];
  }

  /**
   * XorShiftで乱数を算出する
   * @returns
   */
  private _xorShift() {
    const t = this._state[0] ^ (this._state[0] << 11);
    this._state[0] = this._state[1];
    this._state[1] = this._state[2];
    this._state[2] = this._state[3];
    return (
      (this._state[3] =
        this._state[3] ^ (this._state[3] >>> 19) ^ (t ^ (t >>> 8))) >>> 0
    );
  }

  /**
   * 0～1の乱数を取得する
   * @returns
   */
  next(): number {
    return this._xorShift() / 2 ** 32;
  }

  /**
   * min <= value < maxの整数の乱数を取得する
   * @param min
   * @param max
   * @returns
   */
  nextInt(min: number, max: number): number {
    if (max - min <= 0) {
      // minがmax以上の場合は例外を返す
      throw Error('min must be less than max');
    }
    return (this._xorShift() % (max - min)) + min;
  }
}
