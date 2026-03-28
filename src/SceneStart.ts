import {
  gameFlags,
  gameMap,
  gameMapSight,
  gameMarch,
  gameMembers,
  gameMenus,
  gameParty,
  gameScreen,
  gameSystem,
  gameTemp,
  gameVariables,
  mapList,
  setLastSaveData,
  setLastSaveHeader,
  system,
} from './DataStore';
import { SaveObject, SuspendObject } from './DataUtils';
import { GameLog } from './GameLog';
import { TransferInfo } from './GameMapSight';
import { GameUtils, EErrorMessage } from './GameUtils';
import { SceneBase } from './SceneBase';
import Utils from './Utils';
import { ViewStart } from './ViewStart';
import { SpriteWindowset } from './ViewWindow';

/**
 * 開始シーン
 */
export class SceneStart extends SceneBase {
  /**
   * コンストラクタ
   */
  constructor() {
    super();
  }

  /**
   * 作成
   */
  create() {
    gameScreen.clearFade();
    super.launchScene('eventWindow');
    super.changeUpdate();
    gameSystem.mapExecutor.setup(
      GameUtils.getSpecialScript('callStart').list,
      null
    );
    this.setView(new ViewStart());
    this.view?.create();
  }

  /**
   * セーブデータからゲームオブジェクト作成
   * @param data
   */
  private _createGameObjectFromSaveObject(data: SaveObject) {
    gameSystem.load(data.system);
    gameFlags.load(data.flags);
    gameVariables.load(data.variables);
    gameMembers.load(data.members);
    gameParty.load(data.party);
    gameMap.load(data.map);
    gameTemp.resetSlots();

    SpriteWindowset.getInstance().setup(gameMenus.windows);
  }

  /**
   * 中断データからゲームオブジェクト作成
   * @param data
   */
  private _createGameObjectFromSuspendObject(data: SuspendObject) {
    Utils.loadSuspend(data.utils);
    gameSystem.loadSuspend(data.system);
    gameTemp.loadSuspend(data.temp);
    gameMembers.loadSuspend(data.members);
    gameParty.loadSuspend(data.party);
    gameMarch.loadSuspend(data.march);
    gameMap.loadSuspend(data.map);
    gameFlags.loadSuspend(data.flags);
    gameVariables.loadSuspend(data.variables);
  }

  /**
   * 更新
   */
  update() {
    gameSystem.updateMapExecutor();
    if (!gameSystem.runningMapExecutor()) {
      this._checkTitleResult();
    }
  }

  /**
   * 終了したらスクリプターを再起動する
   * ただし、日記番号がはいっていたら
   * 読み込んでマップに遷移する
   * @returns
   */
  private _checkTitleResult() {
    if (gameTemp.diaryId === 0) {
      gameSystem.mapExecutor.setup(
        GameUtils.getSpecialScript('callStart').list,
        null
      );
      return;
    }
    if (gameTemp.resume) {
      this._resumeGame(gameTemp.diaryId);
    } else {
      this._loadGame(gameTemp.diaryId);
    }
  }

  /**
   * 日記から
   */
  private _loadGame(diaryId: number) {
    this._loadSaveHeader(diaryId).then(
      (data) => {
        try {
          const dataObj: SaveObject = JSON.parse(data);
          setLastSaveData(data);
          this._createGameObjectFromSaveObject(dataObj);
          // 開始前にゲームカウントをリセット
          this._resetGameCount(diaryId);
          gameScreen.setFadeOutDuration(gameSystem.fadeOutSpeed, false, () => {
            this._startMapScene(dataObj);
          });
        } catch (e) {
          GameLog.error(e);
          Utils.pushError(new Error(EErrorMessage.ParseFailed));
        }
      },
      () => {
        Utils.pushError(new Error(EErrorMessage.LoadFailed));
      }
    );
    super.changeWait();
  }

