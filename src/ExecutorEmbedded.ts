import { EventCommand } from './DataTypes';
import { gameMenus, gameParty, items, system } from './DataStore';
import { ECommandCode } from './Executor';
import { GameMember } from './GameMember';
import { EMessageOption } from './GameMessage';
import { GameShopItem, GameUtils } from './GameUtils';
import { getSlotNumber } from './DataUtils';
import { GameItem } from './GameItem';

/**
 * 組み込みメニュー情報の型
 */
export interface EmbeddedMenuInfo {
  menuId: number;
  messageNames?: string[];
  parentMenuId?: number;
  extra?: Array<number | string>;
}

/**
 * 組み込みメニューデータ
 * スタック情報として使用
 */
interface EmbeddedMenuData {
  returnPos: number;
  selfPos: number;
  params?: Array<number | string>;
}

/**
 * 組み込みメニューから呼び出せるコマンド機能
 */
export interface EmbeddedToExecutor {
  getMessageWaiting: () => boolean;
  getCommandResult: () => { index: number; object: unknown };
  clearCommandResult: () => void;
  onCommand: (command: EventCommand) => void;
  onCallScript: (list, event) => void;
}

/**
 * 組み込みメニュー定義
 */
export const enum EExecutorEmbedded {
  End = -1,
}

/**
 * 組み込みメニューベース
 */
export abstract class ExecutorEmbeddedBase {
  private _pos: number = -1;
  private readonly _menuInfos: EmbeddedMenuInfo[] = this._getMenuInfos();
  //private _runExecutor: EmbeddedToExecutor;
  private _queue: EventCommand[] = [];
  private _stack: EmbeddedMenuData[] = [];
  private _forceEnd: boolean = false;

  /**
   * コンストラクタ
   * @param args 0.呼び出し元のexecutorオブジェクト 1.開始メニュー位置
   */
  constructor(private _runExecutor: EmbeddedToExecutor) {}

  initialSettings(pos: number) {
    this._create(pos);
  }

  /**
   * 終了したか
   */
  get end() {
    return this._pos < 0 && !this._hasQueue();
  }

  /**
   * メッセージ待機状態か
   */
  protected get _messageWaiting() {
    return this._runExecutor.getMessageWaiting();
  }

  /**
   * 位置を取得
   */
  protected _getPos() {
    return this._pos;
  }

  /**
   * 結果を取得
   */
  protected _getResult() {
    return this._runExecutor.getCommandResult();
  }

  /**
   * 結果を削除
   */
  protected _clearResult() {
    this._runExecutor.clearCommandResult();
  }

  /**
   * 実行待ちコマンドがあるか
   */
  protected _hasQueue() {
    return this._queue.length !== 0;
  }

  /**
   * 実行中メニューがあるか
   */
  protected _hasStack() {
    return this._stack.length > 0;
  }

  /**
   * 変動設定のウィンドウを再描画する
   */
  protected _fluctuateOn() {
    gameMenus.fluctuateOn();
  }

  /**
   * メニュー情報
   * 継承先で定義
   */
  protected abstract _getMenuInfos(): EmbeddedMenuInfo[];

  /**
   * 強制終了
   */
  setForceEnd() {
    this._forceEnd = true;
  }

  /**
   * 実行
   */
  execute(): boolean {
    if (this._check()) {
      return true;
    }
    return this._executePos(this._getPos());
  }
  /**
   * メニュー位置実行
   */
  protected abstract _executePos(pos: number): boolean;

  /**
   * メニュー作成
   * @param newPos
   */
  protected _create(newPos: number, params?: Array<number | string>) {
    this._createCommand(newPos, params);
    this._movePos(newPos, params);
  }

