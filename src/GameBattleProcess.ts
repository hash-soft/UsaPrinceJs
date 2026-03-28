import { GameMusic } from './AudioUtils';
import {
  commonScriptset,
  enemies,
  gameAnimations,
  gameBattleTemp,
  gameMenus,
  gameParty,
  gameSystem,
  gameTemp,
  gameTroop,
  items,
  skills,
  system,
} from './DataStore';
import {
  BattleCondition,
  EBattleConditionType,
  EBattleEventSpan,
} from './DataTypes';
import { setSystemSlot } from './DataUtils';
import {
  ActionCommandOptions,
  EActionKind,
  GameBattleAction,
} from './GameAction';
import { GameActionTurnEnd } from './GameActionInterval';
import {
  ActionResult,
  EActionResultExtra,
  EActionResultText,
  EActionResultTextSetting,
} from './GameActionUtils';
import { EAnimationWaitType } from './GameAnimation';
import { EBaseParamId, GameBattler } from './GameBattler';
import { EMessageMode, EMessageOption } from './GameMessage';
import { EUnitTurnType, GameUnit } from './GameUnit';
import { GameUtils, EErrorMessage, GameNumberList } from './GameUtils';
import Utils from './Utils';

export const enum EFightKind {
  Fight,
  Escape,
}

type BpCommand = { code: string; params: unknown[] };

/**
 * 戦闘処理クラス
 * _**Process()は_nextProcess()から使用される
 */
export class GameBattleProcess {
  /**
   * コマンドリスト
   */
  private _mainList: BpCommand[];
  /**
   * 行動配列
   */
  private _actions: GameBattleAction[];
  /**
   * 割り込み行動配列
   */
  private _interruptActions: GameBattleAction[];
  /**
   * 実行中の行動
   */
  private _currentAction: GameBattleAction | null;
  /**
   * 戦闘者
   */
  private _battlers: GameBattler[];
  /**
   * ターン終了の行動
   */
  private _currentTunEnd: GameActionTurnEnd | null;
  /**
   * 待機カウント
   */
  private _waitCount: number;
  /**
   * 戦闘処理終了したか
   */
  private _end: boolean;
  /**
   * 演奏中か
   */
  private _playing: boolean;
  /**
   * 戦闘結果
   */
  private _result: string;
  /**
   * 入力中か
   */
  private _input: boolean;
  /**
   * 強制アニメーション待機
   */
  private _waitAnimation: boolean;
  /**
   * 逃走試行回数
   */
  private _escapeTrials: number;
  /**
   * 割り込みコマンド
   */
  private _interruptList: BpCommand[];
  /**
   * 追加先に設定しているコマンドリスト
   */
  private _list: BpCommand[];
  /**
   * イベントフラグ
   */
  private _eventFlags: boolean[];

  /**
   * コンストラクタ
   */
  constructor() {
    this._mainList = [];
    this._actions = [];
    this._interruptActions = [];
    this._currentAction = null;
    this._battlers = [];
    this._currentTunEnd = null;
    this._waitCount = 0;
    this._end = false;
    this._playing = false;
    this._result = '';
    this._input = false;
    this._waitAnimation = false;
    this._escapeTrials = 0;
    this._interruptList = [];
    this._list = this._mainList;
    this._eventFlags = [];
  }

  /**
   * 結果を取得する
   */
  get result() {
    return this._result;
  }

  /**
   * 戦闘メッセージId
   */
  get bmwId() {
    return system.battleMessageWindowId;
  }

  /**
   * 戦闘ステータスId
   */
  get bstId() {
    return system.battleStatusWindowId;
  }

  /**
   * 入力待ちを設定する
   */
  setInputWait() {
    if (
      gameMenus.setFn(this.bmwId, () => {
        this._input = false;
      })
    ) {
      this._input = true;
    }
  }

  /**
   * コマンド処理を追加する
   * @param process
   */
  push(process: BpCommand) {
    this._list.push(process);
  }

  /**
   * 開始処理を追加する
   */
  pushStart() {
    this.push({ code: 'start', params: [] });
  }

  /**
   * 敵出現処理を追加する
   */
  pushAppear() {
    this.push({ code: 'appear', params: [] });
  }

  /**
   * 敵出現後の処理を追加する
   */
  pushAfterAppear() {
    this.push({ code: 'afterAppear', params: [] });
  }

  /**
   * コマンド処理を追加する
   */
  pushCommand(Preemptive?: EUnitTurnType) {
    this.push({ code: 'command', params: [Preemptive] });
  }

  /**
   * コマンド後の処理を追加すう
   */
  pushAfterCommand() {
    this.push({ code: 'afterCommand', params: [] });
  }

  /**
   * 戦闘処理を追加する
   * @param params
   */
  pushFight(kind: EFightKind, preemptive: EUnitTurnType) {
    this.push({ code: 'fight', params: [kind, preemptive] });
  }

  /**
   * 逃げる処理を追加する
   */
  pushEscape(preemptive: EUnitTurnType) {
    this.push({ code: 'escape', params: [preemptive] });
  }

  /**
   * actionProcessを追加
   */
  pushAction() {
    this.push({ code: 'action', params: [] });
  }

  /**
   * 行動終了プロセスを追加
   * @param result
   */
  pushActionNext() {
    this.push({ code: 'actionNext', params: [] });
  }

  /**
   * ターン終了処理を追加する
   */
  pushTurnEnd() {
    this.push({ code: 'turnEnd', params: [] });
  }

  /**
   * ターン終了処理を追加する
   */
  pushFightEnd() {
    this.push({ code: 'fightEnd', params: [] });
  }

  /**
   * 短音楽演奏コマンドを作成する
   * @param id
   * @returns
   */
  private _createMePlayCommand(id: number, resume: number) {
    return { code: 'mePlay', params: [id, resume] };
  }

  /**
   * 勝利処理を追加する
   * @param params
   */
  pushWin() {
    this.push({ code: 'win', params: [] });
  }

  /**
   * 経験値処理を追加する
   * @param params
   */
  pushExp(...params) {
    this.push({ code: 'exp', params });
  }

  /**
   * レベルアップ処理を追加する
   * @param params
   */
  pushLevelUp(...params) {
    this.push({ code: 'levelUp', params });
  }

