import { Graphics } from './Graphics';
import { GameMaterial } from './GameMaterial';
import { SpriteEnemy } from './SpriteEnemy';
import { SpriteBattleBack, SpriteFixed } from './SpritePlane';
import { ViewBase } from './ViewBase';
import { EffectTarget } from './SpriteEffect';
import { gameTemp, gameTroop, gameMapSight } from './DataStore';
import { EAnchorType, GamePicture } from './GamePicture';
import { EResolve } from './GameConfig';

/**
 * 戦闘シーン表示
 */
export class ViewBattle extends ViewBase {
  /**
   * マップのスナップスプライト
   */
  private _snapSprite!: SpriteFixed;
  /**
   * 戦闘背景スプライト
   */
  private _backSprite!: SpriteBattleBack;
  /**
   * 敵スプライト
   */
  private _enemySprites: SpriteEnemy[] = [];
  /**
   * 戦闘背景
   */
  private _battleBack: GamePicture = new GamePicture();

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
    this._battleBack.showByImageName(
      gameMapSight.battleBackName,
      EAnchorType.TopLeft,
      -(640 - EResolve.Width) / 2,
      32
    );
    const snapPicture = gameTemp.snapPicture;
    const snapTexture = Graphics.getSnapTexture();
    this._snapSprite = new SpriteFixed(snapPicture, snapTexture.baseTexture);
    this._snapSprite.setZIndex(3000);
    this._backSprite = new SpriteBattleBack(this._battleBack);

    this._enemySprites = gameTroop.liveEnemies.map((enemy) => {
      return new SpriteEnemy(enemy);
    });
  }

  /**
   * 更新
   */
  update() {
    this._snapSprite.update();
    this._backSprite.update();
    this._updateEnemy();
    super.update();
  }

  /**
   * 敵の更新
   */
  private _updateEnemy() {
    this._checkAddEnemy();
    this._enemySprites.forEach((sprite) => {
      sprite.update();
    });
  }

  /**
   * 追加の敵を確認してスプライトに設定する
   * @returns
   */
  private _checkAddEnemy() {
    for (;;) {
      const enemy = gameTroop.popAddEnemy();
      if (!enemy) {
        break;
      }
      const enemySprite = this._enemySprites.find((sprite) => sprite.leave);
      if (enemySprite) {
        enemySprite.recycle(enemy);
        continue;
      }
      this._enemySprites.push(new SpriteEnemy(enemy));
    }
  }

  /**
   * スプライトを削除
   * childの登録もここで切る
   */
  override remove() {
    super.remove();
    this._snapSprite.remove();
    this._backSprite.remove();
    this._removeEnemy();
  }

  /**
   * 敵スプライトを削除する
   */
  private _removeEnemy() {
    this._enemySprites.forEach((sprite) => {
      sprite.remove();
    });
  }

  /**
   * 対象スプライトを検索する
   * @param target
   * @returns
   */
  protected override _findTargetSprite(
    target: GameMaterial
  ): undefined | EffectTarget {
    return this._enemySprites.find((enemy) => enemy.equalMaterial(target));
  }
}