  /**
   * コマンド作成
   * メニュー情報を元に作成される
   * 継承先で任意のコマンドを作成したい場合は
   * _createCustomCommand()を実装
   * @param newPos
   */
  private _createCommand(newPos: number, params?: Array<number | string>) {
    if (newPos < 0) {
      return;
    }

    if (this._createCustomCommand(newPos, params)) {
      return;
    }

    this._createMessageCommand(newPos);
    this._createMenuCommand(newPos, params);
  }

  /**
   * 任意のコマンド
   * @param newPos
   */
  protected _createCustomCommand(
    newPos,
    params?: Array<number | string>
  ): boolean;
  protected _createCustomCommand() {
    return false;
  }

  /**
   * メッセージコマンドを作成
   * @param newPos
   */
  protected _createMessageCommand(newPos: number) {
    const info = this._getInfo(newPos);
    this._createMessageCommandsFromSystemId(info.messageNames);
  }

  /**
   * システムIdを指定してメッセージコマンドを作成
   * @param names
   */
  protected _createMessageCommandsFromSystemId(names?: string[]) {
    names?.forEach((name) => {
      this._pushMessageCommand(GameUtils.getSystemMessage(name));
    });
  }

  /**
   * Idを指定してメッセージコマンドを作成
   * @param names
   */
  protected _createMessageCommandsFromId(ids?: number[]) {
    ids?.forEach((id) => {
      this._pushMessageCommand(GameUtils.getMessage(id));
    });
  }

  /**
   * メニューコマンドを作成
   * @param newPos
   * @param initialIndex
   */
  protected _createMenuCommand(
    newPos: number,
    params?: Array<number | string>
  ) {
    const info = this._getInfo(newPos);
    if (info.menuId > 0) {
      this._pushMenuCommand(info, (params?.[0] as number) ?? 0);
    }
  }

  /**
   * メニューを移動
   * @param newPos
   */
  private _movePos(newPos: number, params?) {
    const data: EmbeddedMenuData = {
      returnPos: this._pos,
      selfPos: newPos,
      params: params,
    };
    this._setPos(newPos);
    this._stack.push(data);
  }

  /**
   * メニュー終了位置を設定
   */
  protected _setEndPos() {
    this._setPos(EExecutorEmbedded.End);
  }

  /**
   * メニュー位置を設定し結果を削除する
   * @param newPos
   */
  private _setPos(newPos: number) {
    this._pos = newPos;
    this._clearResult();
  }

  /**
   * 現在位置のメニュー情報を取得
   */
  private _getCurrentInfo() {
    return this._getInfo(this._pos);
  }

  /**
   * 指定の位置のメニュー情報を取得
   * @param pos
   */
  protected _getInfo(pos: number) {
    return this._menuInfos[pos];
  }

  /**
   * 追加で閉じるメニュー
   * @param pos
   */
  protected _getExtraCloseMenu(pos: number): number;
  protected _getExtraCloseMenu() {
    return 0;
  }

  /**
   * 文章の表示コマンドを追加
   * @param text
   */
  protected _pushMessageCommand(text: string, type = EMessageOption.Refresh) {
    this._queue.push({
      code: ECommandCode.Message,
      parameters: [text, type],
    });
  }

  /**
   * メニュー表示コマンドを追加
   * @param info
   * @param initialIndex
   */
  protected _pushMenuCommand(info: EmbeddedMenuInfo, initialIndex = 0) {
    this._queue.push({
      code: ECommandCode.Menu,
      parameters: [
        info.menuId,
        initialIndex,
        info.parentMenuId ?? 0,
        ...(info.extra ?? []),
      ],
    });
  }

  /**
   * メニュー終了コマンドを追加
   * @param menuId
   */
  protected _pushEndMenuCommand(menuId) {
    this._queue.push({ code: ECommandCode.EndMenu, parameters: [menuId] });
  }

  /**
   * 文章制御コマンドを追加
   */
  protected _pushMessageControlCommand(type: number, value: number) {
    this._queue.push({
      code: ECommandCode.MessageSettings,
      parameters: [type, value],
    });
  }