  /**
   * 取得金入手処理を追加する
   * @param params
   */
  pushGold(...params) {
    this.push({ code: 'gold', params });
  }

  /**
   * 取得道具入手処理を追加する
   * @param n
   */
  pushItem(n: number) {
    this.push({ code: 'item', params: [n] });
  }

  /**
   * 取得道具入手リトライ処理を追加する
   * @param itemId
   */
  pushRetryItem(itemId: number) {
    this.push({ code: 'retryItem', params: [itemId] });
  }

  /**
   * 全滅を追加する
   * @param params
   */
  pushDefeat() {
    this.push({ code: 'defeat', params: [] });
  }

  /**
   * 待機処理を追加する
   * 0でも連続実行を中断することができる
   * @param count
   */
  pushWait(count: number) {
    this.push({ code: 'wait', params: [count] });
  }

  /**
   * 入力待ちを追加する
   * @param params
   */
  pushInputWait(...params) {
    this.push({ code: 'inputWait', params });
  }

  /**
   * ウィンドウを閉じる処理を追加する
   * @param params
   */
  pushClose(...params) {
    this.push({ code: 'close', params });
  }

  /**
   * メッセージ表示処理を追加する
   * @param params
   */
  pushText(...params) {
    this.push(this._createTextCommand(...params));
  }

  /**
   * メッセージ表示コマンドを作成する
   * @param params
   * @returns
   */
  private _createTextCommand(...params) {
    return { code: 'text', params };
  }

  /**
   * スクリプト実行コマンドを作成する
   * @param id
   * @returns
   */
  private _createScriptCommand(id: number) {
    return { code: 'script', params: [id] };
  }

  /**
   * 速度設定を追加する
   */
  private _pushSpeedSetting() {
    this.pushTextSetting(this._getSpeedOption(gameSystem.battleSpeed));
  }

  /**
   * 文章設定を追加する
   * @param params
   */
  pushTextSetting(...params) {
    this.push(this._createTextSettingCommand(...params));
  }

  /**
   * 文章設定コマンドを作成する
   * @param params
   * @returns
   */
  private _createTextSettingCommand(...params) {
    return { code: 'textSetting', params };
  }

  /**
   * 数値変更コマンドを作成する
   * @returns
   */
  private _createFluctuateCommand() {
    return { code: 'fluctuate', params: [] };
  }

  /**
   * ベースパラメータ増減コマンドを作成する
   * @param n
   * @param param
   * @param index
   * @returns
   */
  private _createGainBaseParamCommand(n: number, param: number, index: number) {
    return { code: 'gainBaseParam', params: [n, param, index] };
  }

  /**
   * アニメーション処理を追加する
   * @param params
   */
  pushAnimation(animationId: number, targets: GameBattler[]) {
    this.push({ code: 'animation', params: [animationId, targets] });
  }

  /**
   * スロット設定を追加する
   * @param params
   */
  pushSetSlot(...params) {
    this.push({ code: 'setSlot', params });
  }

  /**
   * 行動者名設定を追加する
   * @param name
   */
  pushSetActorName(name: string) {
    this.push({ code: 'setActorName', params: [name] });
  }

  /**
   * 対象者名設定を追加する
   * @param name
   */
  pushSetTargetName(name: string) {
    this.push({ code: 'setTargetName', params: [name] });
  }

  /**
   * 複合処理を追加する
   * @param commands
   */
  pushComposite(commands: BpCommand[]) {
    this.push({ code: 'composite', params: [commands] });
  }

  /**
   * 処理中かどうか
   * @returns
   */
  running() {
    return !this._end;
  }

  /**
   * 更新
   * ウェイトにならない処理を次フレームで行いたいときは
   * ウェイト処理を挟む必要がある
   */
  update() {
    if (this._end) {
      return;
    }
    // 戦闘プロセス待機
    // スクリプトで入れた行動結果を取り出しあれば実行
    // スクリプト実行中なら実行
    //   まだ実行中なら次フレーム
    //   実行終了していたら再度ループ
    // 次プロセス処理
    //   継続か終了かで分岐
    for (;;) {
      if (this._waitMode()) {
        break;
      }

      if (this._interruptScript()) {
        if (gameSystem.battleExecutor.running()) {
          break;
        } else {
          gameTemp.setActionActorId(-1);
          gameTemp.setActionTargetId(-1);
          continue;
        }
      }

      if (this._interruptActionResult()) {
        continue;
      }

      if (this._nextProcess()) {
        continue;
      }
      break;
    }
  }

  /**
   * 待機モード
   * @returns
   */
  private _waitMode() {
    return (
      this._checkWaitCount() ||
      this._checkWaitWindow() ||
      this._checkWaitAnimation() ||
      this._checkInput() ||
      this._checkWaitPlaying()
    );
  }

  /**
   * 本クラスがウェイト中か
   * @returns
   */
  private _checkWaitCount() {
    if (this._waitCount > 0) {
      this._waitCount -= 1;
      return true;
    }
    return false;
  }

  /**
   * ウィンドウ関係の待機
   * @returns
   */
  private _checkWaitWindow() {
    return gameMenus.processing;
  }

  /**
   * アニメーションの待機
   */
  private _checkWaitAnimation() {
    if (this._waitAnimation) {
      return this._forceWaitAnimation();
    }
    switch (this._getAnimationWaitType()) {
      case EAnimationWaitType.SettingTime:
        return gameAnimations.runningSettingTime;
      case EAnimationWaitType.ToEnd:
        return gameAnimations.running;
      default:
        return false;
    }
  }

  /**
   * 強制待機アニメーション
   * @returns
   */
  private _forceWaitAnimation() {
    const result = gameAnimations.running;
    if (!result) {
      this._waitAnimation = false;
    }
    return result;
  }

  /**
   * アニメーション待機タイプを取得する
   * @returns
   */
  private _getAnimationWaitType() {
    const speed = gameSystem.battleSpeed;
    if (speed < 4 || speed > 8) {
      return EAnimationWaitType.None;
    } else if (speed < 6) {
      return EAnimationWaitType.SettingTime;
    } else {
      return EAnimationWaitType.ToEnd;
    }
  }

