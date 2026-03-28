import { Skill, TriggerItem } from './DataTypes';
import {
  gameMapSight,
  gameMarch,
  gameMenus,
  gameParty,
  gameTemp,
  system,
} from './DataStore';
import { ExecutorEmbeddedBase, EmbeddedMenuInfo } from './ExecutorEmbedded';
import { EActionKind } from './GameAction';
import { ActionResult, EActionResultText } from './GameActionUtils';
import { GameMember } from './GameMember';
import { EMessageOption } from './GameMessage';
import { GameUnit } from './GameUnit';
import { GameUtils } from './GameUtils';
import { GameItem } from './GameItem';
import { getSystemSlotNumber, setSystemSlot } from './DataUtils';

/**
 * コマンド
 */
const enum EMenuCommand {
  SPELL,
  ITEM,
  STATUS,
  STRATEGY,
}

/**
 * どうぐどうする
 */
const enum EMenuItem {
  USE,
  TRANSFER,
  EQUIP,
  DISCARD,
}

/**
 * どうぐわたす
 */
export const enum EMenuTransfer {
  CHANGE, // 持ち替え
  HAND, // 渡す
  SWAP, // 交換
  TAKE, // とる（動けない時の渡す）
}

/**
 * さくせん
 */
const enum EMenuStrategy {
  EQUIP,
  ORDER,
  TALK,
  SEARCH,
  DOOR,
  SUSPEND,
}

/**
 * マップメニュー定数定義
 */
const enum EExecutorMapMenu {
  Command,
  Spell,
  SpellChoice,
  SpellUseTarget,
  Item,
  ItemChoice,
  ItemAction,
  ItemUseTarget,
  PrepareAction,
  Action,
  SpellAfterEvent,
  ItemAfterEvent,
  ItemTransfer,
  ItemTransferTarget,
  ItemActionMes,
  DiscardConfirmMes,
  DiscardYesNo,
  Status,
  StatusChoice,
  Strategy,
  Equip,
  EquipWeapon,
  EquipArmor,
  EquipShield,
  EquipHelmet,
  EquipAccessory,
  Order,
  SuspendConfirmMes,
  SuspendYesNo,
  SuspendResult,
  Trigger,
  NoticeMes,
}

/**
 * 組み込みマップメニュークラス
 */
export class ExecutorMapMenu extends ExecutorEmbeddedBase {
  /**
   * キャンセル時戻り位置
   */
  private _returnPos: number = 0;

  /**
   * 行動を取得
   */
  private get _currentAction() {
    return gameTemp.mapAction;
  }

  /**
   * 行動のクリア
   */
  private _clearAction() {
    gameTemp.clearMapAction();
  }

  /**
   * 行動結果をクリア
   */
  private _clearActionResult() {
    gameTemp.clearMapActionResult();
  }

  /**
   * 行動の初期化
   * @param member
   * @param kind
   */
  private _initAction(member: GameMember, kind: EActionKind) {
    this._clearAction();
    this._currentAction.setActor(member);
    this._currentAction.setCommandKind(kind);
  }

