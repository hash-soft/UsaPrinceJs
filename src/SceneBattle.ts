import { GameMusic } from './AudioUtils';
import {
  commonScriptset,
  gameParty,
  gameSystem,
  gameTemp,
  windows,
} from './DataStore';
import { GameBattleProcess } from './GameBattleProcess';
import { GameMenuBase } from './GameMessage';
import { GameUtils, EErrorMessage } from './GameUtils';
import { SceneBase } from './SceneBase';
import { SceneMenuBase } from './SceneMenuBase';
import { ViewBattle } from './ViewBattle';
import { WindowFrame } from './WindowBase';

interface BattleSubExtra {
  endFn: (result: string) => void;
  operation: string;
}

/**
 * 戦闘メインシーン
 * スクリプト以外の処理はサブシーンで実行される
 */
export class SceneBattle extends SceneBase {
  /**
   * 作成
   */
  create() {
    gameTemp.startBattle();

    this.setView(new ViewBattle());
    this.view?.create();
    gameSystem.battleExecutor.setup([], null);
    const extra = { end: () => this._endOpen() };
    super.launchScene('battleOpen', extra);

    super.changeUpdate();
  }

  /**
   * 更新
   */
  update() {
    //
  }

  /**
   * 戦闘終了待機中
   */
  waitEndBattle() {
    gameSystem.updateBattleExecutor();
    this._endBattle();
  }

  /**
   * 戦闘画面遷移終了後に呼ばれる処理
   */
  private _endOpen() {
    super.stopScene('battleOpen');
    this._addSplitFrame();
    this._launchFight('start');
  }

  /**
   * ターン終了後に呼ばれる処理
   * 全員の行動終了、戦闘終了のどちらかがある
   * @param result
   * @returns
   */
  private _endFight(result: string) {
    super.stopScene('battleFight');
    this._endFightProcess(result);
  }

  /**
   * ターン終了処理
   * @param result
   */
  private _endFightProcess(result: string) {
    switch (result) {
      case 'escape':
        this._escapeProcess();
        break;
      default:
        this._blackOut(result);
    }
  }

  /**
   * 逃げる処理
   */
  private _escapeProcess() {
    // 曲戻す
    GameMusic.releaseStacked();
    GameMusic.resume();
    this._blackOut('escape');
  }

  /**
   * 暗転
   * @param result
   */
  private _blackOut(result: string) {
    super._startFadeOut(16, () => {
      this._endBattleCommonScript(result);
      this._changeEndBattle();
    });
  }

  /**
   * 戦闘中起動
   */
  private _launchFight(operation: string) {
    const extra: BattleSubExtra = {
      endFn: (result) => this._endFight(result),
      operation,
    };
    super.launchScene('battleFight', extra);
  }

  /**
   * 戦闘終了時に実行するスクリプトを設定する
   * @param result
   */
  private _endBattleCommonScript(result: string) {
    const id = this._decideEndBattleCommonScriptId(result);
    if (id) {
      this._setCommonScript(id);
    }
  }

  /**
   * 戦闘終了時に実行するスクリプトIdを決定する
   * @param result
   * @returns
   */
  private _decideEndBattleCommonScriptId(result: string) {
    switch (result) {
      case 'victory':
        return gameTemp.battleOptions.winScript;
      case 'defeat':
        return (
          (gameTemp.battleOptions.loseScript ||
            GameUtils.getCommonScriptId('defeat')) ??
          0
        );
      case 'escape':
        return gameTemp.battleOptions.escapeScript;
      default:
        return 0;
    }
  }

  /**
   * スクリプトを設定する
   */
  private _setCommonScript(id: number) {
    const event = commonScriptset[id];
    if (event === undefined) {
      throw new Error(EErrorMessage.OutrangeScript);
    }
    gameSystem.battleExecutor.setup(event.list, null);
  }

  /**
   * 更新処理を戦闘終了に変更する
   */
  private _changeEndBattle() {
    super.changeUpdateFrame('waitEndBattle', true);
  }

  /**
   * 戦闘終了
   */
  private _endBattle() {
    if (gameSystem.battleExecutor.running()) {
      return;
    }
    // 戦闘中効果消去
    gameParty.battleEnd();
    this._deleteSpriteFrame();
    gameTemp.clearInBattle();
    this._changeMap();
  }

  /**
   * マップと背景の区切りウィンドウ
   */
  private _addSplitFrame() {
    const window = windows[151];
    const winClass = GameMenuBase.getWindowClass(window.className);
    const split: WindowFrame = new winClass(window);
    split.setup();
    this.view?.window.setGroundWindow(split);
  }

  /**
   * 区切りウィンドウを除去する
   */
  private _deleteSpriteFrame() {
    this.view?.window.removeGroundWindow();
  }

  /**
   * マップに遷移する
   */
  private _changeMap() {
    super.changeScene('map');
  }
}

/**
 * 戦闘開幕シーンクラス
 */
export class SceneBattleOpen extends SceneBase {
  /**
   * 戦闘画面表示カウント
   */
  private _count: number;
  /**
   * 戦闘終了コールバック
   */
  private _endFn: () => void;

  /**
   * コンストラクタ
   * @param args
   */
  constructor(...args) {
    super(...args);
    this._count = 0;
    this._endFn = this._extra.end;
  }

  /**
   * 作成
   */
  create() {
    const snapPicture = gameTemp.snapPicture;
    snapPicture.createMaskFrame(0, 0, 512, 512);
    super.changeUpdate();
  }

  /**
   * 更新
   */
  update() {
    if (this._count <= 480) {
      const snapPicture = gameTemp.snapPicture;
      snapPicture.createMaskFrame(0, 0, 512, 512 - this._count);
      this._count += 32;
    } else {
      this._endFn();
      super.changeWait();
    }
  }
}

/**
 * 戦闘中シーン
 */
export class SceneBattleFight extends SceneMenuBase {
  /**
   * 戦闘終了コールバック
   */
  private _endFn: (string) => void;
  /**
   * 戦闘処理
   */
  private _process: GameBattleProcess;

  /**
   * コンストラクタ
   * @param args
   */
  constructor(...args) {
    super(...args);
    const extra = this._extra as BattleSubExtra;
    this._endFn = extra.endFn;
    this._process = new GameBattleProcess();
  }

  /**
   * 作成
   */
  create() {
    this._setInitProcess();
    super.create();
  }

  /**
   * 初期処理の設定
   */
  private _setInitProcess() {
    this._process.pushStart();
  }

  /**
   * 更新
   */
  update() {
    this._process.update();
    super.update();
    this._updateScene();
  }

  /**
   * クラス内独自の更新
   * @returns
   */
  private _updateScene() {
    if (this._process.running()) {
      return;
    }
    this._endFn(this._process.result);
    super.changeWait();
  }
}
