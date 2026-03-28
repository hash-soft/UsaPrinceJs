import { Graphics } from './Graphics';
import { GameMusic } from './AudioUtils';
import { SceneBase } from './SceneBase';
import { ViewMap } from './ViewMap';
import {
  gameMap,
  gameMapSight,
  gameParty,
  gameScreen,
  gameSystem,
  gameTemp,
  gameTroop,
} from './DataStore';
import { EUnitTurnType } from './GameUnit';

const enum EPreemptiveType {
  PartyRaid, // 味方から強襲
  PartySurprise, // 味方から不意打ち
  TroopRaid, // 敵から強襲
  TroopSurprise, // 敵から不意打ち
}

/**
 * マップシーンクラス
 */
export class SceneMap extends SceneBase {
  /**
   * コンストラクタ
   * @param data
   */
  constructor() {
    super();
    if (gameMapSight.needTransfer()) {
      gameMap.setCleanupEvent();
      super.changePreload();
    }
    gameMapSight.startTransfer();
  }

  /**
   * 事前ロード
   */
  preload() {
    // ここは別シーンからマップを新規作成したいときに通る
    // 前回のマップを引き継ぐときはここを通らずcreate()にいく
    // create()に行くときはgameMapが作成されている必要がある
    gameMap.updateMount();
    if (gameMap.runningMount()) {
      return;
    }
    gameMap.setup().then(() => {
      this._afterSetup();
      super.changeCreate(true);
    });
    super.changeWait();
  }

  /**
   * 作成
   */
  create() {
    this.setView(new ViewMap());
    super.launchScene('eventWindow');
    super.changeUpdateFrame('startup', true);
  }

  /**
   * 場所移動処理
   */
  transfer() {
    if (gameMap.terminateCurrentMap()) {
      super.changeUpdateFrame('cleanup', true);
    } else {
      gameMapSight.transferMarch();
      this._switchScreen();
    }
  }

  /**
   * 現在のマップ終了時のupdate
   * @returns
   */
  cleanup() {
    gameMap.updateMount();
    if (gameMap.runningMount()) {
      return;
    }

    gameMap.setup().then(() => {
      this._afterSetup();
      super.changeUpdateFrame('startup', true);
    });
    super.changeWait();
  }

  /**
   * マップ設定後の処理
   */
  private _afterSetup() {
    gameMapSight.refresh();
    gameMap.setStartupEvent();
  }

  /**
   * 新しいマップ開始時のupdate
   * @returns
   */
  startup() {
    gameMap.updateMount();
    if (gameMap.runningMount()) {
      return;
    }
    gameMapSight.playMusic();
    gameMapSight.needsRefresh();
    this.view?.create();
    gameMapSight.transferMarch();

    this._switchScreen();
  }

  /**
   * 画面切り替え
   */
  private _switchScreen() {
    // 部屋Idが切り替わっている場合があるので更新が必要
    (this.view as ViewMap).replaceCurrentRoomId();
    if (gameSystem.transferScreenOn === 0) {
      gameScreen.setFadeMax();
      gameScreen.setFadeInDuration(gameSystem.fadeInSpeed, false, () => {
        this._finishSwitchScreen();
      });
      super.changeWait();
    } else {
      gameScreen.clearFade();
      this._finishSwitchScreen();
    }
  }

  /**
   * 画面の切り替え終了
   */
  private _finishSwitchScreen() {
    // メイン処理に入る前にマップスクリプトを実行する
    // プレイヤー、イベントの後に実行したいが
    // 遷移後即座に実行したい場合先行で動かれてしまうため
    // 事前にスクリプトを実行しておく
    if (gameMapSight.rebuild) {
      gameMap.updateScript();
    }
    gameMapSight.endTransfer();
    super.changeUpdate();
  }

  /**
   * 更新
   */
  update() {
    gameMap.update();
    this._updateCurrentStatus();
  }

