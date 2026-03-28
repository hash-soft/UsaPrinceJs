export const enum EInputOperation {
  Menu,
  Close,
  Multi,
  AllClose,
  Up,
  Down,
  Left,
  Right,
}

export const DecideOperations = [EInputOperation.Menu, EInputOperation.Multi];
export const CancelOperations = [
  EInputOperation.Close,
  EInputOperation.AllClose,
];

export const MessageOperations = [
  EInputOperation.Menu,
  EInputOperation.Close,
  EInputOperation.Multi,
  EInputOperation.AllClose,
];

export const EndMessageOperations = [
  ...MessageOperations,
  EInputOperation.Down,
];

class Keyboard {
  /**
   * 押されているキーの保存
   */
  private static _pressedKeys: boolean[] = [];
  /**
   * キーコードと操作インデックスをセットにしたキーマッピング
   */
  private static _mappingSets: [string, number][] = [];
  /**
   * デバッグキーのインデックス
   */
  private static _debugIndex: number = -1;
  /**
   * すり抜けキーのインデックス
   */
  private static _throughIndex: number = -1;
  /**
   * エンカウントなしキーのインデックス
   */
  private static _talismanIndex: number = -1;
  /**+
   * エンカウントキーのインデックス
   */
  private static _encounterIndex: number = -1;
  /**
   * デフォルトのキーマッピング
   */
  private static readonly _defaultMapping: string[][] = [
    ['KeyC', 'Enter'],
    ['KeyX', 'Escape'], // 0:すり抜け＋エンカウントなし 1:すり抜け
    ['KeyD', 'Space'],
    ['KeyA', 'Delete'], // 0:デバッグ 1:エンカウント
    ['ArrowUp'],
    ['ArrowDown'],
    ['ArrowLeft'],
    ['ArrowRight'],
  ];

  /**
   * 押されているキー
   */
  static get pressedKeys(): readonly boolean[] {
    return this._pressedKeys;
  }

  /**
   * キーマッピングの長さ
   * @returns {number} キーマッピングの長さ
   */
  static get mappingLength() {
    return this._mappingSets.length;
  }

  /**
   * デバッグキーのインデックス
   * @returns {number} デバッグのキーのインデックス
   */
  static get debugIndex() {
    return this._debugIndex;
  }

  /**
   * すり抜けキーのインデックス
   * @returns {number} すり抜けキーのインデックス
   */
  static get throughIndex() {
    return this._throughIndex;
  }

  /**
   * エンカウントなしキーのインデックス
   * @returns {number} エンカウントなしキーのインデックス
   */
  static get talismanIndex() {
    return this._talismanIndex;
  }

  /**
   * エンカウントキーのインデックス
   * @returns {number} エンカウントキーのインデックス
   */
  static get encounterIndex() {
    return this._encounterIndex;
  }

  /**
   * 初期化
   * @param mapping
   */
  static initialize(mapping?: string[][]) {
    this.reset(mapping);
    document.addEventListener('keydown', this._onKeyDown.bind(this), false);
    document.addEventListener('keyup', this._onKeyUp.bind(this), false);
  }

  /**
   * キーマッピングをリセットする
   * @param mapping - キーマッピングの配列。指定しない場合はデフォルトのマッピングに
   *                 リセットされる
   */
  static reset(mapping?: string[][]) {
    this.clear();
    const newMapping = mapping ?? this._defaultMapping;
    this._mappingSets = newMapping.flatMap((row, index) =>
      row.map((code) => [code, index] as [string, number])
    );
    this._pressedKeys = Array(this._mappingSets.length).fill(false);
    this._setDebugIndex();
  }

  /**
   * デバッグ、すり抜け、エンカウントのキーインデックスを設定する
   * @private
   */
  private static _setDebugIndex() {
    this._debugIndex = -1;
    this._throughIndex = -1;
    this._talismanIndex = -1;
    this._encounterIndex = -1;
    const close = this._mappingSets.findIndex(
      (set) => set[1] === EInputOperation.Close
    );
    if (close >= 0) {
      this._talismanIndex = close;
      const through = close + 1;
      if (this._mappingSets?.[through]?.[1] === EInputOperation.Close) {
        this._throughIndex = through;
      }
    }
    const allClose = this._mappingSets.findIndex(
      (set) => set[1] === EInputOperation.AllClose
    );
    if (allClose >= 0) {
      this._debugIndex = allClose;
      const encounter = allClose + 1;
      if (this._mappingSets?.[encounter]?.[1] === EInputOperation.AllClose) {
        this._encounterIndex = encounter;
      }
    }
  }