  /**
   * 文章の表示閉じ待ち
   */
  protected _pushMessageCloseWaitCommand() {
    this._queue.push({ code: ECommandCode.MessageCloseWait, parameters: [] });
  }

  /**
   * 待機
   * @param value
   */
  protected _pushWaitCommand(value: number) {
    this._queue.push({ code: ECommandCode.Wait, parameters: [value] });
  }

  /**
   * 共通スクリプト起動
   * @param scriptId
   */
  protected _pushCommonScriptCommand(scriptId: number) {
    this._queue.push({
      code: ECommandCode.CommonScript,
      parameters: [0, scriptId],
    });
  }

  /**
   * 名前変更
   * @param refId
   * @param name
   */
  protected _pushNameChange(refId: number, name: string) {
    this._queue.push({
      code: ECommandCode.NameChange,
      parameters: [refId, name],
    });
  }

  /**
   * ちゅうだん
   */
  protected _pushSuspendCommand(id: number) {
    this._queue.push({ code: ECommandCode.Suspend, parameters: [id] });
  }

  /**
   * セーブ
   */
  protected _pushSaveCommand(id: number) {
    this._queue.push({ code: ECommandCode.Save, parameters: [id] });
  }

  /**
   * 回復コマンドを追加する
   * @param type
   * @param param
   * @param hpRate
   * @param mpRate
   * @param beginState
   * @param endState
   */
  protected _pushRecoverCommand(
    type: number,
    param: number,
    hpRate: number,
    mpRate: number,
    beginState: number,
    endState: number
  ) {
    this._queue.push({
      code: ECommandCode.Recover,
      parameters: [type, param, hpRate, mpRate, beginState, endState],
    });
  }

  /**
   * 経験値
   * @param ref
   * @param expValue
   * @param memberSlotId
   * @param operate
   */
  protected _pushChangeExpCommand(
    ref: number,
    expValue: number,
    memberSlotId: number,
    operate: number
  ) {
    this._queue.push({
      code: ECommandCode.ChangeExp,
      parameters: [ref, expValue, memberSlotId, operate],
    });
  }

  /**
   * レベル
   * @param ref
   * @param lvValue
   * @param memberSlotId
   * @param operate
   */
  protected _pushChangeLvCommand(
    ref: number,
    lvValue: number,
    memberSlotId: number,
    operate: number
  ) {
    this._queue.push({
      code: ECommandCode.ChangeLv,
      parameters: [ref, lvValue, memberSlotId, operate],
    });
  }

  /**
   * レベル反映
   * @param memberSlotId
   */
  protected _pushApplyLvCommand(memberSlotId: number) {
    this._queue.push({
      code: ECommandCode.ApplyLv,
      parameters: [memberSlotId],
    });
  }

  /**
   * 戦闘開始
   * @param groupType
   * @param groupId
   * @param terrainId
   * @param escape
   * @param escapeScript
   * @param winScript
   * @param loseScript
   * @param preemptive
   * @param preemptiveType
   * @param bgmId
   */
  protected _pushBattleStartCommand(
    groupType: number,
    groupId: number,
    terrainId: number,
    escape: number,
    escapeScript: number,
    winScript: number,
    loseScript: number,
    preemptive: number,
    preemptiveType: number,
    bgmId: number
  ) {
    this._queue.push({
      code: ECommandCode.BattleStart,
      parameters: [
        groupType,
        groupId,
        terrainId,
        escape,
        escapeScript,
        winScript,
        loseScript,
        preemptive,
        preemptiveType,
        bgmId,
      ],
    });
  }

  /**
   * 効果音
   */
  protected _pushSeCommand(id: number) {
    this._queue.push({ code: ECommandCode.Se, parameters: [id] });
  }

