import { gameParty, system } from './DataStore';
import { Item } from './DataTypes';
import {
  EExecutorEmbedded,
  EmbeddedMenuInfo,
  ExecutorEmbeddedBase,
} from './ExecutorEmbedded';
import { GameItem } from './GameItem';
import { GameMember } from './GameMember';
import { GameUtils } from './GameUtils';

/**
 * 道具受け取る定数定義
 */
const enum EExecutorItemPickup {
  Goods,
  Target,
  Other,
  PickupMes,
  GotMes,
  PickupEndMes,
  GotEndMes,
  GotCancelMes,
}

/**
 * 道具受け取るメニュー
 */
export class ExecutorItemPickup extends ExecutorEmbeddedBase {
  /**
   * メニュー情報
   * 0.預り道具ウィンドウ
   * 1.所持者選択ウィンドウ
   * 2.もう持てない場合のはいいいえウィンドウ
   * 3.なにも預かっていないときのメッセージ
   * 4.受け取ったときのメッセージ
   * 5.はたんじょうたいで受け取ったときのメッセージ
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 107 },
      { menuId: 108, messageNames: ['whoOwner'] },
      { menuId: 81, messageNames: ['noEmptyItem'] },
      { menuId: 0, messageNames: ['buy'] },
      { menuId: 0, messageNames: ['got'] },
      { menuId: 0, messageNames: ['buyEnd'] },
      { menuId: 0, messageNames: ['gotEnd'] },
      { menuId: 0, messageNames: ['gotCancel'] },
    ];
  }

  /**
   * カスタムコマンド
   * @param newPos
   */
  protected override _createCustomCommand(newPos: number) {
    switch (newPos) {
      case EExecutorItemPickup.Other:
        this._createMessageCommand(newPos);
        this._pushSeCommand(system.soundIds.confirm);
        this._createMenuCommand(newPos);
        return true;
    }
    return false;
  }

  /**
   * 受け取り道具Idを取得
   * @param pos
   * @returns
   */
  private _getSelectedGoodsId(pos: number) {
    const index = this._getSelectedIndex(pos);
    return gameParty.storedItems[index].id;
  }

