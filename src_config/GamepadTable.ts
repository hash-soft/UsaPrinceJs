/**
 * ゲームパッドテーブルのクラス
 */

import { TableSelector } from './TableSelector';
import { defaultConfig, KeyMap } from './UsaConfig';

// アナログキーの方向
const enum EDirection {
  Center = 0,
  Up = 1,
  Down = 2,
  Left = 3,
  Right = 4,
}

export class GamepadTable extends TableSelector {
  /**
   * 監視タイマーId
   */
  private _monitoringTimerId = 0;
  /**
   * ボタンが押されている状態
   */
  private _pressedButton: boolean[] = [];
  /**
   * アナログキーが押されている方向
   */
  private _pressedDirection: EDirection = EDirection.Center;
  /**
   * 入力表示行を選択しているか
   */
  private _inputDisplayRow: boolean = false;
  /**
   * 入力表示キーの行
   */
  private _displayInputKeyRows!: HTMLElement;
  /**
   * アナログキー方向の名前
   */
  private static _DirectionName: string[] = ['未入力', '上', '下', '左', '右'];

  /**
   * コンストラクタ
   */
  constructor() {
    super('gamepad', {
      bg: 'bg-blue-300',
      hover: 'hover:bg-blue-100',
      activeHover: 'hover:bg-blue-300',
    });
  }

  /**
   * @inheritdoc
   * @override
   * @param data ゲームパッドの設定
   */
  override setup(data: Readonly<KeyMap>) {
    super.setup(data);
    this._displayInputKeyRows = document.getElementById('gamepad-axes-row')!;
    this._changeTableRowIndex(-1);
    this._inputDisplayRow = true;
    this._selectRow(this._displayInputKeyRows);
    this._displayInputKeyRows.addEventListener('click', (event) => {
      this._onInputDisplayRowClick(event);
    });
    this._setButtonListener();
  }

  /**
   * 入力表示の行をクリックした時
   * @param _e イベント
   * @private
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _onInputDisplayRowClick(_e: Event) {
    if (this._inputDisplayRow) {
      return;
    }
    this._changeTableRowIndex(-1);
  }

  /**
   * ゲームパッドの全削除ボタンとデフォルトボタンにイベントを設定
   * @private
   */
  private _setButtonListener() {
    const allDeleteButton = document.getElementById('gamepad-all-delete');
    allDeleteButton?.addEventListener('click', () => {
      super.deleteKeyMap();
      super.resetTable();
    });
    const defaultButton = document.getElementById('gamepad-default');
    defaultButton?.addEventListener('click', () => {
      super.setKeyMap(defaultConfig.gamePad);
      super.resetTable();
    });
  }

  /**
   * @inheritdoc
   * @override
   * @param index 新しい行のインデックス
   *
   * テーブル行のインデックスを変更する
   *
   * 現在の行のスタイルを初期化し、新しい行にスタイルを適用する
   *
   * 入力表示の行を選択/非選択も行う
   */
  protected override _changeTableRowIndex(index: number) {
    super._changeTableRowIndex(index);
    if (index < 0) {
      this._selectRow(this._displayInputKeyRows);
      this._inputDisplayRow = true;
    } else {
      this._unselectRow(this._displayInputKeyRows);
      this._inputDisplayRow = false;
    }
  }

  /**
   * ゲームパッド監視を開始
   */
  startGamepadMonitoring() {
    if (this._monitoringTimerId) {
      return;
    }
    this._monitoringTimerId = window.setInterval(() => {
      this._updatePressedState();
      this._pushData();
    }, 100);
  }

  /**
   * ゲームパッド監視を終了
   */
  endGamepadMonitoring() {
    clearInterval(this._monitoringTimerId);
    this._monitoringTimerId = 0;
  }

  /**
   * ゲームパッドの状態を監視して、ボタンやアナログキーの状態を
   * 内部状態に反映する
   * @private
   */
  private _updatePressedState() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) {
        continue;
      }
      this._updatePressedButton(gamepad.buttons);
      if (this._inputDisplayRow) {
        this._updatePressedAxes(gamepad.axes);
        this._displayInputKey();
      } else {
        this._pushData();
      }
    }
  }

  /**
   * ボタンの状態を監視して、現在押されているボタンの状態を
   * 内部状態に反映する
   * @param buttons ボタン状態
   * @private
   */
  private _updatePressedButton(buttons: ReadonlyArray<GamepadButton>) {
    // チェックごとにfalseにする
    this._pressedButton.fill(false);
    const maxButton = buttons.length;
    for (let i = 0; i < maxButton; i++) {
      const button = buttons[i];
      // ボタンがないもしくは押されていない
      if (!button || !button.pressed) {
        continue;
      }
      this._pressedButton[i] = true;
    }
  }

  /**
   * ゲームパッドのアナログキーの状態を監視して、現在押されている
   * 方向を内部状態に反映する
   * @param axes ゲームパッドのアナログキーの状態
   * @returns 内部状態が変更されたか
   * @private
   */
  private _updatePressedAxes(axes: ReadonlyArray<number>) {
    const lastPressedDirection = this._pressedDirection;
    // チェックごとに0にする
    this._pressedDirection = EDirection.Center;
    if (axes[0] < -0.5) {
      // 左
      this._pressedDirection = EDirection.Left;
    } else if (axes[1] < -0.5) {
      // 上
      this._pressedDirection = EDirection.Up;
    } else if (axes[0] > 0.5) {
      // 右
      this._pressedDirection = EDirection.Right;
    } else if (axes[1] > 0.5) {
      // 下
      this._pressedDirection = EDirection.Down;
    }
    return lastPressedDirection !== this._pressedDirection;
  }

  /**
   * 現在押されているボタンを入力データとして設定する
   * @override
   */
  protected override _pushData() {
    // 最初のtrueを入力データとする
    const index = this._pressedButton.indexOf(true);
    if (index === -1) {
      return;
    }
    super._pushData((index + 1).toString());
  }

  /**
   * 現在押されているボタンもしくはアナログキーの状態をHTML上に反映する
   * @private
   */
  private _displayInputKey() {
    if (this._displayButton()) {
      return;
    }
    this._displayAxes();
  }

  /**
   * ゲームパッドのボタンの状態をHTML上に反映する
   * @returns ボタンが押されていたらtrueを返す
   * @private
   */
  private _displayButton() {
    const index = this._pressedButton.indexOf(true);
    if (index < 0) {
      return false;
    } else {
      this._displayInputKeyRows.children[1].textContent =
        'button' + (index + 1);
    }
    return true;
  }

  /**
   * ゲームパッドのアナログキーの方向をHTML上に反映する
   * @private
   */
  private _displayAxes() {
    this._displayInputKeyRows.children[1].textContent =
      GamepadTable._DirectionName[this._pressedDirection];
  }
}