  /**
   * 入力の確認
   */
  private _checkInput(): boolean {
    if (!this._input) {
      return false;
    }
    return true;
  }

  /**
   * 演奏中の待機確認
   */
  private _checkWaitPlaying(): boolean {
    return this._playing;
  }

  /**
   * 行動結果割り込み
   * @returns
   */
  private _interruptActionResult() {
    const result = gameTemp.retrieveActionResult();
    if (result) {
      // 追加先を割り込みに変更
      this._interruptPushProcess(() => this._setActionResult(result));
      return true;
    }
    return false;
  }

  /**
   * 割り込み側のコマンドに変更して指定の関数を実行する
   * @param fn
   * @returns
   */
  private _interruptPushProcess<T>(fn: () => T) {
    this._list = this._interruptList;
    const result = fn();
    this._list = this._mainList;
    return result;
  }

  /**
   * スクリプト割り込み
   * @returns
   */
  private _interruptScript() {
    if (gameSystem.battleExecutor.running()) {
      gameSystem.updateBattleExecutor();
      return true;
    }
    return false;
  }

  /**
   * プロセス実行
   * @returns
   */
  private _nextProcess() {
    // 最初の要素を取り出す
    const process = this._interruptList.shift() ?? this._mainList.shift();
    if (process === undefined) {
      this._end = true;
      return false;
    }
    return this._executeBcMethod(process);
  }

  /**
   * 戦闘開始処理
   * @returns
   */
  private _startProcess() {
    this._resetEventFlags();
    this._setTextMenu([null, EMessageOption.Mode, EMessageMode.MidstBattle]);
    this.pushAppear();
    return false;
  }

  /**
   * 出現処理
   * @returns
   */
  private _appearProcess() {
    const groups = gameTroop.enemyGroups;
    const text = GameUtils.getSystemMessage('appear');
    for (const group of groups) {
      this.pushSetActorName(group.enemyName);
      this.pushText(this._getPlusOption(text));
    }
    this.pushTextSetting(this._getWaitOption(gameSystem.battleSpeed));
    // コマンド作成を同フレームで行わせないための対策
    this.pushWait(0);
    this.pushAfterAppear();
    return true;
  }

  /**
   * 敵出現後の処理
   * @returns
   */
  private _afterAppearProcess(): boolean {
    // 戦闘継続判定
    if (this._judgeEnd()) {
      // 終了していればここで終了
      return true;
    }
    const preemptive = gameTemp.battleOptions.preemptiveType;
    // 味方先制か
    if (this._checkPartyPreemptive(preemptive)) {
      return true;
    }
    // 敵先制か
    if (this._checkTroopPreemptive(preemptive)) {
      return true;
    }

    // なにもなければコマンド
    this.pushCommand();
    return true;
  }

  /**
   * 味方先制攻撃を確認する
   */
  private _checkPartyPreemptive(preemptive: EUnitTurnType) {
    if (
      !(
        preemptive === EUnitTurnType.PartyRaid ||
        preemptive === EUnitTurnType.PartySurprise
      )
    ) {
      return false;
    }
    this.pushSetActorName(gameParty.getUnitCallName());
    this.pushSetTargetName(gameTroop.getUnitCallName());
    this._pushSpeedSetting();
    const key =
      preemptive === EUnitTurnType.PartyRaid ? 'partyRaid' : 'partySurprise';
    const text = GameUtils.getSystemMessage(key);
    this.pushText(this._getRefreshOption(text));
    this.pushCommand(preemptive);

    return true;
  }

  /**
   * 敵先制攻撃を確認する
   */
  private _checkTroopPreemptive(preemptive: EUnitTurnType) {
    if (
      !(
        preemptive === EUnitTurnType.TroopRaid ||
        preemptive === EUnitTurnType.TroopSurprise
      )
    ) {
      return false;
    }
    this.pushSetActorName(gameTroop.getUnitCallName());
    this.pushSetTargetName(gameParty.getUnitCallName());
    this._pushSpeedSetting();
    const key =
      preemptive === EUnitTurnType.TroopRaid ? 'troopRaid' : 'troopSurprise';
    const text = GameUtils.getSystemMessage(key);
    this.pushText(this._getRefreshOption(text));
    this.pushFight(EFightKind.Fight, preemptive);

    return true;
  }

  /**
   * メニューコマンド処理
   * @returns
   */
  private _commandProcess(preemptive = EUnitTurnType.Normal): boolean {
    // メニューコマンドを発行
    const event = commonScriptset[GameUtils.getCommonScriptId('battleMenu')];
    if (event === undefined) {
      throw new Error(EErrorMessage.OutrangeScript);
    }
    gameSystem.battleExecutor.setup(event.list, null);
    // 入力準備
    gameParty.makeActionTimes();
    gameParty.setBattlePartyCommand(EFightKind.Fight);
    gameParty.resetMemberCommand();
    gameParty.setPreemptiveType(preemptive);
    this.pushAfterCommand();
    return false;
  }

  /**
   * メニューコマンド入力後処理
   * @returns
   */
  private _afterCommandProcess(): boolean {
    this.pushFight(
      gameParty.getBattlePartyCommand(),
      gameParty.getPreemptiveType()
    );
    return true;
  }

  /**
   * ターン開始
   * @param kind
   */
  private _fightProcess(kind: EFightKind, preemptive = EUnitTurnType.Normal) {
    // 状態ウィンドウとメッセージウィンドウを作成
    this._makeFightWindows();
    this._setFightTextSetting();

    if (this._checkEscape(kind, preemptive)) {
      return false;
    }
    this._startAction(preemptive);

    return false;
  }

  /**
   * 戦闘テキスト設定をする
   */
  private _setFightTextSetting() {
    // メッセージスピード設定
    this.pushTextSetting(this._getAutoWaitMode());
    this._pushSpeedSetting();
  }

  /**
   * 逃走確認
   * @param kind
   * @returns
   */
  private _checkEscape(kind: EFightKind, preemptive: EUnitTurnType) {
    if (kind !== EFightKind.Escape) {
      return false;
    }
    this.pushEscape(preemptive);
    return true;
  }

  /**
   * 戦い時のウィンドウを作成
   */
  private _makeFightWindows() {
    // 最初にすべてのメニューを終了する
    gameMenus.endAll();
    this._setMenu(this.bstId, []);
    this._setTextMenu([null, EMessageOption.Mode, EMessageMode.MidstBattle]);
  }

