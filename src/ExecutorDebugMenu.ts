import {
  gameFlags,
  gameMenus,
  gameParty,
  gameTemp,
  gameVariables,
} from './DataStore';
import {
  getSlotId,
  getSystemSlotNumber,
  getVariable,
  setSlot,
  setVariable,
} from './DataUtils';
import { EmbeddedMenuInfo, ExecutorEmbeddedBase } from './ExecutorEmbedded';
import Utils from './Utils';

/**
 * デバッグコマンド
 */
const enum EDebugCommand {
  FLAG,
  VARIABLE,
  SLOT,
  Status,
  Troop,
}

/**
 * ステータスコマンド
 */
const enum EStatusCommand {
  Level,
  Exp,
  Recover,
}

/**
 * デバッグメニュー定数定義
 */
const enum EExecutorDebugMenu {
  COMMAND,
  FLAG,
  VARIABLE,
  EditVariable,
  SLOT,
  EditSlot,
  Troop,
  BattleStart,
  Status,
  StatusMember,
  NoticeMes,
}

/**
 * 組み込みデバッグメニュークラス
 */
export class ExecutorDebugMenu extends ExecutorEmbeddedBase {
  /**
   * メニュー情報
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 151 }, // コマンド
      { menuId: 153 }, // フラグ
      { menuId: 154 }, // 変数
      { menuId: 156 }, // 変数編集
      { menuId: 155 }, // スロット
      { menuId: 157 }, // スロット編集
      { menuId: 158 }, // トループ
      { menuId: 0 }, // 戦闘開始
      { menuId: 159 }, // ステータス
      { menuId: 160 }, // ステータスメンバー
      { menuId: 0 }, // 通知メッセージ
    ];
  }

  /**
   * ステータスコマンドの保存
   */
  private _statusCommand: EStatusCommand = EStatusCommand.Exp;

  /**
   * カスタムコマンド
   * @param newPos
   */
  protected _createCustomCommand(
    newPos: number,
    params?: Array<number | string>
  ) {
    switch (newPos) {
      case EExecutorDebugMenu.EditVariable:
      case EExecutorDebugMenu.EditSlot:
        this._createMenuCommand(newPos, params);
        return true;
      case EExecutorDebugMenu.NoticeMes:
        this._createMessageCommandsFromSystemId(params as string[]);
        this._pushMessageCloseWaitCommand();
        return true;
    }
    return false;
  }

  /**
   * 実行
   * @param pos
   */
  protected _executePos(pos: number): boolean {
    switch (pos) {
      case EExecutorDebugMenu.COMMAND:
        return this._executeCommand();
      case EExecutorDebugMenu.FLAG:
        return this._executeFlag();
      case EExecutorDebugMenu.VARIABLE:
        return this._executeVariable();
      case EExecutorDebugMenu.EditVariable:
        return this._executeEditVariable();
      case EExecutorDebugMenu.SLOT:
        return this._executeSlot();
      case EExecutorDebugMenu.EditSlot:
        return this._executeEditSlot();
      case EExecutorDebugMenu.Troop:
        return this._executeTroop();
      case EExecutorDebugMenu.BattleStart:
        return this._executeBattleStart();
      case EExecutorDebugMenu.Status:
        return this._executeStatus();
      case EExecutorDebugMenu.StatusMember:
        return this._executeStatusMember();
      case EExecutorDebugMenu.NoticeMes:
        return this._executeNoticeMes();
    }
    throw new Error(Utils.programErrorText);
  }

