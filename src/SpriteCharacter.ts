import * as PIXI from 'pixi.js';
import { GameCharacter } from './GameCharacter';
import { GameMaterial } from './GameMaterial';
import { SpriteTexture } from './SpritePlane';

/**
 * キャラクタースプライト
 */
export class SpriteCharacter extends SpriteTexture {
  /**
   * キャラセットId
   * 0の場合はタイルセット
   */
  private _charasetId: number = 0;
  /**
   * キャラクター名またはタイルセット名
   */
  private _characterName: string = '';
  /**
   * キャラクターインデックまたはタイルインデックス
   */
  private _characterIndex: number = 0;

  /**
   * コンストラクタ
   * @param _character キャラクターオブジェクト
   */
  constructor(private _character: GameCharacter) {
    super();
  }

  /**
   * 歩行画像のベースパス
   */
  protected get _basePath(): string {
    return './assets/charsets/';
  }

  /**
   * 指定の素材がキャラクターオブジェクトと一致しているか
   * @param material
   * @returns
   */
  equalMaterial(material: GameMaterial): boolean {
    return this._character === material;
  }

  /**
   * 更新
   */
  update() {
    super.update();
    this._updatePos();
    this._updateFrame();
    this._updateVisibility();
  }

  /**
   * テクスチャの更新
   */
  protected _updateTexture(): void {
    const character = this._character;
    // キャラグラフィックが変化していなければなにもしない
    if (
      this._charasetId === character.charasetId &&
      this._characterName == character.characterName &&
      this._characterIndex == character.characterIndex
    ) {
      return;
    }

    this._setCharacterTexture();

    this._charasetId = character.charasetId;
    this._characterName = character.characterName;
    this._characterIndex = character.characterIndex;
  }

  /**
   * テクスチャを設定する
   */
  private _setCharacterTexture() {
    const character = this._character;
    if (character.characterName) {
      if (character.charasetId === 0) {
        const url = './assets/tilesets/' + character.characterName;
        this._loadTexture(url);
      } else {
        this._loadTexture(this._getUrl(character.characterName));
      }
    } else {
      this._setEmptyImage();
    }
  }

  /**
   * 位置の更新
   */
  protected _updatePos() {
    const character = this._character;
    const x = character.screenX + character.halfWidthHit;
    const y = character.screenY + 32 - character.characterHeight / 2;
    this.setPos(x, y);
    this.setZIndex(this._baseZIndex);
  }

  /**
   * ベースZ位置
   */
  protected get _baseZIndex() {
    return 2100 + this._character.screenZ;
  }

  /**
   * 歩行画像のテクスチャ範囲を取得する
   */
  protected _getTextureFrame() {
    return new PIXI.Rectangle(
      this._getSrcX(),
      this._getSrcY(),
      this._character.characterWidth,
      this._character.characterHeight
    );
  }

  /**
   * 敵画像の基点を設定する
   */
  protected _setBaseAnchor() {
    // キャラクターは中央
    this._setAnchor(0.5, 0.5);
  }

  /**
   * 描画範囲の更新
   */
  private _updateFrame() {
    this._setFramePoint(this._getSrcX(), this._getSrcY(), true);
  }

  /**
   * 転送元のX軸を取得
   */
  private _getSrcX() {
    const character = this._character;
    const index = this._characterIndex;
    const columns = character.characterColumns;
    const baseX =
      (index % columns) * character.characterPatternMax +
      character.currentCharacterPattern;
    return baseX * character.characterWidth;
  }

  /**
   * 転送元のY軸を取得
   */
  private _getSrcY() {
    const character = this._character;
    const index = this._characterIndex;
    const columns = character.characterColumns;
    const baseY =
      character.charasetId === 0
        ? Math.floor(index / columns)
        : Math.floor(index / columns) * 4 + character.direction;
    return baseY * character.characterHeight;
  }

  /**
   * 表示状態を更新する
   */
  private _updateVisibility() {
    this.setVisible(!this._character.transparent);
  }
}