  /**
   * イベント起動
   * @param triggerId
   */
  protected _pushTriggerCommand(triggerId: number) {
    // 今のexecutorでやるんじゃなくて新しいexecutorつくって
    // やったほうがいいのではとも思う
    this._queue.push({
      code: ECommandCode.EventTrigger,
      parameters: [triggerId],
    });
  }

  /**
   * 移動中アニメーション
   * @param targetType
   * @param target
   * @param effectId
   * @param waitType
   */
  pushMapAnimationCommand(
    targetType: number,
    target: number,
    effectId: number,
    waitType: number
  ) {
    this._queue.push({
      code: ECommandCode.MapAnimation,
      parameters: [targetType, target, effectId, waitType],
    });
  }

  /**
   * メニュー破棄
   */
  private _destroy() {
    const data: EmbeddedMenuData | undefined = this._stack.pop();
    if (!data) {
      this._setPos(EExecutorEmbedded.End);
      return;
    }
    const info = this._getInfo(data.selfPos);
    if (info.menuId > 0) {
      this._pushEndMenuCommand(info.menuId);
    }
    const extraId = this._getExtraCloseMenu(data.selfPos);
    if (extraId > 0) {
      this._pushEndMenuCommand(extraId);
    }
    this._setPos(data.returnPos);
    return data;
  }

  /**
   * メニュー復帰
   * @param data
   */
  private _restore(data: EmbeddedMenuData | undefined) {
    if (!data) {
      return;
    }
    this._createCommand(data.returnPos, data.params);
  }

  /**
   * 選択メンバーオブジェクトを取得
   * @param pos
   */
  protected _getSelectedMember(pos: number) {
    const index = this._getSelectedIndex(pos);
    return gameParty.members[index];
  }

  /**
   * 道具選択メンバーオブジェクトを取得
   * @param pos
   * @returns
   */
  protected _getItemSelectedMember(pos: number) {
    const index = this._getSelectedIndex(pos);
    return gameParty.itemMembers[index];
  }

  /**
   * 選択道具オブジェクトを取得
   * @param pos
   * @param memberPos
   */
  protected _getSelectedItem(pos: number, memberPos: number) {
    //const member = this._getSelectedMember(memberPos);
    const member = this._getItemSelectedMember(memberPos);
    return this._getSelectedItemFromMember(pos, member);
  }

  /**
   * 選択道具オブジェクトをメンバーを指定して取得
   * @param pos
   * @param member
   */
  protected _getSelectedItemFromMember(pos: number, member: GameMember) {
    const index = this._getSelectedIndex(pos);
    return member.getItem(index);
  }

  /**
   * メニュー位置の選択インデックスを取得
   * @param pos
   */
  protected _getSelectedIndex(pos: number) {
    const menuId = this._getInfo(pos).menuId;
    return gameMenus.selectedIndex(menuId);
  }

  /**
   * キャンセル選択時の基本処理
   * @param index
   * @param pos
   * @param cancelIndex
   */
  protected _selectCancel(index: number, pos?: number, cancelIndex?: number) {
    // 0以上ならキャンセルではない
    if (index >= 0 && index !== cancelIndex) {
      return false;
    }
    this._popPos(pos);

    return true;
  }

  /**
   * メニューを破棄して終了させる
   */
  protected _popAll() {
    this._popPos(EExecutorEmbedded.End);
  }

  /**
   * メニューを戻す
   * posで指定の位置まで戻すことができる
   * @param pos メニュー位置
   */
  protected _popPos(pos?: number) {
    const data = this._back(pos);
    this._restore(data);
  }

  /**
   * 指定した位置まで戻る
   * @param pos メニュー位置
   */
  private _back(pos?: number) {
    if (pos == null) {
      return this._destroy();
    }
    for (;;) {
      const data = this._destroy();
      if (!data || data.returnPos === pos) {
        return data;
      }
    }
  }

