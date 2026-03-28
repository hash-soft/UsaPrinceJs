import { StateRemoveTiming } from './DataTypes';
import {
  ActionResult,
  EActionResultExtra,
  EActionResultText,
  EActionResultTextSetting,
} from './GameActionUtils';
import { GameBattler } from './GameBattler';
import { GameUtils } from './GameUtils';

/**
 * 行動ジェネレーター補助
 */
export class GameActionGenSupport {
  /**
   * 行動前の状態自動回復ジェネレーター
   * @param target
   */
  static *processAutoRemoveBeforeGen(target: GameBattler) {
    yield* this._processAutoRemoveGen(target, StateRemoveTiming.BeforeAction);
  }

  /**
   * 行動後の状態自動回復ジェネレーター
   * @param target
   */
  static *processAutoRemoveAfterGen(target: GameBattler) {
    yield* this._processAutoRemoveGen(target, StateRemoveTiming.AfterAction);
  }

  /**
   * ターン終了後の状態自動回復ジェネレーター
   * @param target
   */
  static *processAutoRemoveEndGen(target: GameBattler) {
    yield* this._processAutoRemoveGen(target, StateRemoveTiming.EndOfTurn);
  }

  /**
   * 状態自動回復ジェネレーター
   * @param target
   * @param timing
   * @returns
   */
  private static *_processAutoRemoveGen(
    target: GameBattler,
    timing: StateRemoveTiming
  ) {
    const removeStateIds = target.removeStatesAuto(timing);
    if (removeStateIds.length === 0) {
      return;
    }
    yield* this._processAutoRemoveStateMessageGen(target, removeStateIds);
  }

  /**
   * 状態自動回復メッセージジェネレーター
   * @param removeStateIds
   */
  private static *_processAutoRemoveStateMessageGen(
    target: GameBattler,
    removeStateIds: number[]
  ) {
    let message = false;
    for (const stateId of removeStateIds) {
      const state = GameUtils.getState(stateId);
      const recover: number =
        state.messageIds[GameUtils.getRecoverName(target.myself)];
      if (recover) {
        const text = GameUtils.getMessage(recover);
        yield* this.processMessageGen(text, 0, EActionResultText.REFRESH, [
          target,
        ]);
        message = true;
      }
    }
    if (!message) {
      // ステータス表示を変更するために発行
      yield* this.processMessageGen('', 0, EActionResultText.NONE, [target]);
    }
  }

  /**
   * メッセージジェネレーター
   * @param text
   */
  static *processMessageGen(
    text: string,
    animationId = 0,
    textOption = EActionResultText.PLUS,
    targets: GameBattler[] = []
  ) {
    yield GameActionGenSupport.createActionResult(
      text,
      animationId,
      0,
      textOption,
      EActionResultTextSetting.None,
      targets
    );
  }

  /**
   * 行動結果を作成
   * @param text
   * @param animationId
   * @param textOption
   * @param targets
   * @param scriptId
   */
  static createActionResult(
    text = '',
    animationId = 0,
    score = 0,
    textOption = EActionResultText.NONE,
    textSettingOption = EActionResultTextSetting.None,
    targets: GameBattler[] = [],
    scriptId = 0,
    extra = EActionResultExtra.None
  ): ActionResult {
    return {
      text,
      animationId,
      score,
      textOption,
      textSettingOption,
      targets,
      scriptId: scriptId,
      extra,
    };
  }
}

/**
 * ターン終了行動クラス
 */
export class GameActionTurnEnd {
  private _actor: GameBattler;
  /**
   * 処理ジェネレーター
   */
  private _processing: Generator<ActionResult, void, unknown>;

  /**
   * コンストラクタ
   * @param actor
   */
  constructor(actor: GameBattler) {
    this._actor = actor;
    this._processing = this._processGen();
  }

  /**
   * ジェネレーター実行
   * @returns
   */
  next(): ActionResult | 'End' {
    const result = this._processing.next();
    if (result.done) {
      return 'End';
    }
    return result.value;
  }

  /**
   * 状態表示
   */
  private *_processGen(): Generator<ActionResult, void, unknown> {
    yield* GameActionGenSupport.processAutoRemoveEndGen(this._actor);
    this._actor.turnEnd();
  }
}