  /**
   * キーダウンイベント
   * 押されているキーを保持
   * @param e - キーボードイベントオブジェクト
   */
  static _onKeyDown(e: KeyboardEvent) {
    // ゲーム外に影響を与えないようにする
    if (['Backspace', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
    // キーマップ対象外なら保存しない
    const index = this._findKeyIndex(e.code);
    if (index < 0) {
      return;
    }
    // 状態を保存する
    this._pressedKeys[index] = true;
  }

  /**
   * キーアップイベント
   * 押されているキーの状態を解除する
   * @param e - キーボードイベントオブジェクト
   */
  static _onKeyUp(e: KeyboardEvent) {
    // キーマップ対象外なら保存しない
    const index = this._findKeyIndex(e.code);
    if (index < 0) {
      return;
    }
    // 状態を保存する
    this._pressedKeys[index] = false;
  }

  /**
   * 指定されたキーコードに合致するインデックスを探す
   * @param keyCode - キーコード
   * @returns インデックス。存在しない場合は -1
   */
  static _findKeyIndex(keyCode: string) {
    return this._mappingSets.findIndex((set) => set[0] === keyCode);
  }

  /**
   * 指定された操作コードに対応するインデックスを取得する
   * @param operation - 操作コード
   * @returns インデックスの配列
   */
  static filterIndexOperation(operation: EInputOperation) {
    return this._mappingSets.flatMap((set, index) =>
      set[1] === operation ? index : []
    );
  }

  /**
   * 押されている状態をクリア
   */
  static clear() {
    this._pressedKeys.fill(false);
  }
}

/**
 * ゲームコントローラークラス
 */
class GController {
  /**
   * ボタン番号とインデックスの対応表
   */
  private static _mappingSets: [number, number][] = [];
  /**
   * アナログキーの開始インデックス
   */
  private static _startAnalogIndex: number = 0;
  /**
   * デバッグキーのインデックス
   */
  private static _debugIndex: number = -1;
  /**
   * すり抜けキーのインデックス
   */
  private static _throughIndex: number = -1;
  /**
   * エンカウントなしキーのインデックス
   */
  private static _talismanIndex: number = -1;
  /**
   * エンカウントキーのインデックス
   */
  private static _encounterIndex: number = -1;
  /**
   * デフォルトのキーマップ
   */
  private static readonly _defaultMapping: string[][] = [
    ['2', '7'],
    ['3', '5'], // 0:すり抜け＋エンカウントなし 1:すり抜け
    ['1', '8'],
    ['4', '9'], // 0:デバッグ 1:エンカウント
    ['13'],
    ['14'],
    ['15'],
    ['16'],
  ];
  /**
   * アナログキーのマッピング
   */
  static readonly _analogMapping: number[] = [
    EInputOperation.Up,
    EInputOperation.Down,
    EInputOperation.Left,
    EInputOperation.Right,
  ];

  /**
   * キーマッピングの長さ
   * @returns {number} キーマッピングの長さ
   */
  static get mappingLength() {
    return this._mappingSets.length;
  }

  /**
   * デバッグキーのインデックス
   * @returns {number} デバッグキーのインデックス
   */
  static get debugIndex() {
    return this._debugIndex;
  }

  /**
   * すり抜けキーのインデックス
   * @returns {number} すり抜けキーのインデックス
   */
  static get throughIndex() {
    return this._throughIndex;
  }

  /**
   * エンカウントなしキーのインデックス
   * @returns {number} エンカウントなしキーのインデックス
   */
  static get talismanIndex() {
    return this._talismanIndex;
  }

  /**
   * エンカウントキーのインデックスを取得する
   * @returns {number} エンカウントキーのインデックス
   */
  static get encounterIndex() {
    return this._encounterIndex;
  }

  /**
   * 初期化
   */
  static initialize(mapping?: string[][]) {
    this.reset(mapping);
  }

  /**
   * キーマッピングをリセットする
   * @param mapping - キーマッピングの配列。指定しない場合はデフォルトのマッピングに
   *                 リセットされる
   */
  static reset(mapping?: string[][]) {
    const newMapping = mapping ?? this._defaultMapping;
    this._mappingSets = newMapping.flatMap((row, index) =>
      row.map((code) => {
        const tempNum = parseInt(code);
        const num = isNaN(tempNum) ? -1 : tempNum - 1;
        return [num, index] as [number, number];
      })
    );
    // アナログキーを最後尾に追加する
    this._startAnalogIndex = this._mappingSets.length;
    this._mappingSets.push(
      ...this._analogMapping.map((code) => [-1, code] as [number, number])
    );
    this._setDebugIndex();
  }

  /**
   * デバッグ、すり抜け、エンカウントのキーインデックスを設定する
   * @private
   */
  private static _setDebugIndex() {
    this._debugIndex = -1;
    this._throughIndex = -1;
    this._talismanIndex = -1;
    this._encounterIndex = -1;
    const close = this._mappingSets.findIndex(
      (set) => set[1] === EInputOperation.Close
    );
    if (close >= 0) {
      this._talismanIndex = close;
      const through = close + 1;
      if (this._mappingSets?.[through]?.[1] === EInputOperation.Close) {
        this._throughIndex = through;
      }
    }
    const allClose = this._mappingSets.findIndex(
      (set) => set[1] === EInputOperation.AllClose
    );
    if (allClose >= 0) {
      this._debugIndex = allClose;
      const encounter = allClose + 1;
      if (this._mappingSets?.[encounter]?.[1] === EInputOperation.AllClose) {
        this._encounterIndex = encounter;
      }
    }
  }

  /**
   * コントローラーの押されているキーを取得する
   * @returns
   */
  static getPressedGamepads() {
    // 毎回取り直す
    const gamepads = navigator.getGamepads();
    const length = gamepads.length;
    const pressedKeysList: boolean[][] = new Array(length);
    // 認識しているすべてのパッドの情報を取得する
    for (let i = 0; i < length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) {
        pressedKeysList[i] = [];
        continue;
      }
      pressedKeysList[i] = this._getPressedGamepad(gamepad);
    }
    // １つに統合
    const initialKeys: boolean[] = new Array(this._mappingSets.length).fill(
      false
    );
    const pressedKeys = pressedKeysList.reduce((prev, current) => {
      current.forEach((pressed, index) => {
        if (pressed) {
          // 押されている時だけ変化する
          prev[index] = pressed;
        }
      });
      return prev;
    }, initialKeys);
    return pressedKeys;
  }

  /**
   * コントローラーの押されている情報を取得する
   * @param gamepad
   * @returns
   */
  private static _getPressedGamepad(gamepad: Gamepad): boolean[] {
    const buttons = gamepad.buttons;
    const axes = gamepad.axes;
    const pressedKeys = Array(this._mappingSets.length).fill(false);
    // アナログキーを入れる
    // 左[0] = -1
    if (axes[0] < -0.5) {
      pressedKeys[this._startAnalogIndex + 2] = true;
    }
    // 上[1] = -1
    if (axes[1] < -0.5) {
      pressedKeys[this._startAnalogIndex] = true;
    }
    // 右[0] = 1
    if (axes[0] > 0.5) {
      pressedKeys[this._startAnalogIndex + 3] = true;
    }
    // 下[1] = 1
    if (axes[1] > 0.5) {
      pressedKeys[this._startAnalogIndex + 1] = true;
    }
    // ボタンを入れる
    const maxButton = buttons.length;
    for (let i = 0; i < maxButton; i++) {
      // ボタンがないもしくは押されていない
      if (!buttons[i]?.pressed) {
        continue;
      }
      const index = this._findKeyIndex(i);
      if (index < 0) {
        continue;
      }
      pressedKeys[index] = true;
    }
    return pressedKeys;
  }

  /**
   * キーインデックスを探す
   * @param keyCode
   * @returns
   */
  private static _findKeyIndex(keyCode: number) {
    return this._mappingSets.findIndex((set) => set[0] === keyCode);
  }

  /**
   * 指定された操作コードに対応するインデックスを取得する
   * @param operation - 操作コード
   * @returns インデックスの配列
   */
  static filterIndexOperation(operation: EInputOperation) {
    return this._mappingSets.flatMap((set, index) =>
      set[1] === operation ? index : []
    );
  }
}

/**
 * 入力列挙体
 */
// gamepadのボタン情報
//   B01
//   B02
//   B03
//   B04
//   B05 // xbox=L ps=L2
//   B06 // xbox=R ps=R2
//   B07 // xbox=select ps=L1
//   B08 // xbox=start ps=R1
//   B09
//   B10

export const enum EResultDir {
  Neutral = 0,
  Down = 2,
  Left = 4,
  Right = 6,
  Up = 8,
}

/**
 * 入力クラス
 */
export class Input {
  /**
   * 押されているキーのインデックス
   */
  private static _pressedIndex: number;
  /**
   * 押されているキーの時間
   */
  private static _pressedTime: number;
  /**
   * 押されている入力情報
   */
  private static _pressedInput: boolean[] = [];
  /**
   * 前回押されている入力情報
   */
  private static _prevPressedInput: boolean[] = [];
  /**
   * ゲームパッドの開始インデックス
   */
  private static _startGamePadIndex: number = 0;