  /**
   * ジャンプ
   * 指定の位置まで終了させ新たな位置のメニューに遷移する
   * @param newPos
   * @param backPos
   */
  protected _jump(
    newInfo: { pos: number; params?: Array<number | string> },
    backPos?: number
  ) {
    this._back(backPos);
    this._create(newInfo.pos, newInfo.params);
  }

  /**
   * コマンド実行、終了の確認を行う
   */
  private _check() {
    if (this._commandCheck()) {
      return true;
    }
    this._checkForceEnd();
    if (this._endCheck()) {
      return true;
    }
    return false;
  }

  /**
   * コマンド実行を行う
   */
  private _commandCheck() {
    const command = this._queue.shift();
    if (command) {
      // 待ちが必要なコマンドでも待たない
      this._runExecutor.onCommand(command);
      return true;
    }
    return false;
  }

  /**
   * 強制終了なら全メニュー終了させる
   */
  private _checkForceEnd() {
    if (this._forceEnd) {
      this._popAll();
      this._forceEnd = false;
    }
  }

  /**
   * 終了確認を行う
   */
  private _endCheck() {
    if (!this.end) {
      return false;
    }

    return true;
  }

  /**
   * スクリプトを呼び出す
   * @param list
   * @param event
   */
  protected _onCallScript(list, event) {
    this._runExecutor.onCallScript(list, event);
  }
}

/**
 * 道具捨てる定数定義
 */
const enum EExecutorDiscard {
  MEMBER,
  DISCARD,
  YesNo,
  NoticeMes,
  ConfirmMes,
  NoDiscardMes,
  WhatDiscardMes,
}

/**
 * 道具捨てる組み込みメニュー
 */
export class ExecutorDiscard extends ExecutorEmbeddedBase {
  /**
   * メニュー情報
   * 0.メンバー選択ウィンドウ
   * 1.道具選択ウィンドウ
   * 2.はいいいえウィンドウ
   * 3.道具ないメッセージ
   * 4.捨てる確認メッセージ
   * 5.捨てられないメッセージ
   * 6.選びなおしメッセージ
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 82 },
      { menuId: 83, parentMenuId: 82 },
      { menuId: 81 },
      { menuId: 0, messageNames: ['noItem'] },
      { menuId: 0, messageNames: ['confirmDiscard'] },
      { menuId: 0, messageNames: ['noDiscard'] },
      { menuId: 0, messageNames: ['whatDiscard'] },
    ];
  }

  /**
   * 実行
   */
  protected _executePos(pos) {
    switch (pos) {
      case EExecutorDiscard.MEMBER:
        return this._executeMember();
      case EExecutorDiscard.DISCARD:
        return this._executeDiscard();
      case EExecutorDiscard.YesNo:
        return this._executeYesNo();
      case EExecutorDiscard.NoticeMes:
        return this._executeNoItemMes();
      case EExecutorDiscard.ConfirmMes:
        return this._executeConfirmMes();
      case EExecutorDiscard.NoDiscardMes:
        return this._executeNoDiscardMes();
      case EExecutorDiscard.WhatDiscardMes:
        return this._executeWhatDiscardMes();
    }

    return false;
  }