  /**
   * 戦闘結果ウィンドウを作成
   */
  private _makeResultWindows() {
    gameMenus.endAll();
    this._setMenu(this.bstId, []);
    this._setTextMenu([null, EMessageOption.Mode, EMessageMode.BattleResult]);
  }

  /**
   * 行動を開始する
   * turnStartActionsで行動が設定されるので
   * 行動に関する処理はこの後にする必要がある
   */
  private _startAction(preemptive: EUnitTurnType) {
    gameBattleTemp.setFirstTurnType(preemptive);
    // 味方と敵の行動を作成し、素早さの順に並び替えて
    // ターン効果を適用
    this._makeActions(preemptive);
    this._turnStartActions(this._actions);
    this._sortActionOrder();
    // 行動があればプロセスを作成
    this.pushActionNext();
  }

  /**
   * 行動を作成する
   */
  private _makeActions(preemptive: EUnitTurnType) {
    if (gameParty.Actionable(preemptive)) {
      this._actions = gameParty.makeActions();
    } else if (preemptive === EUnitTurnType.TroopStopEscape) {
      this._actions.push(...gameParty.makeStopEscapeActions());
    }

    if (gameTroop.Actionable(preemptive)) {
      this._addTroopActions(preemptive);
    }
  }

  /**
   * 敵行動の追加
   */
  private _addTroopActions(preemptive: EUnitTurnType) {
    // 敵
    gameTroop.makeActionTimes();
    const enemyActions = gameTroop.makeActions(
      preemptive !== EUnitTurnType.Normal
    );
    this._actions.push(...enemyActions);
  }

  /**
   * 行動順序の並び替え
   */
  private _sortActionOrder() {
    for (const action of this._actions) {
      action.makeSpeed();
    }
    this._actions.sort((a, b) => b.getActionSpeed() - a.getActionSpeed());
  }

  /**
   * ターン開始
   */
  private _turnStartActions(actions: GameBattleAction[]) {
    gameBattleTemp.increaseTurn();
    for (const action of actions) {
      action.turnStart();
    }
  }

  /**
   * 逃げる処理
   * @returns
   */
  private _escapeProcess(preemptive: EUnitTurnType) {
    this.pushAnimation(system.animationIds['partyEscape'], []);
    this.pushSetActorName(gameParty.getUnitCallName());
    const text = GameUtils.getSystemMessage('escapeStart');
    if (this._escapeCase(preemptive)) {
      this.pushTextSetting(this._getNoWaitMode());
      this.pushText(this._getRefreshOption(text));
      this._escapeSuccess();
    } else {
      this.pushText(this._getRefreshOption(text));
      this._escapeFailed();
    }

    return false;
  }

  /**
   * 逃走判定
   * @returns true:成功
   */
  private _escapeCase(preemptive: EUnitTurnType) {
    // 逃げられない設定の時は必ず失敗
    if (!gameTemp.battleOptions.escape) {
      return false;
    }
    // 敵が行動できない場合は必ず成功
    if (!gameTroop.Actionable(preemptive)) {
      return true;
    }
    const table = gameParty.escapeRate(gameTroop.getLv(), this._escapeTrials);
    this._escapeTrials += 1;
    const roulette = Utils.randomInt(0, table[1]);
    return roulette < table[0];
  }

  /**
   * 逃走成功
   */
  private _escapeSuccess() {
    this.pushWait(system.escapeSuccessWait);
    this._result = 'escape';
    this.pushClose();
  }

  /**
   * 逃走失敗
   */
  private _escapeFailed() {
    const text = GameUtils.getSystemMessage('escapeFailed');
    this.pushText(this._getRefreshOption(text));
    this._startAction(EUnitTurnType.TroopStopEscape);
  }

  /**
   * 行動処理
   */
  private _actionProcess() {
    const result = this._currentAction?.next();
    if (typeof result === 'string') {
      this.pushActionNext();
    } else if (result) {
      this._expandActionResult(result);
    }
    return true;
  }

  /**
   * 行動結果展開
   * @param result
   */
  private _expandActionResult(result: ActionResult) {
    this._setActionResult(result);
    this.pushAction();
  }

  /**
   * 戦闘結果を設定する
   * @param result
   */
  private _setActionResult(result: ActionResult) {
    if (result.textOption !== EActionResultText.NONE) {
      this._setActionRelatedName(result.targets);
    }
    const commands = Array<BpCommand | undefined>();
    commands.push(this._createFluctuateResult(result));
    commands.push(
      this._createAnimationResult(result.animationId, result.targets)
    );
    commands.push(this._createTextActionResult(result.textOption, result.text));
    commands.push(
      this._createTextSettingActionResult(result.textSettingOption)
    );
    const enableCommand = commands.filter((command) => command !== undefined);
    if (enableCommand.length > 0) {
      this.pushComposite(enableCommand as BpCommand[]);
    }
    this._setExtraActionResult(result);
    this._setScriptActionResult(result);
  }

  /**
   * 行動結果によりデータ値が変更する可能性のある場合はウィンドウの更新をかける
   * @param result
   */
  private _createFluctuateResult(result: ActionResult) {
    if (
      !result.scriptId &&
      result.targets.length === 0 &&
      result.extra !== EActionResultExtra.Fluctuate &&
      (result.text == null || result.textOption === EActionResultText.NONE) &&
      !result.animationId
    ) {
      // 不要な場合
      return;
    }
    return this._createFluctuateCommand();
  }

  /**
   * 行動結果のアニメーションを設定する
   * @param animationId
   * @param targets
   */
  private _createAnimationResult(animationId: number, targets: GameBattler[]) {
    if (animationId) {
      return { code: 'animation', params: [animationId, targets] };
    }
    return;
  }

  /**
   * 行動結果のテキストを設定する
   * @param option
   * @param text
   */
  private _createTextActionResult(option: EActionResultText, text: string) {
    if (text == null) {
      // テキストが設定されていない場合は出さない
      return;
    }
    let textParams;
    switch (option) {
      case EActionResultText.REFRESH:
        textParams = this._getRefreshOption(text);
        break;
      case EActionResultText.PLUS:
        textParams = this._getPlusOption(text);
        break;
      case EActionResultText.BASELINE:
        textParams = this._getBaseLineOption(text);
        break;
      default:
        return;
    }
    return { code: 'text', params: [textParams] };
  }

