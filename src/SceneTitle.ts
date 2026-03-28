import { gameMenus, gameParty, gameScreen, gameSystem } from './DataStore';
import { clearGameObjects } from './DataUtils';
import { GameUtils } from './GameUtils';
import { Input } from './Input';
import { SceneBase } from './SceneBase';
import { ViewTitle } from './ViewTitle';
import { SpriteWindowset } from './ViewWindow';

/**
 * タイトルシーン
 */
export class SceneTitle extends SceneBase {
  /**
   * 作成
   */
  create() {
    this._createGameData();
    super.changeUpdate();
    gameSystem.mapExecutor.setup(
      GameUtils.getSpecialScript('callTitle').list,
      null
    );
    this.setView(new ViewTitle());
    this.view?.create();
  }

  /**
   * ゲームデータを作成する
   */
  private _createGameData() {
    clearGameObjects();
    gameParty.setupStartingMembers();

    const sheet = SpriteWindowset.getInstance();
    sheet.setup(gameMenus.windows);
  }

  /**
   * 更新
   */
  update() {
    if (gameSystem.runningMapExecutor()) {
      gameSystem.updateMapExecutor();
    }
    if (Input.isTriggeredSome()) {
      super.changeUpdateFrame('fadeOutWait', false);
      gameScreen.setFadeOutDuration(gameSystem.fadeOutSpeed * 2, false, () => {
        gameSystem.mapExecutor.setup([], null);
        gameScreen.clearPictures();
        super.changeScene('start');
      });
    }
  }

  /**
   * フェードアウト中
   */
  fadeOutWait() {
    if (gameSystem.runningMapExecutor()) {
      gameSystem.updateMapExecutor();
    }
  }
}
