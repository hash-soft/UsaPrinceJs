import { system } from './DataStore';
import { EPictureType } from './DataTypes';
import { GameMaterial } from './GameMaterial';
import { Rect } from './GameUtils';

export const enum EAnchorType {
  TopLeft,
  Center,
  BottomLeft,
}

const enum EMoveType {
  Straight,
  ParabolaX,
  ParabolaY,
}

/**
 * ピクチャークラス
 */
export class GamePicture extends GameMaterial {
  /**
   * ピクチャーId
   */
  private _pictureId: number = 0;
  /**
   * 素材名
   */
  private _materialName: string = '';
  /**
   * 端点X
   */
  private _anchorX: number = 0;
  /**
   * 端点Y
   */
  private _anchorY: number = 0;
  /**
   * X座標
   */
  private _x: number = 0;
  /**
   * Y座標
   */
  private _y: number = 0;
  /**
   * 移動開始X座標
   */
  private _startX: number = 0;
  /**
   * 移動開始Y座標
   */
  private _startY: number = 0;
  /**
   * 移動距離X
   */
  private _distanceX: number = 0;
  /**
   * 移動距離Y
   */
  private _distanceY: number = 0;
  /**
   * 移動時間
   */
  private _duration: number = 0;
  /**
   * 全体移動時間
   */
  private _wholeDuration: number = 0;
  /**
   * 移動タイプ
   */
  private _moveType: EMoveType = EMoveType.Straight;
  /**
   * マスク矩形
   */
  private _maskFrame: Rect | null = null;

  get valid() {
    return this._materialName !== '';
  }

  /**
   * ファミリー名を取得する
   */
  get familyName() {
    return system.pictures[this._pictureId]?.familyName ?? '';
  }

  /**
   * ピクチャの種類を取得
   */
  get type() {
    return system.pictures[this._pictureId]?.type;
  }

  /**
   * 画像オプションを取得する
   */
  get imageOption() {
    const picture = system.pictures[this._pictureId];
    if (picture && picture.type === EPictureType.Image) {
      return {
        x: picture.param1,
        y: picture.param2,
        width: picture.param3,
        height: picture.param4,
        scale: picture.param5,
      };
    } else {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        scale: 1,
      };
    }
  }

  /**
   * フォントオプションを取得する
   */
  get fontOption() {
    const picture = system.pictures[this._pictureId];
    if (picture && picture.type === EPictureType.Text) {
      return {
        fontSize: picture.param1,
        fontWeight: picture.param2,
        fill: picture.param3,
        strokeThickness: picture.param4,
        stroke: picture.param5,
      };
    } else {
      return {
        fontSize: 0,
        fontWeight: 0,
        fill: 0,
        strokeThickness: 0,
        stroke: 0,
      };
    }
  }

  /**
   * 色オプションを取得する
   */
  get colorOption() {
    const picture = system.pictures[this._pictureId];
    if (picture && picture.type === EPictureType.Color) {
      return {
        x: picture.param1,
        y: picture.param2,
        width: picture.param3,
        height: picture.param4,
        decimal: picture.param5,
      };
    } else {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        decimal: 16,
      };
    }
  }

  /**
   * 素材名を取得する
   */
  get materialName() {
    return this._materialName;
  }

  /**
   * 端点Xを取得する
   */
  get anchorX() {
    return this._anchorX;
  }

  /**
   * 端点Yを取得する
   */
  get anchorY() {
    return this._anchorY;
  }

  /**
   * X座標を取得する
   */
  get x() {
    return this._x;
  }

  /**
   * Y座標を取得する
   */
  get y() {
    return this._y;
  }

  /**
   * マスク矩形を取得する
   */
  get maskFrame() {
    return this._maskFrame;
  }

  /**
   * マスク矩形を作成する
   * @param x
   * @param y
   * @param width
   * @param height
   */
  createMaskFrame(x: number, y: number, width: number, height: number) {
    this._maskFrame = { x, y, width, height };
  }

  /**
   * マスク矩形を削除する
   */
  removeMaskFrame() {
    this._maskFrame = null;
  }

  /**
   * 表示する
   * @param pictureId
   * @param materialName
   * @param anchorType
   * @param x
   * @param y
   */
  show(
    pictureId: number,
    materialName: string,
    anchorType: EAnchorType,
    x: number,
    y: number
  ) {
    this._pictureId = pictureId;
    this._showBase(materialName, anchorType, x, y);
  }

  /**
   * 移動する
   * @param x
   * @param y
   * @param moveType
   * @param duration
   */
  move(x: number, y: number, moveType: number, duration: number) {
    this._startX = this._x;
    this._startY = this._y;
    this._distanceX = x - this._x;
    this._distanceY = y - this._y;
    this._moveType = moveType;
    this._duration = duration;
    this._wholeDuration = duration;
  }

  /**
   * 画像名を指定して表示する
   * @param materialName
   * @param anchorType
   * @param x
   * @param y
   */
  showByImageName(
    materialName: string,
    anchorType: EAnchorType,
    x: number,
    y: number
  ) {
    this._showBase(materialName, anchorType, x, y);
  }

  /**
   * 表示処理のベース
   * @param materialName
   * @param anchorType
   * @param x
   * @param y
   */
  private _showBase(
    materialName: string,
    anchorType: EAnchorType,
    x: number,
    y: number
  ) {
    this._materialName = materialName;
    this._setAnchor(anchorType);
    this._x = x;
    this._y = y;
  }

  /**
   * 端点を設定する
   * @param anchorType
   */
  private _setAnchor(anchorType: EAnchorType) {
    switch (anchorType) {
      case EAnchorType.Center:
        this._anchorX = 0.5;
        this._anchorY = 0.5;
        break;
      case EAnchorType.BottomLeft:
        this._anchorX = 0;
        this._anchorY = 1;
        break;
      default:
        this._anchorX = 0;
        this._anchorY = 0;
    }
  }

  /**
   * 削除する
   */
  remove() {
    this._pictureId = 0;
    this._materialName = '';
    this._anchorX = 0;
    this._anchorY = 0;
    this._x = 0;
    this._y = 0;
    this._maskFrame = null;
  }

  /**
   * 更新する
   */
  update() {
    this._updateMove();
  }

  /**
   * 移動を更新する
   * @returns
   */
  private _updateMove() {
    if (this._duration <= 0) {
      return;
    }
    this._duration--;
    const [moveX, moveY] = this._calcMove(this._distanceX, this._distanceY);
    this._x = this._startX + Math.round(moveX);
    this._y = this._startY + Math.round(moveY);
  }

  /**
   * 移動量を計算する
   * @param distanceX
   * @param distanceY
   * @returns
   */
  private _calcMove(distanceX: number, distanceY: number) {
    const elapsed = this._wholeDuration - this._duration;
    switch (this._moveType) {
      case EMoveType.ParabolaX: {
        const a = distanceY / distanceX / distanceX;
        const x = (distanceX * elapsed) / this._wholeDuration;
        return [x, a * x * x];
      }
      case EMoveType.ParabolaY: {
        const b = distanceX / distanceY / distanceY;
        const y = (distanceY * elapsed) / this._wholeDuration;
        return [b * y * y, y];
      }
      default:
        return [
          (distanceX * elapsed) / this._wholeDuration,
          (distanceY * elapsed) / this._wholeDuration,
        ];
    }
  }
}