  /**
   * 初期化
   */
  static initialize(mappings?: { keyboard: string[][]; gamePad: string[][] }) {
    this.reset(mappings);
    // フォーカスが外れたとき
    window.addEventListener('blur', this._onFocusOff.bind(this), false);
  }

  /**
   * 入力の状態をリセットする
   * @param mappings - キーマッピングの情報
   */
  static reset(mappings?: { keyboard: string[][]; gamePad: string[][] }) {
    this.clear();
    Keyboard.initialize(mappings?.keyboard);
    GController.initialize(mappings?.gamePad);
    const totalLength = Keyboard.mappingLength + GController.mappingLength;
    this._startGamePadIndex = Keyboard.mappingLength;
    this._pressedInput = new Array(totalLength).fill(false);
    this._prevPressedInput = new Array(totalLength).fill(false);
  }

  /**
   * 変数クリア
   */
  static clear() {
    this._pressedIndex = -1;
    this._pressedTime = 0;
    this._pressedInput.fill(false);
    this._prevPressedInput.fill(false);
  }

  /**
   * フォーカスが外れたとき
   */
  static _onFocusOff() {
    this.clear();
    // キーボードの状態をクリアする
    Keyboard.clear();
  }

  /**
   * 指定された操作がリピートされているか
   * @param operation - 操作コード
   * @returns リピートされているか
   */
  static isRepeatedOperation(operation: EInputOperation) {
    const index = this._findPressedKeyOperation(operation);
    if (index < 0) {
      return false;
    }
    // 押されたばかりならOK
    if (this._pressedTime === 0) {
      return true;
    }
    // 初回リピート以下
    if (this._pressedTime < 24) {
      return false;
    }
    // リピート間隔
    if (this._pressedTime % 6 !== 0) {
      return false;
    }
    return true;
  }