  /**
   * 行動結果のテキスト設定を設定する
   * @param option
   */
  private _createTextSettingActionResult(option: EActionResultTextSetting) {
    let textParams;
    switch (option) {
      case EActionResultTextSetting.PushBaseline:
        textParams = [null, EMessageOption.PushBaseLine];
        break;
      case EActionResultTextSetting.PopBaseline:
        textParams = [null, EMessageOption.PopBaseLine];
        break;
      case EActionResultTextSetting.ResetLine:
        textParams = [null, EMessageOption.ResetLine];
        break;
      default:
        return;
    }
    return { code: 'textSetting', params: [textParams] };
  }

  /**
   * 追加結果を設定する
   * @param result
   * @returns
   */
  private _setExtraActionResult(result: ActionResult) {
    switch (result.extra) {
      case EActionResultExtra.ImmediateAction:
        this._setImmediateActionResult(result.targets);
        break;
      case EActionResultExtra.ExitProcess:
        this._currentAction?.reserveExitProcess();
        break;
      case EActionResultExtra.ForceAction:
        this._setForceActionResult(result.targets);
        break;
    }
  }

  /**
   * 参戦後即時行動を設定する
   * @param targets
   */
  private _setImmediateActionResult(targets: GameBattler[]) {
    // ここで設定
    const actions = targets.flatMap((enemy) => {
      const action = new GameBattleAction(enemy);
      action.make();
      return [action];
    });
    this._turnStartActions(actions);
    this._interruptActions.push(...actions);
  }

  /**
   * 強制行動を設定する
   * @param targets
   * @returns
   */
  private _setForceActionResult(targets: GameBattler[]) {
    if (targets.length === 0) {
      return;
    }
    const actor = targets[0];
    const skillId = actor.forceSkillId;
    if (!skillId) {
      return;
    }
    const target = targets[1];
    const targetIndex = target?.index ?? -1;
    const targetGroup = target?.groupId ?? -1;
    const options: ActionCommandOptions = {
      kind: EActionKind.Skill,
      itemIndex: actor.forceSkillId,
      targetIndex,
      targetGroup,
    };
    const action = new GameBattleAction(actor);
    action.makeForce(options);
    action.setSelectedAction();
    this._interruptActions.push(action);
    // 未行動がある場合は行動した分を削除
    const n = this._actions.findIndex((action) => action.actor === actor);
    if (n >= 0) {
      this._actions.splice(n, 1);
    }
  }

  /**
   * 行動結果スクリプトを設定する
   * @param result
   */
  private _setScriptActionResult(result: ActionResult) {
    if (!result.scriptId) {
      return;
    }
    // 行動者Idを入れる
    // 対象者Idがあれば入れる
    gameTemp.setActionActorId(this._currentAction?.actor.id ?? -1);
    gameTemp.setActionTargetId(
      result.targets.length > 0 ? result.targets[0].id : -1
    );
    this.push(this._createScriptCommand(result.scriptId));
  }

  /**
   * 行動関連者の名前を設定する
   * @param targets
   */
  private _setActionRelatedName(targets: GameBattler[]) {
    this.pushSetActorName(this._currentAction?.actorName ?? '');
    this.pushSetTargetName(GameUnit.toCallName(targets));
  }

  /**
   * 行動終了プロセス
   */
  private _actionNextProcess() {
    if (this._judgeEnd()) {
      return true;
    }
    // 次に行く前にイベント条件を確認する
    if (this._checkEvent()) {
      // イベント後自分に戻ってくるように設定する
      this.pushActionNext();
      return true;
    }
    this._setNextAction();

    return true;
  }

  /**
   * 戦闘イベントを確認する
   * @returns
   */
  private _checkEvent() {
    if (!gameTroop.eventId) {
      return false;
    }
    const eventIds = GameNumberList.get(gameTroop.eventId);
    for (let i = 0; i < eventIds.length; i++) {
      if (this._eventFlags[i]) {
        continue;
      }
      const event = system.battleEvents[eventIds[i]];
      if (!this._meetConditions(event.conditionIds)) {
        continue;
      }
      if (event.span <= EBattleEventSpan.Turn) {
        this._eventFlags[i] = true;
      }
      this.push(this._createScriptCommand(event.scriptId));

      return true;
    }
    return false;
  }

  /**
   * イベント発生条件をすべて満たすかどうか
   * @param conditionIds
   * @returns
   */
  private _meetConditions(conditionIds: number[]) {
    if (conditionIds.length === 0) {
      return false;
    }
    for (const id of conditionIds) {
      if (!this._meetCondition(system.battleConditions[id])) {
        return false;
      }
    }
    return true;
  }

  /**
   * イベント発生条件をすべて満たすかどうか
   * @param condition
   * @returns
   */
  private _meetCondition(condition: BattleCondition) {
    switch (condition.type) {
      case EBattleConditionType.Turn:
        return gameBattleTemp.meetTurnCondition(condition);
      case EBattleConditionType.TroopConsume:
        return gameTroop.consumeCondition(condition);
      case EBattleConditionType.PartyConsume:
        return gameParty.consumeCondition(condition);
      case EBattleConditionType.Enemy:
        return gameTroop.battlerCondition(condition);
      case EBattleConditionType.Member:
        return gameParty.battlerCondition(condition);
      case EBattleConditionType.TurnEnd:
        return this._checkTurnEnd();
      default:
        return false;
    }
  }

  /**
   * イベントフラグをリセットする
   * @returns
   */
  private _resetEventFlags() {
    if (!gameTroop.eventId) {
      return;
    }
    const length = GameNumberList.get(gameTroop.eventId).length;
    this._eventFlags = Array.from({ length }).map(() => false);
  }

  /**
   * イベントフラグのターンをリセットする
   * @returns
   */
  private _resetTurnEventFlags() {
    if (!gameTroop.eventId) {
      return;
    }
    const eventIds = GameNumberList.get(gameTroop.eventId);
    for (let i = 0; i < eventIds.length; i++) {
      if (this._eventFlags[i]) {
        const event = system.battleEvents[eventIds[i]];
        if (event.span === EBattleEventSpan.Turn) {
          this._eventFlags[i] = false;
        }
      }
    }
  }