  /**
   * 現在の状態の更新
   */
  private _updateCurrentStatus() {
    // 部屋移動中
    if (gameTemp.changeRoom) {
      return;
    }

    if (this._checkTransfer()) {
      return;
    }
    if (this._checkBattle()) {
      return;
    }
  }

  /**
   * マップ移動チェック
   */
  private _checkTransfer() {
    if (!gameMapSight.checkTransfer()) {
      return false;
    }
    // マップ移送
    gameMapSight.startTransfer();
    if (gameSystem.transferScreenOff === 0) {
      gameScreen.setFadeOutDuration(gameSystem.fadeOutSpeed, false, () => {
        this.transfer();
      });
      super.changeWait();
    } else {
      // フェードなし
      this.transfer();
    }

    return true;
  }

  /**
   * 戦闘遷移チェック
   */
  private _checkBattle() {
    const troopId = gameMapSight.nextTroopId;
    if (troopId <= 0) {
      return false;
    }

    gameMapSight.setNextTroopId(0);
    gameTroop.setup(troopId);
    this._setBattlePreemptive();
    if (gameMapSight.encounterEffectId > 0 && !gameScreen.duringEffect()) {
      gameScreen.startEffect(gameMapSight.encounterEffectId, () => {
        this._startBattle();
      });
    } else {
      this._startBattle();
    }

    this.changeWait();
    return true;
  }

  /**
   * 先制タイプを設定する
   * @returns
   */
  private _setBattlePreemptive() {
    if (!gameTemp.battleOptions.preemptive) {
      gameTemp.battleOptions.preemptiveType = EUnitTurnType.Normal;
      return;
    }
    if (gameTemp.battleOptions.preemptiveType !== EUnitTurnType.Normal) {
      return;
    }
    const [, , a1 = 0, a2 = 0, a3 = 0, a4 = 0] =
      gameMapSight.getEncounterOption();
    const ids = gameMapSight.getEncounterElements();
    const rateIds1 = gameParty.getEncounterAdjustPreemptiveRates(
      ids,
      EPreemptiveType.PartyRaid
    );
    if (a1 > 0) {
      rateIds1.push(a1);
    }
    const rateIds2 = gameParty.getEncounterAdjustPreemptiveRates(
      ids,
      EPreemptiveType.PartySurprise
    );
    if (a2 > 0) {
      rateIds2.push(a2);
    }
    const preemptive = gameParty.firstAttack(rateIds1, rateIds2);
    if (preemptive !== EUnitTurnType.Normal) {
      gameTemp.battleOptions.preemptiveType = preemptive;
      return;
    }

    const rateIds3 = gameParty.getEncounterAdjustPreemptiveRates(
      ids,
      EPreemptiveType.TroopRaid
    );
    if (a3 > 0) {
      rateIds3.push(a3);
    }
    const rateIds4 = gameParty.getEncounterAdjustPreemptiveRates(
      ids,
      EPreemptiveType.TroopSurprise
    );
    if (a4 > 0) {
      rateIds4.push(a4);
    }
    gameTemp.battleOptions.preemptiveType = gameTroop.firstAttack(
      rateIds3,
      rateIds4
    );
  }

  /**
   * 戦闘開始
   */
  private _startBattle() {
    GameMusic.play(
      gameTemp.battleOptions.bgmId || gameSystem.battleMusicId,
      true,
      true
    );
    this._createBattleExtra();
    super.changeScene('battle');
  }

  /**
   * 戦闘に渡すデータを作成
   */
  private _createBattleExtra() {
    // スナップテクスチャ
    this._takeBattleBackSnap();
  }

  /**
   * 戦闘背景用のスナップをとる
   */
  private _takeBattleBackSnap() {
    // キャラを消す
    (this.view as ViewMap).setVisibleSprite(false);
    Graphics.setBlurStrength(4);
    Graphics.applyBlurFilter();
    Graphics.takeSnap();
    Graphics.removeBlurFilter();
  }
}