  /**
   * 指定された操作コードに対応する押されているキーのインデックスを取得する
   * @param operation - 操作コード
   * @returns 押されているキーのインデックス(-1:押されていない)
   */
  private static _findPressedKeyOperation(operation: EInputOperation) {
    const mapIndex = Keyboard.filterIndexOperation(operation);
    for (const index of mapIndex) {
      if (index === this._pressedIndex) {
        {
          return index;
        }
      }
    }
    const padIndex = GController.filterIndexOperation(operation);
    for (const index of padIndex) {
      if (index + this._startGamePadIndex === this._pressedIndex) {
        return index + this._startGamePadIndex;
      }
    }
    return -1;
  }

  /**
   * 指定された操作コードのいずれかが押された瞬間か
   * @param operations - 操作コードの配列
   * @returns 押された瞬間ならtrue
   */
  static isTriggeredOperations(operations: EInputOperation[]) {
    for (const operation of operations) {
      if (this.isTriggeredOperation(operation)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 指定された操作コードに対応するキーが押された瞬間か
   * @param operation - 操作コード
   * @returns 押された瞬間ならtrue
   */
  static isTriggeredOperation(operation: EInputOperation) {
    const mapIndex = Keyboard.filterIndexOperation(operation);
    for (const index of mapIndex) {
      if (index === this._pressedIndex && this._pressedTime === 0) {
        {
          return true;
        }
      }
    }
    const padIndex = GController.filterIndexOperation(operation);
    for (const index of padIndex) {
      if (
        index + this._startGamePadIndex === this._pressedIndex &&
        this._pressedTime === 0
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * どれか一つのキーが押された瞬間か
   * @returns 押された瞬間ならtrue
   */
  static isTriggeredSome() {
    return this._pressedIndex >= 0 && this._pressedTime === 0;
  }

  /**
   *  デバッグキーが押された瞬間か
   *  @returns 押された瞬間ならtrue
   */
  static isTriggeredDebug() {
    return (
      this._pressedIndex >= 0 &&
      (Keyboard.debugIndex === this._pressedIndex ||
        GController.debugIndex + this._startGamePadIndex ===
          this._pressedIndex) &&
      this._pressedTime === 0
    );
  }

  /**
   * すり抜けキーが押されているか
   * @returns 押されているならtrue
   */
  static isPressedThrough() {
    return (
      this._pressedIndex >= 0 &&
      (this._pressedInput[Keyboard.throughIndex] ||
        this._pressedInput[GController.throughIndex + this._startGamePadIndex])
    );
  }

  /**
   *  エンカウントなしキーが押されているか
   *  @returns 押されているならtrue
   */
  static isPressedTalisman() {
    return (
      this._pressedIndex >= 0 &&
      (this._pressedInput[Keyboard.talismanIndex] ||
        this._pressedInput[GController.talismanIndex + this._startGamePadIndex])
    );
  }

  /**
   *  エンカウントキーが押された瞬間か
   *  @returns 押された瞬間ならtrue
   */
  static isTriggeredEncounter() {
    return (
      this._pressedIndex >= 0 &&
      (Keyboard.encounterIndex === this._pressedIndex ||
        GController.encounterIndex + this._startGamePadIndex ===
          this._pressedIndex) &&
      this._pressedTime === 0
    );
    return false;
  }

  /**
   * 方向キーのどこが押されているか
   * 優先順位は 左、上、右、下
   * 戻りはテンキーの数字
   */
  static dir4() {
    // 左
    if (this.isPressedOperation(EInputOperation.Left)) {
      return EResultDir.Left;
    }
    // 上
    if (this.isPressedOperation(EInputOperation.Up)) {
      return EResultDir.Up;
    }
    // 右
    if (this.isPressedOperation(EInputOperation.Right)) {
      return EResultDir.Right;
    }
    // 下
    if (this.isPressedOperation(EInputOperation.Down)) {
      return EResultDir.Down;
    }
    return EResultDir.Neutral;
  }

  /**
   * 指定された操作コードに対応するキーが押されているか
   * @param operation - 操作コード
   * @returns 押されているならtrue
   * @private
   */
  private static isPressedOperation(operation: EInputOperation) {
    const mapIndex = Keyboard.filterIndexOperation(operation);
    for (const index of mapIndex) {
      if (this._pressedInput[index]) {
        return true;
      }
    }
    const padIndex = GController.filterIndexOperation(operation);
    for (const index of padIndex) {
      if (this._pressedInput[index + this._startGamePadIndex]) {
        return true;
      }
    }
    return false;
  }

  /**
   * フレームごとに押されているか離されているかを判定する
   */
  static update() {
    // ゲームパッドの状態を取得
    this._pressedInput = [
      ...Keyboard.pressedKeys,
      ...GController.getPressedGamepads(),
    ];
    this._checkTriggerInput();
  }

  /**
   * 前回までの入力状態と今回の入力状態を比較し、押された状態を
   * 判断する
   * @private
   */
  private static _checkTriggerInput() {
    // 前回まで押されていると判断していた入力が今回も押されているか判断して
    // 押されていなければ解除する
    // 今回押されていれば押されたカウントを１増やす
    // 前回押されている以外のキーを前回状態と比較し、今回押されていたら押された状態にする
    if (this._pressedInput[this._pressedIndex]) {
      this._pressedTime++;
    } else {
      this._pressedIndex = -1;
      this._pressedTime = 0;
    }
    for (let i = 0; i < this._pressedInput.length; i++) {
      if (this._pressedIndex === i) {
        // 押された状態から変わっていないはずなので前回状態を更新しなくていい
        continue;
      }
      if (this._pressedInput[i] && !this._prevPressedInput[i]) {
        this._pressedIndex = i;
        this._pressedTime = 0;
      }
      this._prevPressedInput[i] = this._pressedInput[i];
    }
  }
}