  /**
   * メニュー情報
   * 多いので説明は内部コメントに記載
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 21 }, // コマンド
      { menuId: 23 }, // 呪文
      { menuId: 24, parentMenuId: 23 }, // 技能選択
      { menuId: 25, extra: GameUtils.getMenuExtraSlotIds() }, // 技能だれにつかう
      { menuId: 29 }, // どうぐ
      { menuId: 30, parentMenuId: 29 }, // どのどうぐを
      { menuId: 31, parentMenuId: 30, extra: GameUtils.getMenuExtraSlotIds() }, // どうする
      { menuId: 32, extra: GameUtils.getMenuExtraSlotIds() }, // だれにつかう
      { menuId: 0 }, // 行動前のスクリプト後
      { menuId: 0 }, // 行動中
      { menuId: 0 }, // 呪文アクションイベント後
      { menuId: 0 }, // 道具アクションイベント後
      { menuId: 33, extra: GameUtils.getMenuExtraSlotIds() }, // だれにわたす
      { menuId: 34, parentMenuId: 33 }, // わたすどうぐ
      { menuId: 0 }, // どうぐ操作後メッセージ
      { menuId: 0, messageNames: ['menuConfirmDiscard'] }, // 捨てる確認メッセージ
      { menuId: 81 }, // 捨てるはいいいえ
      { menuId: 41 }, // つよさ
      { menuId: 42, parentMenuId: 41 },
      { menuId: 46 }, // さくせん
      { menuId: 48 }, // そうび
      { menuId: 49, parentMenuId: 48 },
      { menuId: 50, parentMenuId: 48 },
      { menuId: 51, parentMenuId: 48 },
      { menuId: 52, parentMenuId: 48 },
      { menuId: 53, parentMenuId: 48 },
      { menuId: 56 }, // 並び替え
      { menuId: 0, messageNames: ['confirmSuspend'] }, // ちゅうだん確認メッセージ
      { menuId: 81 }, // ちゅうだんはいいいえ
      { menuId: 0 }, // ちゅうだん結果
      { menuId: 0 }, // イベント起動
      { menuId: 0 }, // 注意メッセージ
    ];
  }

  /**
   * カスタムコマンド
   * @param newPos
   */
  protected _createCustomCommand(
    newPos: number,
    params?: Array<number | string>
  ) {
    switch (newPos) {
      case EExecutorMapMenu.PrepareAction:
        this._pushCommonScriptCommand((params?.[0] ?? 0) as number);
        return true;
      case EExecutorMapMenu.Trigger:
        // params[0]に設定されたスクリプトを予約する
        GameUtils.pushSystemCommonScript(params?.[0] as string);
        return true;
      case EExecutorMapMenu.DiscardYesNo:
      case EExecutorMapMenu.SuspendYesNo:
        this._pushSeCommand(system.soundIds.confirm);
        return false;
      case EExecutorMapMenu.ItemActionMes:
      case EExecutorMapMenu.NoticeMes:
        this._createMessageCommandsFromSystemId(params as string[]);
        this._pushMessageCloseWaitCommand();
        return true;
    }
    return false;
  }

  /**
   * 追加で閉じるメニュー
   * @param pos
   */
  protected _getExtraCloseMenu(pos: number) {
    switch (pos) {
      case EExecutorMapMenu.DiscardConfirmMes:
      case EExecutorMapMenu.SuspendConfirmMes:
        return gameTemp.getMessageMenuId();
    }
    return 0;
  }

  /**
   * 戻り位置にじゅもん選択を設定
   */
  private _setReturnPosSpellChoice() {
    this._returnPos = EExecutorMapMenu.SpellChoice;
  }

  /**
   * 戻り位置に道具選択を設定
   */
  private _setReturnPosItemChoice() {
    this._returnPos = EExecutorMapMenu.ItemChoice;
  }

  /**
   * 実行
   * @param pos
   */
  protected _executePos(pos: number): boolean {
    switch (pos) {
      // コマンド
      case EExecutorMapMenu.Command:
        return this._executeCommand();
      case EExecutorMapMenu.Spell:
        return this._executeSpell();
      case EExecutorMapMenu.SpellChoice:
        return this._executeSpellChoice();
      case EExecutorMapMenu.SpellUseTarget:
        return this._executeUseTarget();
      case EExecutorMapMenu.Item:
        return this._executeItem();
      case EExecutorMapMenu.ItemChoice:
        return this._executeItemChoice();
      case EExecutorMapMenu.ItemAction:
        return this._executeItemAction();
      case EExecutorMapMenu.ItemUseTarget:
        return this._executeUseTarget();
      case EExecutorMapMenu.ItemTransfer:
        return this._executeItemTransfer();
      case EExecutorMapMenu.ItemTransferTarget:
        return this._executeItemTransferTarget();
      case EExecutorMapMenu.ItemActionMes:
        return this._executeItemActionMes();
      case EExecutorMapMenu.DiscardConfirmMes:
        return this._executeDiscardConfirmMes();
      case EExecutorMapMenu.DiscardYesNo:
        return this._executeDiscardYesNo();
      case EExecutorMapMenu.PrepareAction:
        return this._executePrepareAction();
      case EExecutorMapMenu.Action:
        return this._executeAction();
      case EExecutorMapMenu.SpellAfterEvent:
        return this._executeSpellAfterEvent();
      case EExecutorMapMenu.ItemAfterEvent:
        return this._executeItemAfterEvent();
      case EExecutorMapMenu.Status:
        return this._executeStatus();
      case EExecutorMapMenu.StatusChoice:
        return this._executeStatusChoice();
      case EExecutorMapMenu.Strategy:
        return this._executeStrategy();
      case EExecutorMapMenu.Equip:
        return this._executeEquip();
      case EExecutorMapMenu.EquipWeapon:
        return this._executeEquipWeapon();
      case EExecutorMapMenu.EquipArmor:
        return this._executeEquipArmor();
      case EExecutorMapMenu.EquipShield:
        return this._executeEquipShield();
      case EExecutorMapMenu.EquipHelmet:
        return this._executeEquipHelmet();
      case EExecutorMapMenu.EquipAccessory:
        return this._executeEquipAccessory();
      case EExecutorMapMenu.Order:
        return this._executeOrder();
      case EExecutorMapMenu.SuspendConfirmMes:
        return this._executeSuspendConfirmMes();
      case EExecutorMapMenu.SuspendYesNo:
        return this._executeSuspendYesNo();
      case EExecutorMapMenu.SuspendResult:
        return this._executeSuspendResult();
      case EExecutorMapMenu.Trigger:
        return this._executeTrigger();
      case EExecutorMapMenu.NoticeMes:
        return this._executeNoticeMes();
    }
    return true;
  }