  /**
   * ゲームに関するカウントをリセットする
   * ・乱数
   * ・開始時のカウント
   * ・フレームカウント
   */
  private _resetGameCount(diaryId: number) {
    const extra = gameTemp.diaryList[diaryId - 1].header;
    if (system.plantSeed) {
      // 現在のフレームカウントで種まき
      Utils.seed();
    }
    // 開始時のカウントにヘッダのカウントを入れる
    Utils.setStartPlayCount(extra?.count ?? 0);
    // フレームカウントを0にする
    Utils.resetFrameCount();
  }

  /**
   * マップシーン開始
   */
  private _startMapScene(saveInfo?: SaveObject) {
    const base = {
      move: true,
    };
    const getData = (): TransferInfo => {
      if (saveInfo?.map.mapId) {
        return {
          ...base,
          mapId: saveInfo.map.mapId,
          ...saveInfo.march,
        };
      } else {
        return {
          ...base,
          mapId: system.startMapId,
          x: system.startX,
          y: system.startY,
          direction: system.startDirection,
        };
      }
    };
    gameMapSight.start(getData());
    super.changeScene('map');
  }

  /**
   * 続きから
   */
  private _resumeGame(diaryId: number) {
    this._loadSaveHeader(diaryId)
      .then(
        (data) => {
          try {
            // json形式のチェックをしてるだけなので結果は不要
            JSON.parse(data);
            setLastSaveData(data);
            return GameUtils.loadSuspendFile(diaryId, false);
          } catch (e) {
            GameLog.error(e);
            Utils.pushError(new Error(EErrorMessage.ParseFailed));
            return '';
          }
        },
        () => {
          Utils.pushError(new Error(EErrorMessage.LoadFailed));
          return '';
        }
      )
      .then(
        (data) => {
          if (data) {
            return Promise.resolve(data);
          } else {
            return GameUtils.loadSuspendFile(diaryId, true);
          }
        },
        () => {
          return GameUtils.loadSuspendFile(diaryId, true);
        }
      )
      .then(
        (data) => {
          try {
            const dataObj: SuspendObject = JSON.parse(data);
            return Promise.all([
              dataObj,
              gameMap.loadMapData(mapList[dataObj.map.mapId]),
            ]);
          } catch (e) {
            GameLog.error(e);
            return Promise.reject();
          }
        },
        () => {
          Utils.pushError(new Error(EErrorMessage.LoadFailed));
          return Promise.reject();
        }
      )
      .then((values) => {
        try {
          this._createGameObjectFromSuspendObject(values[0]);
          return GameUtils.eraseSuspendFile(diaryId);
        } catch (e) {
          GameLog.error(e);
          Utils.pushError(e as Error);
        }
      })
      .then(
        () => {
          gameScreen.setFadeOutDuration(gameSystem.fadeOutSpeed, false, () => {
            this._resumeMapScene();
          });
        },
        () => {
          Utils.pushError(new Error(EErrorMessage.RemoveFailed));
        }
      );
    super.changeWait();
  }

  /**
   * セーブヘッダを読み込む
   * セーブ、中断データを読み込む前にセーブヘッダを読み込み保持しておく
   * ファイル紛失チェックも兼ねている
   * @param diaryId
   * @returns
   */
  private _loadSaveHeader(diaryId: number) {
    return GameUtils.loadSaveHeader(diaryId).then(
      (data) => {
        if (data) {
          setLastSaveHeader(data);
          return GameUtils.loadSaveFile(diaryId);
        }
        GameLog.error('Invalid Header', diaryId);
        Utils.pushError(new Error(EErrorMessage.LoadFailed));
        return '';
      },
      () => {
        GameLog.error('Failed Header Load', diaryId);
        Utils.pushError(new Error(EErrorMessage.LoadFailed));
        return '';
      }
    );
  }

  /**
   * マップシーン再開
   */
  private _resumeMapScene() {
    gameMapSight.setup();
    gameMapSight.playMusic();
    super.changeScene('map');
  }
}
