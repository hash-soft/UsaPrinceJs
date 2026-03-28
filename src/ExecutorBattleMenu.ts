import { ETerm } from './DataTypes';
import {
  actions,
  gameParty,
  gameSystem,
  skillLists,
  skills,
  terms,
} from './DataStore';
import { EmbeddedMenuInfo, ExecutorEmbeddedBase } from './ExecutorEmbedded';
import { EActionKind, GameBattleAction } from './GameAction';
import { EFightKind } from './GameBattleProcess';
import { EMessageMode, EMessageOption } from './GameMessage';
import { EErrorMessage, GameUtils } from './GameUtils';

/**
 * 戦闘メニュー定数定義
 */
const enum EExecutorBattleMenu {
  Status,
  PartyCommand,
  Speed,
  NoEscapeMes,
  MemberCommand,
  EnemyTarget,
  MemberTarget,
  SpellChoice,
  NoSpellMes,
  ItemChoice,
  ItemDo,
  NoItemMes,
  NoEquipMes,
  NoticeMes,
}

const enum EMenuId {
  None,
  Status = 122,
  PartyCommand = 123,
  Speed = 124,
  MemberCommand = 126,
}

const enum EPartyCommand {
  Fight,
  Speed,
  Escape,
}

const enum EMemberCommand {
  Attack,
  Skill,
  Parry,
  Item,
}

/**
 * 戦闘コマンド組み込みメニュー
 */
export class ExecutorBattleMenu extends ExecutorEmbeddedBase {
  /**
   * メンバーコマンドのインデックス
   */
  private _commandIndex: number = -1;

  /**
   * 操作中のコマンド
   */
  private get _currentCommand() {
    return gameParty.getBattleMemberCommand(this._commandIndex);
  }

  /**
   * 操作中のメンバー名
   */
  private get _currentMemberName() {
    return this._currentMember ? this._currentMember.name : '';
  }

  /**
   * 操作中のメンバー
   */
  private get _currentMember() {
    return gameParty.getMember(this._currentCommand.index);
  }

  /**
   * 現対象のコマンドをクリアする
   */
  private _clearCurrentCommand() {
    this._currentCommand.options.kind = EActionKind.Unset;
    this._currentCommand.options.itemIndex = 0;
    this._currentCommand.options.targetGroup = -1;
    this._currentCommand.options.targetIndex = -1;
  }

  /**
   * メニュー情報
   * 0.ステータス
   * 1.パーティコマンド
   * 2.速度選択
   * 3.逃げられないメッセージ
   * 4.メンバーコマンド
   * 5.敵選択
   * 6.味方選択
   * 7.呪文選択
   * 8.呪文使えないメッセージ
   * 9.道具選択
   * 10.道具どうする選択
   * 11.道具持ってないメッセージ
   * 12.装備できないメッセージ
   * 13.通常メッセージ
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: EMenuId.Status },
      { menuId: EMenuId.PartyCommand },
      { menuId: EMenuId.Speed },
      { menuId: 0, messageNames: ['noEscape'] },
      { menuId: EMenuId.MemberCommand, extra: GameUtils.getMenuExtraSlotIds() },
      { menuId: 127 },
      { menuId: 128, extra: GameUtils.getMenuExtraSlotIds() },
      { menuId: 129, extra: GameUtils.getMenuExtraSlotIds() },
      { menuId: 0, messageNames: ['battleNoSpell'] },
      { menuId: 130, extra: GameUtils.getMenuExtraSlotIds() },
      {
        menuId: 131,
        parentMenuId: 130,
        extra: GameUtils.getMenuExtraSlotIds(),
      },
      { menuId: 0, messageNames: ['battleNoItem'] },
      { menuId: 0, messageNames: ['battleNoEquip'] },
      { menuId: 0 },
    ];
  }

  /**
   * カスタムコマンド
   * メッセージに終了まで待機をつける
   * @param newPos
   */
  protected _createCustomCommand(
    newPos: number,
    params: Array<number | string>
  ) {
    switch (newPos) {
      case EExecutorBattleMenu.NoEscapeMes:
      case EExecutorBattleMenu.NoSpellMes:
      case EExecutorBattleMenu.NoItemMes:
      case EExecutorBattleMenu.NoEquipMes:
        this._resultMessageSetting();
        this._createMessageCommand(newPos);
        this._pushMessageCloseWaitCommand();
        return true;
      case EExecutorBattleMenu.NoticeMes:
        this._resultMessageSetting();
        this._createMessageCommandsFromId(params as number[]);
        this._pushMessageCloseWaitCommand();
        return true;
    }
    return false;
  }

  /**
   * 結果メッセージモードコマンドを作成する
   */
  private _resultMessageSetting() {
    this._pushMessageControlCommand(
      EMessageOption.Mode - EMessageOption.SettingsOption,
      EMessageMode.BattleResult
    );
  }