  /**
   * 実行
   */
  protected _executePos(pos: number) {
    switch (pos) {
      case EExecutorItemPickup.Goods:
        return this._executeGoods();
      case EExecutorItemPickup.Target:
        return this._executeTarget();
      case EExecutorItemPickup.Other:
        return this._executeOther();
      case EExecutorItemPickup.PickupMes:
      case EExecutorItemPickup.GotMes:
        return this._executeBuyGotMes();
      case EExecutorItemPickup.PickupEndMes:
      case EExecutorItemPickup.GotEndMes:
        return this._executeBuyGotEndMes();
      case EExecutorItemPickup.GotCancelMes:
        return this._executeGotCancelMes();
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
    return this._selectGoods(result?.object as Item);
  }

  /**
   * 購入物選択処理
   * @param item
   */
  private _selectGoods(item: Item) {
    GameUtils.setSlotItemName(item.name);
    this._create(EExecutorItemPickup.Target);

    return true;
  }

  /**
   * 所持者選択時
   */
  private _executeTarget() {
    const result = this._getResult();

    const index = result?.index ?? -1;
    if (index < 0) {
      this._create(EExecutorItemPickup.GotCancelMes);
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
      this._create(EExecutorItemPickup.Other);
      return true;
    }
    // 受け取り処理
    this._pickup();

    return true;
  }

  /**
   * 受け取り処理
   */
  private _pickup() {
    // 入手
    //const member = this._getSelectedMember(EExecutorItemPickup.Target);
    const member = this._getItemSelectedMember(EExecutorItemPickup.Target);
    const itemId = this._getSelectedGoodsId(EExecutorItemPickup.Goods);
    member.pushItem(itemId);
    // 在庫減
    gameParty.removeStoreItem(itemId);

    if (gameParty.storedItems.length > 0) {
      // 生きているかどうかでメッセージを変える
      const pos = member.live
        ? EExecutorItemPickup.PickupMes
        : EExecutorItemPickup.GotMes;
      this._create(pos);
    } else {
      // 生きているかどうかでメッセージを変える
      const pos = member.live
        ? EExecutorItemPickup.PickupEndMes
        : EExecutorItemPickup.GotEndMes;
      this._create(pos);
    }
  }

  /**
   * 他の人が持つ時
   */
  private _executeOther() {
    const result = this._getResult();

    if (this._selectCancel(result?.index, EExecutorEmbedded.End, 1)) {
      return true;
    }

    this._popPos(EExecutorItemPickup.Target);

    return true;
  }

  /**
   * 受け取りメッセージ
   */
  private _executeBuyGotMes() {
    this._popPos(EExecutorItemPickup.Goods);
    return true;
  }

  /**
   * 最後の預け物の受け取りメッセージ
   * @returns
   */
  private _executeBuyGotEndMes() {
    this._popAll();
    return true;
  }

  /**
   * 預け取りキャンセルメッセージ
   */
  private _executeGotCancelMes() {
    this._popPos(EExecutorItemPickup.Goods);
    return true;
  }
}

/**
 * 道具預ける定数定義
 */
const enum EExecutorItemKeep {
  Member,
  Goods,
  NoItemMes,
  NoKeepMes,
  SellMes,
}

/**
 * 道具預けるメニュー
 */
export class ExecutorItemKeep extends ExecutorEmbeddedBase {
  /**
   * メニュー情報
   * 0.所持者選択ウィンドウ
   * 1.売り物ウィンドウ
   * 2.売れる道具がないメッセージ
   * 3.預ける場所がいっぱいのときのメッセージ
   * 4.売った時のメッセージ
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 109 },
      { menuId: 110, parentMenuId: 109 },
      { menuId: 0, messageNames: ['noSellItem'] },
      { menuId: 0, messageNames: ['noSell', 'afterSell'] },
      { menuId: 0, messageNames: ['sell', 'afterSell'] },
    ];
  }

  /**
   * 実行
   */
  protected _executePos(pos: number) {
    switch (pos) {
      case EExecutorItemKeep.Member:
        return this._executeMember();
      case EExecutorItemKeep.Goods:
        return this._executeGoods();
      case EExecutorItemKeep.NoItemMes:
        return this._executeNoItemMes();
      case EExecutorItemKeep.NoKeepMes:
        return this._executeNoSellMes();
      case EExecutorItemKeep.SellMes:
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
    return this._selectMember(result?.object as GameMember);
  }

  /**
   * メンバー選択決定
   * @param member
   */
  private _selectMember(member: GameMember) {
    GameUtils.setSlotActorName(member.name);
    if (!member.hasItem()) {
      // 道具を持っていない
      this._create(EExecutorItemKeep.NoItemMes);
    } else {
      // チェックポイント
      this._create(EExecutorItemKeep.Goods);
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
    return this._selectGoods(result?.object as GameItem);
  }

  /**
   * 売るもの決定
   * @param item
   */
  private _selectGoods(item: GameItem) {
    GameUtils.setSlotItemName(item.name);
    // 預けられる場所があるかどうか
    if (gameParty.checkStoreItemSpace(item.id)) {
      // 預ける
      this._keep();
    } else {
      // 預けられない
      this._create(EExecutorItemKeep.NoKeepMes);
    }

    return true;
  }

  /**
   * 預ける処理
   */
  private _keep() {
    //const member = this._getSelectedMember(EExecutorItemKeep.Member);
    const member = this._getItemSelectedMember(EExecutorItemKeep.Member);
    const item = this._getSelectedItemFromMember(
      EExecutorItemKeep.Goods,
      member
    );
    member.eraseItem(item);
    // 貯蔵
    gameParty.addStoreItem(item.id);
    // 他に預けるかメッセージ
    this._create(EExecutorItemKeep.SellMes);
  }

  /**
   * 売るものがないメッセージ時
   */
  private _executeNoItemMes() {
    this._popPos();
    return true;
  }

  /**
   * 預けられないメッセージ時
   */
  private _executeNoSellMes() {
    this._popPos(EExecutorItemKeep.Member);
    return true;
  }

  /**
   * 預けたメッセージ時
   */
  private _executeSellMes() {
    this._popPos(EExecutorItemKeep.Goods);
    return true;
  }
}