  /**
   * 戦闘が終了したか判定
   * @returns true:終了した false:終了していない
   */
  private _judgeEnd() {
    if (!this._checkParty()) {
      // 全滅
      return true;
    }
    if (!this._checkTroop()) {
      // 勝利
      return true;
    }
    return false;
  }

  /**
   * ターン終了か確認する
   * @returns
   */
  private _checkTurnEnd() {
    if (this._currentAction === null || this._currentAction.end) {
      // 行動未設定か行動終了の場合
      return !this._actions.some((action) => action.valid);
    } else {
      return false;
    }
  }

  /**
   * 次の行動を設定する
   */
  private _setNextAction() {
    if (this._currentAction === null || this._currentAction.end) {
      // 行動未設定か行動終了の場合
      this._addNextAction();
    } else {
      this._currentAction.turnStart();
      this._currentAction.start();
      this.pushAction();
    }
  }

  /**
   * パーティーを確認する
   * @returns
   */
  private _checkParty() {
    if (gameParty.existContinueFighting()) {
      return true;
    } else {
      this.pushDefeat();
      return false;
    }
  }

  /**
   * 敵の群れを確認する
   * @returns
   */
  private _checkTroop() {
    if (gameTroop.existContinueFighting()) {
      return true;
    } else {
      // 敵を全滅させた
      this._defeated();
      this._setVictory();
      return false;
    }
  }

  /**
   * 戦闘処理設定
   */
  private _setVictory() {
    this._makeResultWindows();
    // 勝利方法でメッセージを分ける
    const defeat = gameTroop.checkDefeat();
    const name = defeat ? 'victory' : 'disappear';
    const text = GameUtils.getSystemMessage(name);
    this.pushSetActorName(gameTroop.getUnitCallName());
    gameParty.battleEnd();
    const commands: BpCommand[] = [];
    commands.push(this._createMePlayCommand(system.musicIds['victory'], 0));
    commands.push(this._createTextSettingCommand(this._getNoWaitMode()));
    commands.push(this._createTextSettingCommand(this._getHoistBaseLine(0)));
    commands.push(this._createTextCommand(this._getRefreshOption(text)));
    commands.push(this._createFluctuateCommand());
    this.pushComposite(commands);
    this.pushWin();
  }

  /**
   * 次の行動を取り出し行動を開始する
   */
  private _addNextAction() {
    const action = this._getNextAction();
    if (action) {
      this._currentAction = action;
      this._currentAction.start();
      this.pushAction();
    } else {
      this._resetTurnEventFlags();
      this._setEndTurnBattler();
      this._addNextTurnEnd();
    }
  }

  /**
   * 次の行動を取得する
   * @returns
   */
  private _getNextAction() {
    const action = this._retrieveAction(this._interruptActions);
    if (action) {
      return action;
    }
    return this._retrieveAction(this._actions);
  }

  /**
   * 行動を取り出す
   * @param actions
   * @returns
   */
  private _retrieveAction(actions: GameBattleAction[]) {
    if (actions.length === 0) {
      return;
    }
    // 生きているアクションを探す
    const index = actions.findIndex((action) => action.valid);
    if (index < 0) {
      // 見つからなかったので全削除
      actions.length = 0;
      return;
    }
    const action = actions[index];
    // indexまでの要素を削除
    actions.splice(0, index + 1);
    return action;
  }

  /**
   * 敵を倒した
   */
  private _defeated() {
    gameTroop.fightEnd();
  }

  /**
   * ターン終了戦闘者を設定する
   */
  private _setEndTurnBattler() {
    this._battlers = [...gameParty.members, ...gameTroop.liveEnemies];
  }

  /**
   * ターン終了処理
   * @returns
   */
  private _turnEndProcess() {
    const result = this._currentTunEnd?.next();
    if (typeof result === 'string') {
      this._addNextTurnEnd();
    } else if (result) {
      this._expandTurnEndResult(result);
    }

    return true;
  }

  /**
   * 次のターン終了コマンドを追加する
   */
  private _addNextTurnEnd() {
    const battler = this._battlers.shift();
    if (battler) {
      this._currentTunEnd = new GameActionTurnEnd(battler);
      this.pushTurnEnd();
    } else {
      if (!this._judgeEnd()) {
        // 戦闘終了でなければコマンド前処理へ
        this.pushFightEnd();
      }
    }
  }

  /**
   * ターン終了結果展開
   * @param result
   */
  private _expandTurnEndResult(result: ActionResult) {
    this._setActionResult(result);
    this.pushTurnEnd();
  }

  /**
   * コマンド前処理
   */
  private _fightEndProcess() {
    gameParty.turnEnd();
    gameTroop.turnEnd();
    this.pushCommand();
    return false;
  }

  /**
   * 短音楽演奏処理
   * @param id
   * @returns
   */
  private _mePlayProcess(id: number, resume: number): boolean {
    this._playing = true;
    GameMusic.interrupt(
      id,
      () => (this._playing = false),
      resume ? false : true
    );
    return true;
  }

  /**
   * 勝利
   * @returns
   */
  private _winProcess(): boolean {
    this._result = 'victory';
    GameMusic.releaseStacked();
    GameMusic.resume();
    const exp = Math.floor(gameBattleTemp.exp * system.correctExp);
    this.pushExp(exp);
    return true;
  }

  /**
   * 経験値取得表示
   * @param exp
   */
  private _expProcess(exp: number): boolean {
    if (exp > 0) {
      exp = GameUtils.limitTenDigit(exp);
      // 経験値取得表示待ち
      this.pushTextSetting(this._getPauseOption());
      GameUtils.setSlotPointValue(exp);
      const text1 = GameUtils.getSystemMessage('each');
      this.pushText(this._getRefreshOption(text1));
      const text2 = GameUtils.getSystemMessage('resultExp');
      this.pushText(this._getPlusOption(text2));
      this._gainExp(exp);
      this.pushLevelUp(0, 0);
    } else {
      this.pushLevelUp(0, 1);
    }

    return true;
  }