  /**
   * 実行
   */
  protected _executePos(pos: number): boolean {
    switch (pos) {
      case EExecutorBattleMenu.Status:
        return this._executeStatus();
      case EExecutorBattleMenu.PartyCommand:
        return this._executePartyCommand();
      case EExecutorBattleMenu.Speed:
        return this._executeSpeed();
      case EExecutorBattleMenu.MemberCommand:
        return this._executeMemberCommand();
      case EExecutorBattleMenu.EnemyTarget:
        return this._executeEnemyTarget();
      case EExecutorBattleMenu.MemberTarget:
        return this._executeMemberTarget();
      case EExecutorBattleMenu.SpellChoice:
        return this._executeSpellChoice();
      case EExecutorBattleMenu.ItemChoice:
        return this._executeItemChoice();
      case EExecutorBattleMenu.ItemDo:
        return this._executeItemDo();
      case EExecutorBattleMenu.NoEscapeMes:
      case EExecutorBattleMenu.NoSpellMes:
      case EExecutorBattleMenu.NoItemMes:
      case EExecutorBattleMenu.NoEquipMes:
        return this._executeMes();
      case EExecutorBattleMenu.NoticeMes:
        return this._executeNoticeMes();
    }

    return false;
  }

  /**
   * ステータス表示時
   */
  private _executeStatus() {
    this._create(EExecutorBattleMenu.PartyCommand);
    return true;
  }