  /**
   * コマンド選択時
   */
  private _executeCommand() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectCommand(result?.index);
  }

  /**
   * コマンド選択決定
   * @param index
   */
  private _selectCommand(index: number) {
    switch (index) {
      case EMenuCommand.SPELL: // じゅもん
        this._create(EExecutorMapMenu.Spell);
        return true;
      case EMenuCommand.ITEM: // どうぐ
        this._create(EExecutorMapMenu.Item);
        return true;
      case EMenuCommand.STATUS: // つよさ
        this._create(EExecutorMapMenu.Status);
        return true;
      case EMenuCommand.STRATEGY: // さくせん
        this._create(EExecutorMapMenu.Strategy);
        return true;
    }

    return false;
  }

  //----------------------------------------------------------
  // じゅもん

  /**
   * じゅもん使用メンバー選択時
   */
  private _executeSpell() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectSpell(result.object as GameMember);
  }

  /**
   * じゅもん使用メンバー決定
   * @param member
   */
  private _selectSpell(member: GameMember) {
    GameUtils.setSlotActorName(member.name);
    if (!member.hasSkill()) {
      // 呪文を覚えていない
      this._create(EExecutorMapMenu.NoticeMes, ['mapNoSpell']);
    } else if (!member.live) {
      // 倒れている
      this._create(EExecutorMapMenu.NoticeMes, ['downSpell']);
    } else {
      this._initAction(member, EActionKind.Skill);
      this._setReturnPosSpellChoice();
      this._create(EExecutorMapMenu.SpellChoice);
    }

    return true;
  }

  /**
   * 呪文選択時
   */
  private _executeSpellChoice() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }

    return this._selectSpellChoice(result?.object as Skill);
  }

  /**
   * 呪文選択決定
   * @param index
   */
  private _selectSpellChoice(skill: Skill) {
    // 行動決定
    this._decideItem(skill.id);

    if (!this._mpCheck()) {
      return true;
    }

    // イベント
    const triggerItem = this._findTriggerSpell(
      this._currentAction.getSelectSpecialId()
    );
    if (this._checkTrigger(triggerItem)) {
      this._create(EExecutorMapMenu.SpellAfterEvent);
      this._currentAction.useItem();
      return true;
    }
    return this._selectUseDefaultAction(false);
  }

  /**
   * 呪文起動条件を取得
   * @param itemId
   */
  private _findTriggerSpell(itemId: number) {
    return system.triggerSkills.find(
      (triggerItem) => triggerItem.id === itemId
    );
  }

  //----------------------------------------------------------
  // どうぐ

  /**
   * 道具使用メンバー選択時
   */
  private _executeItem() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectItem(result?.object as GameMember);
  }

  /**
   * 道具使用メンバー決定
   * @param member
   */
  private _selectItem(member: GameMember) {
    GameUtils.setSlotActorName(member.name);
    if (!member.hasItem()) {
      // 道具を持っていない
      this._create(EExecutorMapMenu.NoticeMes, ['noItem']);
    } else {
      this._initAction(member, EActionKind.Item);
      this._setReturnPosItemChoice();
      this._create(EExecutorMapMenu.ItemChoice);
    }

    return true;
  }

  /**
   * どうぐ選択時
   */
  private _executeItemChoice() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    this._decideItem(result?.index ?? 0);
    GameUtils.setExtraSlots([this._getSelectedIndex(EExecutorMapMenu.Item)]);
    this._create(EExecutorMapMenu.ItemAction);

    return true;
  }

  /**
   * スキルまたは道具決定
   * @param index
   */
  private _decideItem(index: number) {
    this._currentAction.setItemIndex(index);
    this._currentAction.setSelectedAction();
    this._currentAction.setSlotSelectItemName();
  }

  /**
   * どうぐどうする時
   */
  private _executeItemAction() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectItemAction(result?.index);
  }

  /**
   * どうぐどうするの決定時
   * @param index
   */
  private _selectItemAction(index: number) {
    switch (index) {
      case EMenuItem.USE: // つかう
        return this._selectItemUse();
      case EMenuItem.TRANSFER: // わたす
        return this._selectItemTransfer();
      case EMenuItem.EQUIP: // そうび
        return this._selectItemEquip();
      case EMenuItem.DISCARD: // すてる
        return this._selectItemDiscard();
    }
    return true;
  }

  /**
   * どうぐつかうに決定時
   */
  private _selectItemUse() {
    const member = this._getItemSelectedMember(EExecutorMapMenu.Item);
    if (!member.live) {
      // 倒れている
      this._create(EExecutorMapMenu.NoticeMes, ['downItem']);
    } else {
      return this._selectItemUseAction();
    }

    return true;
  }

  /**
   * どうぐつかう決定時行動
   */
  private _selectItemUseAction() {
    if (!this._mpCheck()) {
      return true;
    }
    // イベント
    const triggerItem = this._findTriggerItem(
      this._currentAction.getSelectSpecialId()
    );
    if (this._checkTrigger(triggerItem)) {
      this._create(EExecutorMapMenu.ItemAfterEvent);
      this._currentAction.useItem();
      return true;
    }
    return this._selectUseDefaultAction(true);
  }

  /**
   * 既定の使う行動
   * @param item
   * @returns
   */
  private _selectUseDefaultAction(item: boolean) {
    // 対象者選択
    if (this._needTargetSelect()) {
      GameUtils.setExtraSlots([this._currentAction.actionId]);
      this._create(
        item ? EExecutorMapMenu.ItemUseTarget : EExecutorMapMenu.SpellUseTarget
      );
      return true;
    }

    // 使用前スクリプト
    const scriptId = this._currentAction.extra.preScriptId;
    if (scriptId > 0) {
      setSystemSlot('exitCode', 0);
      this._create(EExecutorMapMenu.PrepareAction, [scriptId]);
      return true;
    }

    // 使用
    return this._selectActionUse();
  }

  /**
   * MPが足りているか確認する
   * @returns
   */
  private _mpCheck() {
    if (this._currentAction.mpCheck()) {
      return true;
    }
    // MP不足
    this._create(EExecutorMapMenu.NoticeMes, ['notMpEnough']);
    return false;
  }

  /**
   * どうぐ起動条件を取得
   * @param itemId
   */
  private _findTriggerItem(itemId: number) {
    return system.triggerItems.find((triggerItem) => triggerItem.id === itemId);
  }

  //----------------------------------------------------------
  // 呪文道具使う

  /**
   * 行動使用対象時
   */
  private _executeUseTarget() {
    const result = this._getResult();
    if (this._selectCancel(result?.index)) {
      return true;
    }

    return this._selectUseTarget(result?.index);
  }

  /**
   * 行動使用対象決定
   * @param index
   */
  private _selectUseTarget(index: number) {
    this._currentAction.setTargetGroup(0);
    this._currentAction.setTargetIndex(index);
    return this._selectActionUse();
  }

  /**
   * トリガーチェック
   * イベント発生行動ならイベントを実行する
   * @param triggerItem
   */
  private _checkTrigger(triggerItem: TriggerItem | undefined) {
    // トリガーとなるアイテムでない
    if (!triggerItem) {
      return false;
    }
    // なんらかの理由で使えない ★行動を確定させる必要がある
    const [success] = this._currentAction.usable();
    if (!success) {
      return false;
    }
    const events = gameMapSight.getTriggerEvents(triggerItem.trigger);
    // 起動するイベントはなかった
    if (events.length === 0) {
      return false;
    }

    for (const event of events) {
      // すぐ実行するので開始要求はすぐ消去する
      event.start(triggerItem.trigger);
      this._onCallScript(event.list, event);
      event.clearStarting();
    }

    // 結果コードの初期化
    setSystemSlot('exitCode', 0);

    return true;
  }

  /**
   * 対象選択が必要か
   */
  private _needTargetSelect() {
    return this._currentAction.forOneFriend;
  }

  /**
   * 選択した行動を使用する
   */
  private _selectActionUse() {
    setSystemSlot('exitCode', 0);
    this._clearActionResult();
    this._currentAction.start();
    this._create(EExecutorMapMenu.Action);
    return true;
  }

  /**
   * 行動実行前のスクリプト後
   */
  private _executePrepareAction() {
    const index = getSystemSlotNumber('exitCode');
    if (this._selectCancel(index)) {
      return true;
    }

    return this._selectActionUse();
  }

  /**
   * 行動を実行
   */
  private _executeAction() {
    const result = this._currentAction.next();
    if (typeof result === 'string') {
      this._endActionResult();
    } else {
      this._expandActionResult(result);
    }
    return true;
  }

  /**
   * 行動結果展開
   * @param result
   */
  private _expandActionResult(result: ActionResult) {
    const enableText =
      result.textOption !== EActionResultText.NONE && result.text != null;
    if (enableText) {
      // ウィンドウにフォーカスがある場合は
      // ポーズをかける
      if (gameMenus.messageFocus()) {
        const type = EMessageOption.Pause - EMessageOption.SettingsOption;
        this._pushMessageControlCommand(type, 0);
        // ポーズ解除までアニメーションを開始しないようにする対応
        this._pushWaitCommand(1);
      }
      // 対象名を設定する
      const name = GameUnit.toCallName(result.targets);
      GameUtils.setSlotTargetName(name);
    }

    if (result.animationId) {
      this.pushMapAnimationCommand(0, 0, result.animationId, 0);
    }

    if (enableText) {
      const type =
        result.textOption === EActionResultText.REFRESH
          ? EMessageOption.Refresh
          : EMessageOption.Plus;
      this._pushMessageCommand(result.text, type);
    }

    if (result.scriptId > 0) {
      this._pushCommonScriptCommand(result.scriptId);
    }
  }

  /**
   * 行動結果終了
   */
  private _endActionResult() {
    // メッセージ入力待ちをして選択に戻る
    if (gameMenus.messageFocus()) {
      this._pushMessageCloseWaitCommand();
    }
    this._fluctuateOn();
    gameMarch.refresh();
    const index = getSystemSlotNumber('exitCode');
    if (index >= 0) {
      this._popAction(this._currentAction.getSelectMenuEnd());
    } else {
      this._popAction(index < -1);
    }
  }

  /**
   * ぎのうイベント終了時
   */
  private _executeSpellAfterEvent() {
    const index = getSystemSlotNumber('exitCode');
    if (index >= 0) {
      return this._selectUseDefaultAction(false);
    }
    this._popAction(index < -1);
    return true;
  }

  /**
   * 道具イベント終了時
   */
  private _executeItemAfterEvent() {
    const index = getSystemSlotNumber('exitCode');
    if (index >= 0) {
      return this._selectUseDefaultAction(true);
    }
    this._popAction(index < -1);
    return true;
  }

  /**
   * 行動後の戻る処理
   * @param all true:全て終了
   */
  private _popAction(all: boolean) {
    if (all) {
      // メニュー終了
      this._popAll();
    } else {
      // 選択に戻る
      this._popPos(this._returnPos);
    }
  }

  /**
   * 渡す決定
   */
  private _selectItemTransfer() {
    GameUtils.setExtraSlots([
      this._getSelectedIndex(EExecutorMapMenu.Item),
      this._getSelectedIndex(EExecutorMapMenu.ItemChoice),
    ]);
    this._create(EExecutorMapMenu.ItemTransfer);
    return true;
  }

  /**
   * 装備決定
   */
  private _selectItemEquip() {
    //const member = this._getSelectedMember(EExecutorMapMenu.Item);
    const member = this._getItemSelectedMember(EExecutorMapMenu.Item);
    // 選択道具を取得
    const item = this._getSelectedItemFromMember(
      EExecutorMapMenu.ItemChoice,
      member
    );
    GameUtils.setSlotItemName(item.name);
    // 装備品か確認
    if (!item.canEquip()) {
      // 装備品でないメッセージ
      this._create(EExecutorMapMenu.NoticeMes, ['noEquipItem']);
      return true;
    }
    // 装備可能か確認
    if (!member.canEquip(item)) {
      this._create(EExecutorMapMenu.NoticeMes, ['cantEquip']);
      return true;
    }

    // 装備するか外すか
    const [equip, mesId] = item.equip ? [false, 'equipOff'] : [true, 'equipOn'];
    this._itemAction((member, item) => {
      member.equipItem(item, equip);
    });
    this._create(EExecutorMapMenu.ItemActionMes, [mesId]);

    return true;
  }

  /**
   * 捨てる決定
   */
  private _selectItemDiscard() {
    // 選択道具を取得
    const item = this._getSelectedItem(
      EExecutorMapMenu.ItemChoice,
      EExecutorMapMenu.Item
    );
    // 捨てる道具名はtargetに格納
    GameUtils.setSlotTItemName(item.name);
    // 捨てられるか確認
    if (item.discard) {
      this._create(EExecutorMapMenu.DiscardConfirmMes);
    } else {
      // 捨てられないメッセージ
      this._create(EExecutorMapMenu.NoticeMes, ['menuNoDiscard']);
    }

    return true;
  }

  /**
   * 渡す道具時
   */
  private _executeItemTransfer() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    const target = this._getItemSelectedMember(EExecutorMapMenu.ItemTransfer);
    // 渡し先へ
    this._create(EExecutorMapMenu.ItemTransferTarget, [target.items.length]);
    return true;
  }

  /**
   * 道具渡し先時
   */
  private _executeItemTransferTarget() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }

    const actor = this._getItemSelectedMember(EExecutorMapMenu.Item);
    const item = this._getSelectedItemFromMember(
      EExecutorMapMenu.ItemChoice,
      actor
    );
    const target = this._getItemSelectedMember(EExecutorMapMenu.ItemTransfer);
    const tItem = result.object as GameItem;
    const type = actor.transferItem(item, target, tItem);

    GameUtils.setSlotItemName(item.name);
    GameUtils.setSlotTItemName(tItem?.name ?? '');
    // 渡し先メッセージ分け
    switch (type) {
      case EMenuTransfer.CHANGE:
        this._create(EExecutorMapMenu.ItemActionMes, ['itemChange']);
        break;
      case EMenuTransfer.HAND:
        this._create(EExecutorMapMenu.ItemActionMes, ['itemHand']);
        break;
      case EMenuTransfer.SWAP:
        this._create(EExecutorMapMenu.ItemActionMes, ['itemSwap']);
        break;
      case EMenuTransfer.TAKE:
        GameUtils.setSlotTargetName(target.name);
        this._create(EExecutorMapMenu.ItemActionMes, ['itemTake']);
        break;
    }

    return true;
  }

  /**
   * 道具操作処理
   * @param fn
   */
  private _itemAction(fn: (member: GameMember, item: GameItem) => void) {
    //const member = this._getSelectedMember(EExecutorMapMenu.Item);
    const member = this._getItemSelectedMember(EExecutorMapMenu.Item);
    const item = this._getSelectedItemFromMember(
      EExecutorMapMenu.ItemChoice,
      member
    );
    fn(member, item);
  }

  /**
   * 道具処理メッセージ時
   */
  private _executeItemActionMes() {
    this._popPos(EExecutorMapMenu.ItemChoice);
    return true;
  }

  /**
   * 道具捨てる確認メッセージ
   * @returns
   */
  private _executeDiscardConfirmMes() {
    this._create(EExecutorMapMenu.DiscardYesNo);
    return true;
  }

  /**
   * 道具捨てる確認選択
   * @returns
   */
  private _executeDiscardYesNo() {
    const result = this._getResult();

    if (result?.index !== 0) {
      return this._selectDiscardNo();
    }
    return this._selectDiscardYes();
  }

  /**
   * 道具捨てない
   * @returns
   */
  private _selectDiscardNo() {
    this._popPos(EExecutorMapMenu.ItemAction);
    return true;
  }

  /**
   * 道具捨てる
   * @returns
   */
  private _selectDiscardYes() {
    // 捨てる
    this._itemAction((member, item) => {
      gameParty.discardItem(member, item);
    });
    this._create(EExecutorMapMenu.ItemActionMes, ['menuDiscard']);
    return true;
  }

  //----------------------------------------------------------
  // つよさ

  /**
   * つよさ時
   */
  private _executeStatus() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectStatus(result?.object as GameMember);
  }

  /**
   * つよさ選択決定
   * @param member
   */
  private _selectStatus(member?: GameMember) {
    // 全員の場合
    if (!member) {
      // ウィンドウのほうで止めてるが念のため
      return false;
    }
    if (!member.hasStatusSkill()) {
      // ぎのうを覚えていない
      //this._popPos();
      //this._create(EExecutorMapMenu.NoticeMes, ['noSpell']);
      return false;
    } else {
      this._create(EExecutorMapMenu.StatusChoice);
    }
    return true;
  }

  /**
   * つよさ中時
   */
  private _executeStatusChoice() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    // キャンセルと同じ
    this._popPos();
    return true;
  }

  //----------------------------------------------------------
  // さくせん

  /**
   * さくせん時
   */
  private _executeStrategy() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectStrategy(result?.index);
  }

  /**
   * さくせん決定
   * @param index
   */
  private _selectStrategy(index: number) {
    switch (index) {
      case EMenuStrategy.EQUIP: // そうび
        this._create(EExecutorMapMenu.Equip);
        return true;
      case EMenuStrategy.ORDER: // ならびかえ
        return this._selectStrategyOrder();
      case EMenuStrategy.TALK: // はなす
        this._create(EExecutorMapMenu.Trigger, ['talk']);
        return true;
      case EMenuStrategy.SEARCH: // しらべる
        this._create(EExecutorMapMenu.Trigger, ['search']);
        return true;
      case EMenuStrategy.DOOR: // とびら
        this._create(EExecutorMapMenu.Trigger, ['door']);
        return true;
      case EMenuStrategy.SUSPEND: // ちゅうだん
        this._create(EExecutorMapMenu.SuspendConfirmMes);
        return true;
    }
    return false;
  }

  /**
   * ならびかえ選択
   */
  private _selectStrategyOrder() {
    if (!gameParty.hasFollower()) {
      // 仲間がいない
      this._create(EExecutorMapMenu.NoticeMes, ['solo']);
    } else {
      this._create(EExecutorMapMenu.Order);
    }
    return true;
  }

  /**
   * 装備時
   */
  private _executeEquip() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectEquip(result?.object as GameMember);
  }

  /**
   * そうびメンバー選択決定
   * @param member
   */
  private _selectEquip(member: GameMember) {
    if (!member.hasItem()) {
      // 道具を持っていない
      this._create(EExecutorMapMenu.NoticeMes, ['noItem']);
    } else {
      this._create(EExecutorMapMenu.EquipWeapon);
    }

    return true;
  }

  /**
   * そうび武器時
   */
  private _executeEquipWeapon() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectWeapon(result.object as GameItem);
  }

  /**
   * そうび武器決定
   * itemがない場合は外す
   * @param item
   */
  private _selectWeapon(item: GameItem) {
    //const member = this._getSelectedMember(EExecutorMapMenu.Equip);
    const member = this._getItemSelectedMember(EExecutorMapMenu.Equip);
    if (!this._checkEquip(member, item)) {
      return true;
    }
    // 装備
    const [equipItem, enable] = this._getChangeEquipItem(member.weapon, item);
    member.equipItem(equipItem, enable);
    // 鎧へ進む
    this._create(EExecutorMapMenu.EquipArmor);

    return true;
  }

  /**
   * そうび鎧時
   */
  private _executeEquipArmor() {
    const result = this._getResult();

    if (this._selectCancel(result.index)) {
      return true;
    }
    return this._selectArmor(result.object as GameItem);
  }

  /**
   * そうび鎧決定
   * itemがない場合は外す
   * @param item
   */
  private _selectArmor(item: GameItem) {
    //const member = this._getSelectedMember(EExecutorMapMenu.Equip);
    const member = this._getItemSelectedMember(EExecutorMapMenu.Equip);
    if (!this._checkEquip(member, item)) {
      return true;
    }
    // 鎧
    const [equipItem, enable] = this._getChangeEquipItem(member.armor, item);
    member.equipItem(equipItem, enable);
    // 盾へ進む
    this._create(EExecutorMapMenu.EquipShield);

    return true;
  }

  /**
   * そうび盾時
   */
  private _executeEquipShield() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectShield(result?.object as GameItem);
  }

  /**
   * そうび盾決定
   * itemがない場合は外す
   * @param item
   */
  private _selectShield(item: GameItem) {
    //const member = this._getSelectedMember(EExecutorMapMenu.Equip);
    const member = this._getItemSelectedMember(EExecutorMapMenu.Equip);
    if (!this._checkEquip(member, item)) {
      return true;
    }
    // 盾
    const [equipItem, enable] = this._getChangeEquipItem(member.shield, item);
    member.equipItem(equipItem, enable);
    // 兜へ進む
    this._create(EExecutorMapMenu.EquipHelmet);

    return true;
  }

  /**
   * そうび兜時
   */
  private _executeEquipHelmet() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectHelmet(result?.object as GameItem);
  }

  /**
   * そうび兜決定
   * itemがない場合は外す
   * @param item
   */
  private _selectHelmet(item: GameItem) {
    //const member = this._getSelectedMember(EExecutorMapMenu.Equip);
    const member = this._getItemSelectedMember(EExecutorMapMenu.Equip);
    if (!this._checkEquip(member, item)) {
      return true;
    }
    // 兜
    const [equipItem, enable] = this._getChangeEquipItem(member.helmet, item);
    member.equipItem(equipItem, enable);
    // 装飾品へ進む
    this._create(EExecutorMapMenu.EquipAccessory);

    return true;
  }

  /**
   * そうび装飾品時
   */
  private _executeEquipAccessory() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectAccessory(result?.object as GameItem);
  }

  /**
   * そうび装飾品決定
   * itemがない場合は外す
   * @param item
   */
  private _selectAccessory(item: GameItem) {
    const member = this._getItemSelectedMember(EExecutorMapMenu.Equip);
    if (!this._checkEquip(member, item)) {
      return true;
    }
    // 装飾品
    const [equipItem, enable] = this._getChangeEquipItem(
      member.accessory,
      item
    );
    member.equipItem(equipItem, enable);
    // メンバー選択に戻る
    this._popPos(EExecutorMapMenu.Equip);

    return true;
  }

  /**
   * 装備確認
   * @param member
   * @param item
   */
  private _checkEquip(member: GameMember, item?: GameItem) {
    // 装備しないを選択した場合はitemがない
    if (item && !member.canEquip(item)) {
      GameUtils.setSlotActorName(member.name);
      GameUtils.setSlotItemName(item.name);
      // 装備できない
      this._create(EExecutorMapMenu.NoticeMes, ['cantEquip']);
      return false;
    }
    return true;
  }

  /**
   * 装備してれば外すしてなければつけるを返す
   * @param offItem
   * @param onItem
   */
  private _getChangeEquipItem(
    offItem?: GameItem,
    onItem?: GameItem
  ): [GameItem | undefined, boolean] {
    return onItem ? [onItem, true] : [offItem, false];
  }

  /**
   * 並び替え時
   */
  private _executeOrder() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectOrder(result?.object as GameMember[]);
  }

  /**
   * 並び替え決定
   * @param orders
   */
  private _selectOrder(orders: GameMember[]) {
    this._fluctuateOn();
    if (gameParty.changeOrder(orders)) {
      gameMarch.refresh();
    }
    this._popPos();
    return true;
  }

  /**
   * ちゅうだん確認メッセージ
   */
  private _executeSuspendConfirmMes() {
    this._create(EExecutorMapMenu.SuspendYesNo);
    return true;
  }

  /**
   * ちゅうだん選択
   */
  private _executeSuspendYesNo() {
    const result = this._getResult();

    if (result?.index !== 0) {
      return this._selectSuspendNo();
    }
    return this._selectSuspendYes();
  }

  /**
   * ちゅうだんしない
   * @returns
   */
  private _selectSuspendNo() {
    this._popPos(EExecutorMapMenu.Strategy);
    return true;
  }

  /**
   * ちゅうだんする
   * @returns
   */
  private _selectSuspendYes() {
    const id = gameTemp.testPlay ? 'suspendData' : 'suspend';
    this._pushCommonScriptCommand(system.commonScriptIds[id]);
    this._create(EExecutorMapMenu.SuspendResult);
    return true;
  }

  /**
   * ちゅうだん結果
   */
  private _executeSuspendResult() {
    this._popAll();
    return true;
  }

  /**
   * イベント実行時
   * メニューを終了させる
   * 1フレーム待機させたいのでfalseを返す
   */
  private _executeTrigger() {
    this._popAll();
    return false;
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
   * @param index
   * @param pos
   * @param cancelIndex
   */
  protected override _selectCancel(
    index: number,
    pos?: number,
    cancelIndex?: number
  ) {
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