  /**
   * 生存メンバーに経験値を加算する
   * @param exp
   */
  private _gainExp(exp: number) {
    const members = gameParty.liveMembers;
    members.forEach((member) => {
      member.gainExp(exp);
    });
  }

  /**
   * レベルアップ処理
   * @param n
   * @param count この関数を実行した回数
   * @returns
   */
  private _levelUpProcess(n: number, count = 0): boolean {
    if (n < gameParty.members.length) {
      this._checkLevelUpMember(n, count);
    } else {
      if (gameBattleTemp.dropItemInfos.length > 0) {
        this.pushItem(0);
      } else {
        const gold = Math.floor(gameBattleTemp.gold * system.correctGold);
        if (gold > 0 && n !== count) {
          this.pushText(this._getPauseOption());
        }
        this.pushGold(gold);
      }
    }
    return true;
  }

  /**
   * レベルアップメンバー確認
   * @param n
   * @param count
   */
  private _checkLevelUpMember(n: number, count: number) {
    const member = gameParty.members[n];
    const up = member.live ? member.checkLevelUp() : false;
    if (up) {
      this.pushTextSetting(this._getPauseOption());
      // ウィンドウに反映されるまで待機にならないのでフレームを飛ばすため待機する必要がある
      this.pushWait(0);
      this._levelUpSettings(n);
      // もういちど同じメンバーで回す
      this.pushLevelUp(n, count + 1);
    } else {
      this.pushLevelUp(n + 1, count + 1);
    }
  }

  /**
   * レベルアップ設定
   * @param n
   */
  private _levelUpSettings(n: number) {
    const member = gameParty.members[n];
    GameUtils.setSlotActorName(member.name);
    const value = member.nextLevelParams();
    member.addLevel(value.level);

    const commands: BpCommand[] = [];
    commands.push(this._createMePlayCommand(system.musicIds['levelUp'], 1));
    const text = GameUtils.getSystemMessage('levelUp');
    commands.push(this._createTextCommand(this._getPlusOption(text)));
    commands.push(this._createFluctuateCommand());
    this.pushComposite(commands);

    for (let i = 0; i < value.params.length; i++) {
      this._paramUp(n, value.params[i], i);
    }
    for (const id of value.skills) {
      this._learnSkill(n, id);
    }

    // サブパラメータは表示しない
    for (let i = 0; i < value.subParams.length; i++) {
      member.gainBaseSubParam(i, value.subParams[i]);
    }
  }

  /**
   * パラメータアップ処理
   * @param n
   * @param param
   * @param index
   */
  private _paramUp(n: number, param: number, index: number) {
    if (param <= 0) {
      return;
    }
    this.pushTextSetting(this._getPauseOption());
    this.push(this._createGainBaseParamCommand(n, param, index));
    if (index === EBaseParamId.MaxHp) {
      // HPの場合だけ色が変わる可能性がある
      this.push(this._createFluctuateCommand());
    }
    this.pushSetSlot('param', GameUtils.statusWord(index));
    this.pushSetSlot('point', param);
    const text = GameUtils.getParamUpMessage(index);
    this.pushText(this._getPlusOption(text));
  }

  /**
   * 基本パラメータ増減プロセス
   * @param n
   * @param param
   * @param index
   */
  private _gainBaseParamProcess(n: number, param: number, index: number) {
    gameParty.members[n].gainBaseParam(index, param);
  }

  /**
   * スキル習得処理
   * 存在しないスキルを指定した場合は習得はするが
   * メッセージは出さない
   * @param member
   * @param id
   */
  private _learnSkill(n: number, id: number) {
    gameParty.members[n].learnSkill(id);
    const skill = skills[id];
    if (!skill) {
      return;
    }
    const messageId = system.learnMessageIds[skill.category];
    if (!messageId) {
      return;
    }
    this.pushTextSetting(this._getPauseOption());
    this.pushSetSlot('item', skill.name);
    this.pushSetSlot('param', GameUtils.skillCategoryWord(skill.category));
    const text = system.messages[messageId];
    this.pushText(this._getPlusOption(text));
  }

  /**
   * 道具入手処理
   * @param n
   * @returns
   */
  private _itemProcess(n: number): boolean {
    const dropItems = gameBattleTemp.dropItemInfos;
    if (n < dropItems.length) {
      this._gainItem(dropItems[n]);
      this.pushItem(n + 1);
    } else {
      this.pushGold(Math.floor(gameBattleTemp.gold * system.correctGold));
    }
    return true;
  }

  /**
   * 道具を取得する
   * @param itemInfo
   */
  private _gainItem(itemInfo: { enemyId: number; itemId: number }) {
    this.pushTextSetting(this._getPauseOption());
    GameUtils.setSlotItemName(items[itemInfo.itemId].name);
    GameUtils.setSlotTargetName(enemies[itemInfo.enemyId].name);
    this.pushText(this._getPlusOptionSystemMessage('dropItem'));
    const member = gameParty.getItemSpaceMember();
    this.pushTextSetting(this._getPauseOption());
    if (member) {
      GameUtils.setSlotActorName(member.name);
      member.pushItem(itemInfo.itemId);
      this.pushText(this._getPlusOptionSystemMessage('gainItem'));
    } else {
      this._noItemSpace();
      this.pushRetryItem(itemInfo.itemId);
    }
  }

  /**
   * 道具入手の空きがない場合の処理
   */
  private _noItemSpace() {
    this.push(
      this._createScriptCommand(GameUtils.getCommonScriptId('retryItem'))
    );
  }

  /**
   * 道具入手再処理
   * @param itemId
   */
  private _retryItemProcess(itemId: number) {
    const member = gameParty.getItemSpaceMember();
    if (member) {
      GameUtils.setSlotActorName(member.name);
      member.pushItem(itemId);
      this.pushText(this._getPlusOptionSystemMessage('exchangeItem'));
    } else {
      GameUtils.setSlotActorName(gameParty.getLeaderName());
      this.pushText(this._getPlusOptionSystemMessage('leaveItem'));
    }
  }

  /**
   * ゴールド取得処理
   * @param gold
   */
  private _goldProcess(gold: number): boolean {
    if (gold > 0) {
      gold = GameUtils.limitTenDigit(gold);
      gameParty.gainGold(gold);
      GameUtils.setSlotPointValue(gold);
      this.pushText(this._getPlusOptionSystemMessage('resultGold'));
    }
    this.pushInputWait();
    this.pushClose();

    return true;
  }