  /**
   * パーティコマンド実行時
   */
  private _executePartyCommand() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectPartyCommand(result?.index);
  }

  /**
   * パーティコマンド選択
   * @param index
   */
  private _selectPartyCommand(index: number) {
    switch (index) {
      case EPartyCommand.Fight: // たたかう
        return this._startMemberCommand();
      case EPartyCommand.Speed: // そくど
        return this._selectSpeedCommand();
      case EPartyCommand.Escape: // にげる
        return this._selectEscapeCommand();
    }

    return false;
  }

  /**
   * たたかう選択
   */
  private _startMemberCommand() {
    gameParty.setBattlePartyCommand(EFightKind.Fight);
    this._resetMemberCommand();

    // 現在のメニューを破棄し
    // 最初のメンバーを設定して
    // メンバーウィンドウへ
    this._nextMember();
    return true;
  }

  /**
   * メンバーコマンドをリセットする
   */
  private _resetMemberCommand() {
    this._resetCommandIndex();
  }

  /**
   * メンバーコマンドのインデックスをリセットする
   */
  private _resetCommandIndex() {
    this._commandIndex = -1;
  }

  /**
   * 次入力メンバーへ
   */
  private _nextMember() {
    // 次のメンバーを設定する
    this._setSelectMember();
    if (!this._currentCommand) {
      // ない場合コマンドを終了する
      this._setEndPos();
      return true;
    }
    GameUtils.setSlotActorName(this._currentMemberName);
    this._setMemberCommand();

    // メンバーコマンドへ
    this._jump(
      { pos: EExecutorBattleMenu.MemberCommand },
      EExecutorBattleMenu.Status
    );

    return true;
  }

  /**
   * 入力メンバーを設定
   * @param next true:次のメンバー false:前のメンバー
   */
  private _setSelectMember(next = true) {
    const inc = next ? 1 : -1;
    for (;;) {
      this._commandIndex += inc;
      if (!this._currentCommand) {
        break;
      }
      const member = gameParty.getMember(this._currentCommand.index);
      if (member.input) {
        // 入力を消去する
        this._clearCurrentCommand();
        break;
      }
    }
  }

  /**
   * 速度を選択
   * @returns
   */
  private _selectSpeedCommand() {
    this._create(EExecutorBattleMenu.Speed, [gameSystem.battleSpeed - 1]);
    return true;
  }

  /**
   * 速度決定時
   * @returns
   */
  private _executeSpeed() {
    const result = this._getResult();

    if ((result?.index ?? -1) < 0) {
      this._backPartyCommand();
      return true;
    }

    this._selectSpeed(result?.index);

    return true;
  }

  /**
   * 速度を設定する
   * @param index
   */
  private _selectSpeed(index: number) {
    gameSystem.setBattleSpeed(index + 1);
    this._backPartyCommand();
  }

  /**
   * 逃げる選択
   */
  private _selectEscapeCommand() {
    // 逃げる選択可能か
    if (gameParty.movable) {
      // 逃げるを設定
      gameParty.setBattlePartyCommand(EFightKind.Escape);
      // コマンド終了
      this._setEndPos();
    } else {
      // 動けず逃げられない
      GameUtils.setSlotActorName(gameParty.getUnitCallName());
      this._create(EExecutorBattleMenu.NoEscapeMes);
    }
    return true;
  }

  /**
   * メンバーコマンド時
   */
  private _executeMemberCommand() {
    const result = this._getResult();

    if (this._selectMemberCommandCancel(result?.index)) {
      return true;
    }
    return this._selectMemberCommand(result?.index);
  }

  /**
   * メンバーコマンド時のキャンセル
   * スタックをステータスまで巻き戻すため通常のキャンセルと異なる
   * @param index
   */
  private _selectMemberCommandCancel(index: number) {
    if (index === -2) {
      // オールキャンセル
      this._allCancel();
      return true;
    } else if (index < 0) {
      // 前のメンバーに戻す
      this._setSelectMember(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this._currentCommand == null
        ? this._backPartyCommand()
        : this._backPrevMemberCommand();

      return true;
    }

    return false;
  }

  /**
   * パーティコマンドに戻る
   */
  private _backPartyCommand() {
    GameUtils.setSlotActorName('');
    this._jump(
      { pos: EExecutorBattleMenu.PartyCommand },
      EExecutorBattleMenu.Status
    );
  }

  /**
   * メンバーコマンドに戻る
   */
  private _backPrevMemberCommand() {
    this._setMemberCommand();
    GameUtils.setSlotActorName(this._currentMemberName);
    this._jump(
      { pos: EExecutorBattleMenu.MemberCommand },
      EExecutorBattleMenu.Status
    );
  }

  /**
   * メンバーコマンドを設定する
   */
  private _setMemberCommand() {
    const member = this._currentMember;
    if (!member.hasBattleSkill()) {
      GameUtils.setExtraSlots([
        terms[ETerm.Attack],
        terms[ETerm.Parry],
        terms[ETerm.Item],
      ]);
      return;
    }
    const skillTerm = terms[skillLists[member.battleSkillListId].termId];
    GameUtils.setExtraSlots([
      terms[ETerm.Attack],
      skillTerm,
      terms[ETerm.Parry],
      terms[ETerm.Item],
    ]);
  }

  /**
   * メンバーコマンド選択
   * @param index
   */
  private _selectMemberCommand(index: number) {
    switch (this._convertMemberCommandIndex(index)) {
      case EMemberCommand.Attack: // こうげき
        return this._selectAttachCommand();
      case EMemberCommand.Skill: // ぎのう
        return this._selectSpellCommand();
      case EMemberCommand.Parry: // ぼうぎょ
        return this._selectParryCommand();
      case EMemberCommand.Item: // どうぐ
        return this._selectItemCommand();
    }

    return false;
  }

  /**
   * メンバーコマンドで選択されたインデックスを処理用に変換する
   * @param index
   */
  private _convertMemberCommandIndex(index: number) {
    if (index < EMemberCommand.Skill) {
      return index;
    }
    const member = this._currentMember;
    return member.hasBattleSkill() ? index : index + 1;
  }

  /**
   * 攻撃選択
   */
  private _selectAttachCommand() {
    const member = gameParty.getMember(this._currentCommand.index);
    const options = this._currentCommand.options;
    options.kind = EActionKind.Skill;
    options.itemIndex = member.getNormalAttackId();
    const skill = skills[options.itemIndex];
    if (this._createNextRange(skill.battleActionId)) {
      return true;
    }
    // 範囲が全体のときは次のメンバーへ
    return this._nextMember();
  }

  /**
   * 呪文選択
   */
  private _selectSpellCommand() {
    const commandInfo = this._currentCommand;
    const member = gameParty.getMember(commandInfo.index);
    if (!member.hasBattleSkill()) {
      // 呪文を使えない
      this._create(EExecutorBattleMenu.NoSpellMes);
    } else {
      GameUtils.setExtraSlots([commandInfo.index]);
      commandInfo.options.kind = EActionKind.Skill;
      this._create(EExecutorBattleMenu.SpellChoice, [member.lastBattleSkill]);
    }
    return true;
  }

  /**
   * 防御選択
   */
  private _selectParryCommand() {
    const options = this._currentCommand.options;
    options.kind = EActionKind.Skill;
    options.itemIndex = GameUtils.getNormalParryId();

    return this._nextMember();
  }

  /**
   * 道具選択
   */
  private _selectItemCommand() {
    const commandInfo = this._currentCommand;
    const member = gameParty.getMember(commandInfo.index);
    if (!member.hasItem()) {
      // 道具を持っていない
      this._create(EExecutorBattleMenu.NoItemMes);
    } else {
      GameUtils.setExtraSlots([commandInfo.index]);
      commandInfo.options.kind = EActionKind.Item;
      this._create(EExecutorBattleMenu.ItemChoice, [member.lastBattleItem]);
    }
    return true;
  }

  /**
   * 敵選択時
   */
  private _executeEnemyTarget() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectEnemyTarget(result?.index);
  }

  /**
   * 敵グループ選択
   * @param index
   */
  private _selectEnemyTarget(index: number) {
    this._currentCommand.options.targetGroup = index;
    return this._nextMember();
  }

  /**
   * 味方選択時
   */
  private _executeMemberTarget() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectMemberTarget(result?.index);
  }

  /**
   * 味方選択決定
   * @param index
   */
  private _selectMemberTarget(index: number) {
    const options = this._currentCommand.options;
    options.targetGroup = 0;
    options.targetIndex = index;

    return this._nextMember();
  }

  /**
   * 呪文選択時
   */
  private _executeSpellChoice() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    this._selectSkill(result?.index);

    return true;
  }

  /**
   * 技能を選択時
   * @param index
   */
  private _selectSkill(index: number) {
    const member = gameParty.getMember(this._currentCommand.index);
    member.setLastBattleSkill(index);
    this._selectAction(index);
  }

  /**
   * 道具選択時
   */
  private _executeItemChoice() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    this._selectItemChoice(result?.index);

    return true;
  }

  /**
   * 道具選択
   * @param index
   */
  private _selectItemChoice(index: number) {
    const commandInfo = this._currentCommand;
    const member = gameParty.getMember(commandInfo.index);
    if (member.items[index].handEquipment) {
      GameUtils.setExtraSlots([commandInfo.index]);
      commandInfo.options.itemIndex = index;
      this._create(EExecutorBattleMenu.ItemDo);
    } else {
      this._selectItem(index);
    }
  }

  /**
   * 道具選択時
   */
  private _executeItemDo() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    // つかうかそうびかで分ける
    this._selectItemDo(result?.index);

    return true;
  }

  /**
   * 道具どうする
   * @param index
   */
  private _selectItemDo(index: number) {
    const itemIndex = this._currentCommand.options.itemIndex;
    if (itemIndex === undefined) {
      throw new Error(EErrorMessage.ProgramError);
    }
    if (index === 0) {
      this._selectItem(itemIndex);
    } else {
      this._selectEquip(itemIndex);
    }
  }

  /**
   * 道具を選択時
   * @param index
   */
  private _selectItem(index: number) {
    const member = gameParty.getMember(this._currentCommand.index);
    member.setLastBattleItem(index);
    this._selectAction(index);
  }
  /**
   * 装備選択
   * @param index
   * @returns
   */
  private _selectEquip(index: number) {
    const member = gameParty.getMember(this._currentCommand.index);
    const item = member.items[index];

    if (item.equip) {
      item.setEquip(false);
    } else if (member.canEquip(item)) {
      member.equipItem(item, true);
    } else {
      GameUtils.setSlotActorName(member.name);
      GameUtils.setSlotItemName(item.name);
      this._create(EExecutorBattleMenu.NoEquipMes);
      return;
    }
    this._popPos();
  }

  /**
   * 行動選択
   * 呪文と道具の共通処理
   * @param index
   */
  private _selectAction(index: number) {
    const commandInfo = this._currentCommand;
    const options = commandInfo.options;

    const member = gameParty.getMember(commandInfo.index);
    const special =
      options.kind === EActionKind.Skill
        ? member.getBattleSkill(index)
        : member.getItem(index);
    const action = actions[special.battleActionId];
    // 選択可能チェック
    const [success, , id] = GameBattleAction.checkSelect(member, action);
    if (!success) {
      this._create(EExecutorBattleMenu.NoticeMes, [id]);
      return true;
    }

    // 行動決定
    options.itemIndex = options.kind === EActionKind.Skill ? special.id : index;

    if (this._createNextRange(special.battleActionId)) {
      return true;
    }

    // 次のメンバーへ
    return this._nextMember();
  }

  /**
   * 対象指定
   * @param actionId
   * @returns
   */
  private _createNextRange(actionId: number) {
    const action = actions[actionId];
    // 範囲で次の遷移を決定する
    if (GameBattleAction.checkForOneFriend(action)) {
      // 仲間一人
      GameUtils.setExtraSlots([actionId]);
      this._create(EExecutorBattleMenu.MemberTarget);
      return true;
    }
    if (GameBattleAction.checkForOneOrGroupEnemy(action)) {
      // 敵1人orグループ
      this._create(EExecutorBattleMenu.EnemyTarget);
      return true;
    }
    return false;
  }

  /**
   * メッセージ時
   */
  private _executeMes() {
    this._popPos();
    return true;
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
  protected _selectCancel(index: number, pos?: number, cancelIndex?: number) {
    if (index === -2) {
      this._allCancel();
      return true;
    }
    return super._selectCancel(index, pos, cancelIndex);
  }

  /**
   * オールキャンセル
   * ステータスまで戻る
   */
  private _allCancel() {
    this._popPos(EExecutorBattleMenu.Status);
  }
}