  /**
   * コマンド選択時
   */
  private _executeCommand() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectCommand(result.index);
  }

  /**
   * コマンド選択決定
   * @param index
   */
  private _selectCommand(index) {
    switch (index) {
      case EDebugCommand.FLAG:
        return this._selectFlagCommand();
      case EDebugCommand.VARIABLE:
        return this._selectVariableCommand();
      case EDebugCommand.SLOT:
        return this._selectSlotCommand();
      case EDebugCommand.Status:
        return this._selectStatusCommand();
      case EDebugCommand.Troop:
        return this._selectTroopCommand();
    }

    return false;
  }

  /**
   * フラグコマンドを選択
   */
  private _selectFlagCommand() {
    if (gameFlags.length <= 1) {
      this._create(EExecutorDebugMenu.NoticeMes, ['noFlag']);
      return true;
    }
    this._create(EExecutorDebugMenu.FLAG);
    return true;
  }

  /**
   * 変数コマンドを選択
   */
  private _selectVariableCommand() {
    if (gameVariables.length <= 1) {
      this._create(EExecutorDebugMenu.NoticeMes, ['noVariable']);
      return true;
    }
    this._create(EExecutorDebugMenu.VARIABLE);
    return true;
  }

  /**
   * スロットコマンドを選択
   */
  private _selectSlotCommand() {
    if (gameTemp.slots.length <= 1) {
      this._create(EExecutorDebugMenu.NoticeMes, ['noSlot']);
      return true;
    }
    this._create(EExecutorDebugMenu.SLOT);
    return true;
  }

  /**
   * ステータスコマンドを選択
   */
  private _selectStatusCommand() {
    this._create(EExecutorDebugMenu.Status);
    return true;
  }

  /**
   * トループコマンドを選択
   */
  private _selectTroopCommand() {
    this._create(EExecutorDebugMenu.Troop);
    return true;
  }

  /**
   * フラグ終了時
   * 決定の時も戻るのでキャンセル設定する
   */
  private _executeFlag() {
    const result = this._getResult();
    return this._selectCancel(result?.index, undefined, result?.index);
  }

  /**
   * 変数決定時
   */
  private _executeVariable() {
    const result = this._getResult();
    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectVariable(result.index);
  }

  /**
   * 変数を選択
   * @param index
   * @returns
   */
  private _selectVariable(index: number) {
    const value = getVariable(index + 1);
    this._create(EExecutorDebugMenu.EditVariable, [value]);
    return true;
  }

  /**
   * 変数編集決定時
   * 汎用数値入力で変更しているためこちらで値を設定する
   * 変更があったらイベント再構築要求を設定する
   */
  private _executeEditVariable() {
    const result = this._getResult();
    const menuId = this._getInfo(EExecutorDebugMenu.VARIABLE).menuId;
    const variableId = gameMenus.selectedIndex(menuId) + 1;
    const value = getVariable(variableId);
    if (result.index !== value) {
      setVariable(variableId, result.index);
      gameTemp.requestRefreshEvent();
    }
    return this._selectCancel(result?.index, undefined, result?.index);
  }

  /**
   * スロット決定時
   */
  private _executeSlot() {
    const result = this._getResult();
    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectSlot(result?.index);
  }

  /**
   * スロットを選択
   * ウィンドウ内で決定した値を設定するため
   * 変数と違いインデックスをウィンドウに渡す
   * @param index
   * @returns
   */
  private _selectSlot(index: number) {
    this._create(EExecutorDebugMenu.EditSlot, [index + 1]);
    return true;
  }

  /**
   * スロット編集決定時
   * 変更があったらイベント再構築要求を設定する
   */
  private _executeEditSlot() {
    const result = this._getResult();
    if (result.index > 0) {
      gameTemp.requestRefreshEvent();
    }
    return this._selectCancel(-1);
  }

  /**
   * トループ選択時
   * 決定はメニュー終了後戦闘
   * キャンセルはウィンドウ終了
   */
  private _executeTroop() {
    const result = this._getResult();
    if (this._selectCancel(result.index)) {
      return true;
    }

    // 戦闘仕込み
    this._pushBattleStartCommand(0, result.index + 1, 0, 1, 0, 0, 0, 0, 0, 0);
    this._create(EExecutorDebugMenu.BattleStart);
    return true;
  }

  /**
   * 戦闘開始
   * @returns
   */
  private _executeBattleStart() {
    this._popAll();
    return true;
  }

  /**
   * ステータス選択時
   */
  private _executeStatus() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectStatus(result.index);
  }

  /**
   * ステータス選択決定
   * @param index
   */
  private _selectStatus(index: number) {
    this._statusCommand = index;
    this._create(EExecutorDebugMenu.StatusMember);
    return true;
  }

  /**
   * ステータスメンバー選択時
   */
  private _executeStatusMember() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectStatusMember(result.index);
  }

  /**
   * ステータスメンバー選択決定
   * @param index
   */
  private _selectStatusMember(index: number) {
    const debugValue = getSystemSlotNumber('debug');
    const slotId = this._setMemberSlot(index);
    switch (this._statusCommand) {
      case EStatusCommand.Level:
        this._pushChangeLvCommand(0, debugValue, slotId, 0);
        this._pushApplyLvCommand(slotId);
        break;
      case EStatusCommand.Exp:
        this._pushChangeExpCommand(0, debugValue, slotId, 0);
        this._pushApplyLvCommand(slotId);
        break;
      case EStatusCommand.Recover:
        this._pushRecoverCommand(
          index < gameParty.memberLength ? 2 : 1,
          slotId,
          100,
          100,
          0,
          100
        );
        break;
      default:
        break;
    }
    this._popPos();
    return true;
  }

  /**
   * メンバーをスロットに設定する
   * @param index
   */
  private _setMemberSlot(index: number) {
    const slotId = getSlotId('general');
    if (index >= 0 && index < gameParty.memberLength) {
      setSlot(slotId, gameParty.getMember(index).id);
    } else {
      setSlot(slotId, -1);
    }
    return slotId;
  }

  /**
   * 注意メッセージ時
   */
  private _executeNoticeMes() {
    this._popPos();
    return true;
  }

  /**
   * キャンセル
   * オールキャンセルがあるのでオーバーライド
   * @param index カーソルインデックス
   * @param pos 戻る位置
   * @param cancelIndex キャンセル扱いするインデックス
   */
  protected _selectCancel(index: number, pos?: number, cancelIndex?: number) {
    if (index === -2) {
      this._allCancel();
      return true;
    }
    return super._selectCancel(index, pos, cancelIndex);
  }

  /**
   * オールキャンセル
   * 最後まで戻る
   */
  private _allCancel() {
    this._popAll();
  }
}