  /**
   * 全滅した
   * @returns
   */
  private _defeatProcess(): boolean {
    this._result = 'defeat';
    this._makeResultWindows();
    GameMusic.releaseStacked();
    GameMusic.playSystemMusic('defeat');

    const text = GameUtils.getSystemMessage('defeat');
    this.pushTextSetting(this._getNoWaitMode());
    this.pushSetActorName(gameParty.getUnitCallNameCanSolo());
    this.pushText(this._getRefreshOption(text));
    this.pushInputWait();
    this.pushClose();
    return true;
  }

  /**
   * 新規メッセージ設定項目を取得
   * @param text
   * @returns
   */
  private _getRefreshOption(text: string) {
    return [text, EMessageOption.Refresh];
  }

  /**
   * 追加メッセージ設定項目を取得
   * @param text
   * @returns
   */
  private _getPlusOption(text: string) {
    return [text, EMessageOption.Plus];
  }

  /**
   * 追加メッセージ設定項目をシステムメッセージから取得
   * @param text
   * @returns
   */
  private _getPlusOptionSystemMessage(text: string) {
    return this._getPlusOption(GameUtils.getSystemMessage(text));
  }

  /**
   * 基準行オプションを取得する
   * @param text
   * @returns
   */
  private _getBaseLineOption(text: string) {
    return [text, EMessageOption.BaseLine];
  }

  /**
   * 待機オプションを取得する
   * @param speed
   */
  private _getWaitOption(speed: number) {
    return [null, EMessageOption.WaitCount, speed];
  }

  /**
   * 速度オプションを取得する
   * @param speed
   * @returns
   */
  private _getSpeedOption(speed: number) {
    return [null, EMessageOption.Speed, speed];
  }

  /**
   * ポーズオプションを取得する
   * @returns
   */
  private _getPauseOption() {
    return [null, EMessageOption.Pause];
  }

  /**
   * 自動待機オプションを取得する
   * @returns
   */
  private _getAutoWaitMode() {
    return [null, EMessageOption.AutoWaitMode];
  }

  /**
   * 待機なしオプションを取得する
   * @returns
   */
  private _getNoWaitMode() {
    return [null, EMessageOption.NoWaitMode];
  }

  /**
   * ベースライン巻き上げオプションを取得する
   * @param value
   * @returns
   */
  private _getHoistBaseLine(value: number) {
    return [null, EMessageOption.HoistBaseLine, value];
  }

  /**
   * 待機処理
   * @param count
   * @returns
   */
  private _waitProcess(count: number) {
    this._waitCount = count;
    return false;
  }

  /**
   * 入力待ち開始処理
   * @returns
   */
  private _inputWaitProcess() {
    this.setInputWait();
    return false;
  }

  /**
   * ウィンドウを閉じる処理
   * @param id
   * @returns
   */
  private _closeProcess(id: number) {
    if (!id) {
      gameMenus.endAll();
    } else {
      this._closeMenu(id);
    }
    return true;
  }

  /**
   * 終了するウィンドウを設定する
   * @param id
   */
  private _closeMenu(id: number) {
    gameMenus.pushEndMenuId(id);
  }

  /**
   * テキスト処理
   * @param params
   * @returns
   */
  private _textProcess(params) {
    this._setTextMenu(params);
    return true;
  }

  /**
   * テキスト設定処理
   * @param params
   */
  private _textSettingProcess(params) {
    this._setTextSettingMenu(params);
    return true;
  }

  /**
   * テキスト設定
   * この処理を入れるとウェイトになる
   * @param params
   */
  private _setTextMenu(params) {
    this._setMenu(this.bmwId, params, undefined, true);
  }

  /**
   * テキスト処理設定
   * @param params
   */
  private _setTextSettingMenu(params) {
    this._setMenu(this.bmwId, params, undefined, false);
  }

  /**
   * メニュー設定
   * @param id
   * @param params
   */
  private _setMenu(id: number, params, fn?, waiting = true) {
    gameMenus.pushStartMenuInfo(id, params, fn, waiting);
  }

  /**
   * 変化する可能性のあるウィンドウに更新をかける
   * @returns
   */
  private _fluctuateProcess() {
    gameMenus.fluctuateOn();
    return true;
  }

  /**
   * アニメーション設定
   * スクリーンと対象にアニメーションを設定する
   * @param id
   * @param targets
   */
  private _animationProcess(id: number, targets: GameBattler[]) {
    // 味方はウィンドウに変換する
    const animationTargets = targets.map((target) => target.animationTarget);
    gameAnimations.push(id, animationTargets);
    return true;
  }

  /**
   * スロット設定処理
   * @param name
   * @param value
   */
  private _setSlotProcess(name: string, value): boolean {
    setSystemSlot(name, value);
    return true;
  }

  /**
   * 行動者名設定処理
   * @param name
   * @returns
   */
  private _setActorNameProcess(name: string): boolean {
    GameUtils.setSlotActorName(name);
    return true;
  }

  /**
   * 対象者名設定処理
   * @param name
   * @returns
   */
  private _setTargetNameProcess(name: string): boolean {
    GameUtils.setSlotTargetName(name);
    return true;
  }

  /**
   * スクリプト実行処理
   * @param id
   */
  private _scriptProcess(id: number) {
    const event = commonScriptset[id];
    if (event === undefined) {
      throw new Error(EErrorMessage.OutrangeScript);
    }
    gameSystem.battleExecutor.setup(event.list, null);
    return true;
  }

  /**
   * 複合処理
   * @param commands
   * @returns
   */
  private _compositeProcess(commands: BpCommand[]): boolean {
    let result = true;
    for (const command of commands) {
      result &&= this._executeBcMethod(command);
    }
    return result;
  }

  /**
   * 戦闘コマンドを実行する
   * @param command
   * @returns
   */
  private _executeBcMethod(command: BpCommand): boolean {
    const methodName = `_${command.code}Process`;
    const result =
      typeof this[methodName] === 'function'
        ? this[methodName](...command.params)
        : true;
    return result;
  }
}