  /**
   * メンバー選択時
   */
  private _executeMember() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectMember(result?.object as GameMember);
  }

  /**
   * メンバー選択決定処理
   * @param member
   */
  private _selectMember(member: GameMember) {
    GameUtils.setSlotActorName(member.name);
    if (!member.hasItem()) {
      // 道具を持っていない
      // 捨てるときに使うからここにくることはありえないけど
      this._create(EExecutorDiscard.NoticeMes);
    } else {
      this._create(EExecutorDiscard.DISCARD);
    }

    return true;
  }

  /**
   * 捨てる道具選択時
   */
  private _executeDiscard() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectDiscard(result?.object as GameItem);
  }

  /**
   * 捨てる道具決定処理
   * @param item
   */
  private _selectDiscard(item: GameItem) {
    GameUtils.setSlotTItemName(item.name);
    if (!item.discard) {
      // 捨てられない
      this._create(EExecutorDiscard.NoDiscardMes);
    } else {
      this._create(EExecutorDiscard.ConfirmMes);
    }
    return true;
  }

  /**
   * 捨てる確認選択時
   */
  private _executeYesNo() {
    const result = this._getResult();

    if (result?.index !== 0) {
      return this._selectNo();
    }
    return this._selectYes();
  }

  /**
   * やっぱ捨てない決定処理
   */
  private _selectNo() {
    this._create(EExecutorDiscard.WhatDiscardMes);
    return true;
  }

  /**
   * 捨てる決定処理
   */
  private _selectYes() {
    //const member = this._getSelectedMember(EExecutorDiscard.MEMBER);
    const member = this._getItemSelectedMember(EExecutorDiscard.MEMBER);
    const item = this._getSelectedItemFromMember(
      EExecutorDiscard.DISCARD,
      member
    );
    this._setEndPos();
    gameParty.discardItem(member, item);
    GameUtils.setSlotTItemName(item.name);
    return true;
  }

  /**
   * 道具持ってないメッセージ時
   */
  private _executeNoItemMes() {
    this._popPos();
    return true;
  }

  /**
   * 捨てられないメッセージ時
   */
  private _executeNoDiscardMes() {
    this._popPos();
    return true;
  }

  /**
   * 捨てる確認メッセージ時
   */
  private _executeConfirmMes() {
    this._create(EExecutorDiscard.YesNo);
    return true;
  }

  /**
   * 何を捨てるメッセージ時
   */
  private _executeWhatDiscardMes() {
    this._popPos(EExecutorDiscard.DISCARD);
    return true;
  }
}

/**
 * 買う定数定義
 */
const enum EExecutorBuy {
  Goods,
  Target,
  Other,
  CantEquip,
  NoMoneyMes,
  BuyMes,
  GotMes,
  BuyCancelMes,
}

/**
 * 組み込みメニュー買う
 */
export class ExecutorBuy extends ExecutorEmbeddedBase {
  /**
   * メニュー情報
   * 0.商品ウィンドウ
   * 1.所持者選択ウィンドウ
   * 2.もう持てない場合のはいいいえウィンドウ
   * 3.装備できない場合のはいいいえウィンドウ
   * 4.お金がないメッセージ
   * 5.買ったときのメッセージ
   * 6.はたんじょうたいで買ったときのメッセージ
   * 7.誰が持つかをキャンセルしたときのメッセージ
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 87, extra: GameUtils.getMenuGoodsSlotIds() },
      { menuId: 88, messageNames: ['whoOwner'] },
      { menuId: 81, messageNames: ['noEmptyItem'] },
      { menuId: 81, messageNames: ['noEquipOk'] },
      { menuId: 0, messageNames: ['noMoney'] },
      { menuId: 0, messageNames: ['buy'] },
      { menuId: 0, messageNames: ['got'] },
      { menuId: 0, messageNames: ['buyCancel'] },
    ];
  }

  /**
   * カスタムコマンド
   * @param newPos
   */
  protected override _createCustomCommand(newPos: number) {
    switch (newPos) {
      case EExecutorBuy.Other:
      case EExecutorBuy.CantEquip:
        this._createMessageCommand(newPos);
        this._pushSeCommand(system.soundIds.confirm);
        this._createMenuCommand(newPos);
        return true;
    }
    return false;
  }

  /**
   * 購入道具データを取得
   * @param pos
   */
  private _getSelectedGoods(pos: number) {
    const index = this._getSelectedIndex(pos);
    const [startId] = GameUtils.getMenuGoodsSlotIds();
    const itemValue = getSlotNumber(startId + index);
    return GameUtils.itemIdToShopItem(itemValue);
  }

