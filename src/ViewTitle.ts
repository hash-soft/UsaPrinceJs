import { system } from './DataStore';
import { EAnchorType, GamePicture } from './GamePicture';
import { SpriteTitleBack } from './SpritePlane';
import { ViewBase } from './ViewBase';

/**
 * タイトル表示クラス
 */
export class ViewTitle extends ViewBase {
  /**
   * タイトル背景
   */
  private _backSprite: SpriteTitleBack;

  /**
   * 描画オブジェクトを作成
   * 再設定するので再作成前に削除する必要はない
   */
  create() {
    const back = new GamePicture();
    back.showByImageName(system.titleBack, EAnchorType.TopLeft, 0, 0);
    this._backSprite = new SpriteTitleBack(back);
  }

  /**
   * 更新
   */
  update() {
    this._backSprite.update();
    super.update();
  }

  /**
   * 削除
   */
  override remove() {
    super.remove();
    this._backSprite.remove();
  }
}