  /**
   * 実行
   */
  protected _executePos(pos: number) {
    switch (pos) {
      case EExecutorBuy.Goods:
        return this._executeGoods();
      case EExecutorBuy.Target:
        return this._executeTarget();
      case EExecutorBuy.Other:
        return this._executeOther();
      case EExecutorBuy.CantEquip:
        return this._executeCanEquip();
      case EExecutorBuy.NoMoneyMes:
        return this._executeNoMoneyMes();
      case EExecutorBuy.BuyMes:
      case EExecutorBuy.GotMes:
        return this._executeBuyGotMes();
      case EExecutorBuy.BuyCancelMes:
        return this._executeBuyCancelMes();
    }

    return true;
  }

  /**
   * 購入物選択時
   */
  private _executeGoods() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectGoods(result?.object as GameShopItem);
  }

  /**
   * 購入物選択処理
   * @param item
   */
  private _selectGoods(item: GameShopItem) {
    GameUtils.setSlotItemName(item.name);
    if (gameParty.gold < item.price) {
      this._create(EExecutorBuy.NoMoneyMes);
      return true;
    }
    this._create(EExecutorBuy.Target);

    return true;
  }

  /**
   * 所持者選択時
   */
  private _executeTarget() {
    const result = this._getResult();

    const index = result?.index ?? -1;
    if (index < 0) {
      this._create(EExecutorBuy.BuyCancelMes);
      return true;
    }
    return this._selectTarget(result?.object as GameMember);
  }

  /**
   * 所持者の処理
   * @param member
   */
  private _selectTarget(member: GameMember) {
    GameUtils.setSlotTargetName(member.name);
    if (!member.itemSpace()) {
      // これ以上持てない
      this._create(EExecutorBuy.Other);
      return true;
    }
    // 装備物かつ装備不可能か
    const shopItem = this._getSelectedGoods(EExecutorBuy.Goods);
    const item = items[shopItem.id];
    if (GameItem.judgeNormal(item) || member.canEquip(item)) {
      // ゴールドウィンドウ反映
      this._payment();
    } else {
      // 装備不可
      this._create(EExecutorBuy.CantEquip);
    }

    return true;
  }

  /**
   * 決済処理
   */
  private _payment() {
    // 入手
    const member = this._getItemSelectedMember(EExecutorBuy.Target);
    const item = this._getSelectedGoods(EExecutorBuy.Goods);
    member.pushItem(item.id);
    // 支払い
    gameParty.loseGold(item.price);

    // ゴールドウィンドウ反映
    this._fluctuateOn();
    // 生きているかどうかでメッセージを変える
    const pos = member.live ? EExecutorBuy.BuyMes : EExecutorBuy.GotMes;
    this._create(pos);
  }

  /**
   * 他の人が持つ時
   */
  private _executeOther() {
    const result = this._getResult();

    if (this._selectCancel(result?.index, EExecutorEmbedded.End, 1)) {
      return true;
    }

    this._popPos(EExecutorBuy.Target);

    return true;
  }

  /**
   * 装備できない時
   */
  private _executeCanEquip() {
    const result = this._getResult();

    if (this._selectCancel(result?.index, EExecutorEmbedded.End, 1)) {
      return true;
    }

    this._payment();

    return true;
  }

  /**
   * お金がないメッセージ時
   * メニュー終了
   */
  private _executeNoMoneyMes() {
    this._popAll();
    return true;
  }

  /**
   * 購入メッセージ
   */
  private _executeBuyGotMes() {
    this._popPos(EExecutorBuy.Goods);
    return true;
  }

  /**
   * 購入キャンセルメッセージ
   */
  private _executeBuyCancelMes() {
    this._popPos(EExecutorBuy.Goods);
    return true;
  }
}

/**
 * 売る定数定義
 */
const enum EExecutorSell {
  Member,
  Goods,
  Confirm,
  NoItemMes,
  NoSellMes,
  SellMes,
}

/**
 * 組み込みメニュー売る
 */
export class ExecutorSell extends ExecutorEmbeddedBase {
  /**
   * メニュー情報
   * 0.所持者選択ウィンドウ
   * 1.売り物ウィンドウ
   * 2.売るか確認はいいいえウィンドウ
   * 3.売れる道具がないメッセージ
   * 4.売れない道具を売ろうとしたときのメッセージ
   * 5.売った時のメッセージ
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 91 },
      { menuId: 92, parentMenuId: 91 },
      { menuId: 81, messageNames: ['sellCheck'] },
      { menuId: 0, messageNames: ['noSellItem'] },
      { menuId: 0, messageNames: ['noSell', 'afterSell'] },
      { menuId: 0, messageNames: ['sell', 'afterSell'] },
    ];
  }

  /**
   * カスタムコマンド
   * @param newPos
   */
  protected override _createCustomCommand(newPos: number) {
    switch (newPos) {
      case EExecutorSell.Confirm:
        this._createMessageCommand(newPos);
        this._pushSeCommand(system.soundIds.confirm);
        this._createMenuCommand(newPos);
        return true;
    }
    return false;
  }

  /**
   * 実行
   */
  protected _executePos(pos) {
    switch (pos) {
      case EExecutorSell.Member:
        return this._executeMember();
      case EExecutorSell.Goods:
        return this._executeGoods();
      case EExecutorSell.Confirm:
        return this._executeConfirm();
      case EExecutorSell.NoItemMes:
        return this._executeNoItemMes();
      case EExecutorSell.NoSellMes:
        return this._executeNoSellMes();
      case EExecutorSell.SellMes:
        return this._executeSellMes();
    }

    return true;
  }

  /**
   * メンバー選択時
   */
  private _executeMember() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectMember(result?.object);
  }

  /**
   * メンバー選択決定
   * @param member
   */
  private _selectMember(member) {
    if (!member.hasItem()) {
      // 道具を持っていない
      this._create(EExecutorSell.NoItemMes);
    } else {
      // チェックポイント
      this._create(EExecutorSell.Goods);
    }
    return true;
  }

  /**
   * 売るもの選択時
   */
  private _executeGoods() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectGoods(result?.object);
  }

  /**
   * 売るもの決定
   * @param item
   */
  private _selectGoods(item) {
    GameUtils.setSlotItemName(item.name);
    GameUtils.setSlotPointValue(item.sellPrice);
    // 売れるかどうか
    if (item.sell) {
      // 確認
      this._create(EExecutorSell.Confirm);
    } else {
      // 売れない
      this._create(EExecutorSell.NoSellMes);
    }

    return true;
  }

  /**
   * ほんとに売るか確認時
   */
  private _executeConfirm() {
    const result = this._getResult();

    if (this._selectCancel(result?.index, EExecutorEmbedded.End, 1)) {
      return true;
    }

    // 売却確定
    this._payment();

    return true;
  }

  /**
   * 売却処理
   */
  private _payment() {
    //const member = this._getSelectedMember(EExecutorSell.Member);
    const member = this._getItemSelectedMember(EExecutorSell.Member);
    const item = this._getSelectedItemFromMember(EExecutorSell.Goods, member);
    member.eraseItem(item);
    // 入金
    gameParty.gainGold(item.sellPrice);

    // ゴールドウィンドウ反映
    this._fluctuateOn();
    // 他にうるかメッセージ
    this._create(EExecutorSell.SellMes);
  }

  /**
   * 売るものがないメッセージ時
   */
  private _executeNoItemMes() {
    this._popPos();
    return true;
  }

  /**
   * 売れないメッセージ時
   */
  private _executeNoSellMes() {
    this._popPos(EExecutorSell.Member);
    return true;
  }

  /**
   * 売ったメッセージ時
   */
  private _executeSellMes() {
    this._popPos(EExecutorSell.Goods);
    return true;
  }
}
