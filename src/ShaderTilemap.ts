import { Graphics } from './Graphics';
import { GameTile } from './GameEvent';
import { GameUtils } from './GameUtils';
import { Tileset } from './GameMapSight';
import { CompositeTilemap } from '@pixi/tilemap';
import { Point } from './GameTypes';
import { GameRange } from './GameMapParts';
import { BaseTexture } from 'pixi.js';

/**
 * タイルマップ描画情報
 */
interface ShaderTilemapInfo {
  mapWidth: number;
  mapHeight: number;
  layerData: Uint32Array;
  coverData: Uint32Array;
  roomData: Uint8Array;
  roomId: number;
  tileWidth: number;
  tileHeight: number;
  tilesets: Tileset[];
  layerOffData: Uint32Array;
  coverOffData: Uint32Array;
  tiles: GameTile[];
}

/**
 * 部屋変化列挙体
 */
export const enum ERoomChange {
  None,
  Show,
  Hide,
}

/**
 * タイルマップ描画クラス
 */
export class ShaderTilemap {
  private _ready: boolean = false;
  /**
   * 設定する横タイル数
   */
  private _dx: number = 17;
  /**
   * 設定する縦タイル数
   */
  private _dy: number = 17;
  /**
   * 左のマップ座標
   */
  private _offsetX: number = 0;
  /**
   * 上のマップ座標
   */
  private _offsetY: number = 0;
  /**
   * 左のはみ出し分
   */
  private _outX: number = 0;
  /**
   * 上のはみ出し分
   */
  private _outY: number = 0;
  /**
   * タイルマップ更新時の横開始座標
   */
  private _lastSx: number = 9999;
  /**
   * タイルマップ更新時の縦開始座標
   */
  private _lastSy: number = 9999;
  /**
   * 現在の部屋Id
   */
  private _currentRoomId: number = 0;
  /**
   * 次の部屋Id
   */
  private _nextRoomId: number = -1;
  /**
   * 前の部屋Id
   */
  private _prevRoomId: number = -1;
  /**
   * 部屋表示範囲
   */
  private _showRoomRange: GameRange = GameRange.empty;
  /**
   * 部屋変化状態
   */
  private _roomChange: ERoomChange = ERoomChange.None;
  /**
   * 範囲内の描画関数
   */
  private _getCurrentLayerDataFn: (
    index: number,
    x: number,
    y: number
  ) => Uint32Array | number[] = this._getCurrentLayerDataNormal;
  /**
   * 範囲外の描画関数
   */
  private _getCurrentLayerOffDataFn: (x: number, y: number) => Uint32Array =
    this._getCurrentLayerOffDataNormal;
  /**
   * 再描画必要フラグ
   */
  private _needsRepaint: boolean = false;
  /**
   * タイルマップ描画情報
   */
  private _info: ShaderTilemapInfo = this._createEmptyShaderTilemapInfo();
  /**
   * マップのサイズ
   */
  private _mapSize: number = 0;
  /**
   * レイヤー数
   */
  private _layerLength: number = 0;
  /**
   * カバーのレイヤー数
   */
  private _coverLength: number = 0;
  /**
   * 下層レイヤー
   */
  private _lower: CompositeTilemap = new CompositeTilemap();
  /**
   * 上層レイヤー
   */
  private _upper: CompositeTilemap = new CompositeTilemap();
  /**
   * アニメ用のカウント
   */
  private _count: number = 0;
  /**
   * タイル置き換え位置
   */
  private _replacePositions: Point[] = [];
  /**
   * アニメ用のパターン番号
   */
  private static _animPatternNumberList = [1, 3, 4];
  /**
   * アニメ用のY座標のパターン
   */
  private static _animYPatternIndex = [1, 2, 1, 0];

  /**
   * コンストラクタ
   */
  constructor() {
    this._setLayers();
  }

  /**
   * 左のマップ座標を設定
   */
  set offsetX(x: number) {
    this._offsetX = x;
    const tileWidth = this._info.tileWidth;
    this._outX = (tileWidth + (x % tileWidth)) % tileWidth;
  }

  /**
   * 左のマップ座標を取得
   */
  get offsetX() {
    return this._offsetX;
  }

  /**
   * 上のマップ座標を設定
   */
  set offsetY(y: number) {
    this._offsetY = y;
    const tileHeight = this._info.tileHeight;
    this._outY = (tileHeight + (y % tileHeight)) % tileHeight;
  }

  /**
   * 上のマップ座標を取得
   */
  get offsetY() {
    return this._offsetY;
  }

  /**
   * 部屋Idの設定
   * @param roomId
   */
  setCurrentRoomId(roomId: number) {
    if (this._currentRoomId !== roomId) {
      this._currentRoomId = roomId;
      this._setNeedsRepaint(true);
    }
  }

  /**
   * 部屋変化変更
   */
  endRoomChange() {
    this._roomChange = ERoomChange.None;
    this._getCurrentLayerDataFn = this._getCurrentLayerDataNormal;
    this._getCurrentLayerOffDataFn = this._getCurrentLayerOffDataNormal;
  }

  /**
   * 部屋表示開始
   * @param roomId
   */
  startShowRoom(roomId: number) {
    if (this._currentRoomId === roomId) {
      return;
    }
    this._nextRoomId = roomId;
    this._roomChange = ERoomChange.Show;
    this._getCurrentLayerDataFn = this._getCurrentLayerDataShow;
    this._getCurrentLayerOffDataFn = this._getCurrentLayerOffDataShow;
  }

  /**
   * 部屋非表示開始
   * @param roomId
   */
  startHideRoom(roomId: number) {
    if (this._currentRoomId === roomId) {
      return;
    }
    this._prevRoomId = this._currentRoomId;
    this._currentRoomId = roomId;
    this._nextRoomId = -1;
    this._roomChange = ERoomChange.Hide;
    this._getCurrentLayerDataFn = this._getCurrentLayerDataHide;
    this._getCurrentLayerOffDataFn = this._getCurrentLayerOffDataHide;
  }

  /**
   * 部屋の表示範囲を設定する
   * @param range
   */
  setShowRoomRange(range: GameRange) {
    this._showRoomRange = range;
    this._setNeedsRepaint(true);
  }

  /**
   * 部屋の表示範囲を消去する
   */
  clearShowRoomRange() {
    this._showRoomRange = GameRange.empty;
    this._setNeedsRepaint(true);
  }

  /**
   * タイル置き換え位置情報を設定
   * @param value
   */
  setReplacePositions(value: Point[]) {
    this._replacePositions = value;
  }

  /**
   * 再描画フラグの設定
   * @param value
   */
  private _setNeedsRepaint(value: boolean) {
    this._needsRepaint = value;
  }

  /**
   * 表示を削除する
   * このオブジェクト破棄前に呼んでstageからはずさないとたまっていく
   */
  removeDisplay() {
    // 破棄する
    const options = { children: true, texture: true };
    this._lower.destroy(options);
    this._upper.destroy(options);
  }

  /**
   * 空のShaderTilemapInfoオブジェクトを作成
   */
  private _createEmptyShaderTilemapInfo() {
    return {
      mapWidth: 0,
      mapHeight: 0,
      layerData: new Uint32Array(),
      coverData: new Uint32Array(),
      roomData: new Uint8Array(),
      roomId: 0,
      tileWidth: 0,
      tileHeight: 0,
      tilesets: [],
      layerOffData: new Uint32Array(),
      coverOffData: new Uint32Array(),
      tiles: [],
    };
  }

  /**
   * タイルレイヤーを作成する
   */
  private _setLayers() {
    this._lower.zIndex = 1000;
    Graphics.addSceneChild(this._lower);
    this._upper.zIndex = 3000;
    Graphics.addSceneChild(this._upper);
    return this;
  }

  /**
   * タイルレイヤーにテクスチャを設定する
   */
  private _setTexture() {
    this._ready = false;
    const tilesets = this._info.tilesets;

    // 使用テクスチャを取得
    const textures = tilesets.map((tileset) => {
      // PIXI.Texture.fromで読み込んだ場合はPIXI.utils.TextureCacheにキャッシュされる
      // 名前は付けられない
      // キャッシュから削除はPIXI.Texture.removeFromCache
      // キャッシュから削除するだけなので参照を持っていれば使える
      // imageは ./assets/tileset/ からの相対パスなのでこのような表記になっている
      // ＞実際は同じフォルダにある
      const url = './assets/tilesets/' + tileset.image;
      return Graphics.loadSource(url);
    });
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const complete = (newSource: BaseTexture) => {
      count++;
      if (count === textures.length) {
        this._lower.tileset(textures);
        this._upper.tileset(textures);
        this._ready = true;
      }
    };
    for (const texture of textures) {
      if (texture.valid) {
        count++;
        continue;
      }
      texture.on('update', (newTexture: BaseTexture) => {
        complete(newTexture);
      });
    }

    if (count === textures.length) {
      this._lower.tileset(textures);
      this._upper.tileset(textures);
      this._ready = true;
    } else {
      this._lower.clear();
      this._upper.clear();
    }

    return this;
  }

  /**
   * 設定しなおし
   */
  refresh() {
    this._setTexture();
    this.resetAnimation();
    this._calcMapInfo();
    this._currentRoomId = this._info.roomId;
    this._needsRepaint = true;
  }

  /**
   * 設定
   * @param info
   */
  setup(info: ShaderTilemapInfo) {
    this._info = info;
    this._setDrawSize();
    this.refresh();
  }

  /**
   * アニメーションをリセット
   */
  resetAnimation() {
    this._lower.tileAnim = [0, 0];
    this._upper.tileAnim = [0, 0];
    this._count = 0;
  }

  /**
   * 部屋Idを置き換える
   * @param roomId
   */
  replaceRoomId(roomId: number) {
    if (this._info.roomId === roomId) {
      return;
    }
    this._info.roomId = roomId;
    this._currentRoomId = this._info.roomId;
    this._needsRepaint = true;
  }

  /**
   * 描画サイズを設定する
   */
  private _setDrawSize() {
    this._dx = this._info.mapWidth <= 16 ? this._info.mapWidth : 17;
    this._dy = this._info.mapHeight <= 16 ? this._info.mapHeight : 17;
  }

  /**
   * マップ情報を計算する
   */
  private _calcMapInfo() {
    const size = this._info.mapWidth * this._info.mapHeight;
    this._layerLength = Math.floor(this._info.layerData.length / size);
    this._coverLength = Math.floor(this._info.coverData.length / size);
    this._mapSize = size;
  }

  destroy() {
    // PIXI.tilemapをdestroy()する
  }

  /**
   * タイルを設置
   * @param sx
   * @param sy
   * @param x
   * @param y
   */
  private _setTiles(sx: number, sy: number, x: number, y: number) {
    const mapWidth = this._info.mapWidth;
    const mapHeight = this._info.mapHeight;
    // マップからはみ出したタイル
    if (x + sx < 0 || x + sx >= mapWidth || y + sy < 0 || y + sy >= mapHeight) {
      this._setOffTiles(x, y);
      return;
    }

    this._setLayerTiles(sx, sy, x, y);
  }

  /**
   * レイヤー範囲外のタイルを設定
   * @param x
   * @param y
   */
  private _setOffTiles(x: number, y: number) {
    const data = this._getCurrentLayerOffDataFn(x, y);
    data.forEach((tileData) => {
      this._setTile(tileData, x, y);
    });
  }

  /**
   * 通常時の現在使用する画面外のデータを取得
   */
  private _getCurrentLayerOffDataNormal() {
    if (this._currentRoomId === 0) {
      return this._info.layerOffData;
    } else {
      return this._info.coverOffData;
    }
  }

  /**
   * 表示時の現在使用する画面外のデータを取得
   * @param x
   * @param y
   */
  private _getCurrentLayerOffDataShow(x: number, y: number) {
    if (this._currentRoomId === 0) {
      return this._info.layerOffData;
    } else {
      const roomShow = this._checkShowRoom(x, y);
      if (roomShow) {
        return this._info.layerOffData;
      }
      return this._info.coverOffData;
    }
  }

  /**
   * 非表示時の現在使用する画面外のデータを取得
   * @param x
   * @param y
   */
  private _getCurrentLayerOffDataHide(x: number, y: number) {
    if (this._currentRoomId === 0) {
      return this._info.layerOffData;
    } else {
      const roomShow = this._checkHideRoom(x, y);
      if (roomShow) {
        return this._info.layerOffData;
      }
      return this._info.coverOffData;
    }
  }

  /**
   * レイヤー範囲のタイルを設定
   * @param sx
   * @param sy
   * @param x
   * @param y
   */
  private _setLayerTiles(sx: number, sy: number, x: number, y: number) {
    const baseIndex = (y + sy) * this._info.mapWidth + (x + sx);
    const data = this._getCurrentLayerDataFn(baseIndex, x, y);
    data.forEach((tileData) => {
      this._setTile(tileData, x, y);
    });
  }

  /**
   * 通常時の現在使用するレイヤーデータを取得
   * @param index
   */
  private _getCurrentLayerDataNormal(index: number) {
    const room = this._info.roomData[index] ?? 0;
    const roomId = GameUtils.getRoomId(room);

    if (this._currentRoomId === 0) {
      // 外にいるときはかぶせのタイルを設定
      if (roomId > 0) {
        const data = this._getOutsideRoomLayerData(index);
        if (data) {
          return data;
        }
      }
    } else {
      // 中にいるとき中以外はかぶせ外のタイルを設定
      if (this._currentRoomId !== roomId) {
        return this._info.coverOffData;
      }
    }
    return this._getLayerData(index, this._info.layerData, this._layerLength);
  }

  /**
   * 表示時の現在使用するレイヤーデータを取得
   * @param index
   * @param x
   * @param y
   */
  private _getCurrentLayerDataShow(index: number, x: number, y: number) {
    const room = this._info.roomData[index] ?? 0;
    const roomId = GameUtils.getRoomId(room);
    const roomShow = this._checkShowRoom(x, y);

    if (this._currentRoomId === 0) {
      // 外にいるときはかぶせのタイルを設定
      // ただし次の部屋はベース
      if (roomId > 0 && (this._nextRoomId !== roomId || !roomShow)) {
        const data = this._getOutsideRoomLayerData(index);
        if (data) {
          return data;
        }
      }
    } else {
      // 中にいるとき中以外はかぶせ外のタイルを設定
      // ただし次の部屋はベース
      if (this._currentRoomId !== roomId) {
        if (this._nextRoomId === 0) {
          if (roomId > 0) {
            if (roomShow) {
              const data = this._getOutsideRoomLayerData(index);
              if (data) {
                return data;
              }
            } else {
              return this._info.coverOffData;
            }
          } else {
            if (!roomShow) {
              return this._info.coverOffData;
            }
          }
        } else {
          if (this._nextRoomId !== roomId || !roomShow) {
            return this._info.coverOffData;
          }
        }
      }
    }
    return this._getLayerData(index, this._info.layerData, this._layerLength);
  }

  /**
   * 非表示時の現在使用するレイヤーデータを取得
   * @param index
   * @param x
   * @param y
   */
  private _getCurrentLayerDataHide(index: number, x: number, y: number) {
    const room = this._info.roomData[index] ?? 0;
    const roomId = GameUtils.getRoomId(room);
    const roomShow = this._checkHideRoom(x, y);

    if (this._currentRoomId === 0) {
      // 外にいるときはかぶせのタイルを設定
      if (roomId > 0 && (this._prevRoomId !== roomId || !roomShow)) {
        const data = this._getOutsideRoomLayerData(index);
        if (data) {
          return data;
        }
      }
    } else {
      // 中にいるとき中以外はかぶせ外のタイルを設定
      if (this._currentRoomId !== roomId) {
        if (this._prevRoomId === 0) {
          if (roomId > 0) {
            if (roomShow) {
              const data = this._getOutsideRoomLayerData(index);
              if (data) {
                return data;
              }
            } else {
              return this._info.coverOffData;
            }
          } else {
            if (!roomShow) {
              return this._info.coverOffData;
            }
          }
        } else {
          if (this._prevRoomId !== roomId || !roomShow) {
            return this._info.coverOffData;
          }
        }
      }
    }
    return this._getLayerData(index, this._info.layerData, this._layerLength);
  }

  /**
   * 部屋外のレイヤーデータを取得
   * @param index
   * @returns
   */
  private _getOutsideRoomLayerData(index: number) {
    if (this._coverLength === 0) {
      return this._info.coverOffData.length === 0
        ? undefined
        : this._info.coverOffData;
    }
    const data = this._getLayerData(
      index,
      this._info.coverData,
      this._coverLength
    );
    if (this._enableData(data)) {
      return data;
    }
  }

  /**
   * 表示する部屋を確認
   * @param x
   * @param y
   * @param roomId
   */
  private _checkShowRoom(x: number, y: number) {
    if (this._roomChange !== ERoomChange.Show) {
      return false;
    }

    // 中に入ろうとしているときは表示範囲か確認する
    const left = x * this._info.tileWidth - this._outX;
    const top = y * this._info.tileHeight - this._outY;
    return this._showRoomRange.overlap(
      left,
      top,
      left + this._info.tileWidth,
      top + this._info.tileHeight
    );
  }

  /**
   * 隠す部屋を確認
   * @param x
   * @param y
   */
  private _checkHideRoom(x: number, y: number) {
    if (this._roomChange !== ERoomChange.Hide) {
      return false;
    }

    // 中に入ろうとしているときは表示範囲か確認する
    const left = x * this._info.tileWidth - this._outX;
    const top = y * this._info.tileHeight - this._outY;
    return this._showRoomRange.overlap(
      left,
      top,
      left + this._info.tileWidth,
      top + this._info.tileHeight
    );
  }

  /**
   * 指定インデックスのレイヤーデータを取得
   * @param index
   * @param layerData
   * @param layerLength
   */
  private _getLayerData(
    index: number,
    layerData: Uint32Array,
    layerLength: number
  ) {
    const data: number[] = [];
    for (let i = 0; i < layerLength; i++) {
      data.push(layerData[index + i * this._mapSize]);
    }
    return data;
  }

  /**
   * 有効データかどうか
   * @param data
   * @returns
   */
  private _enableData(data: number[]) {
    return data.some((tileData) => GameUtils.enableTile(tileData));
  }

  /**
   * 1タイル設定
   * @param tileData
   * @param x
   * @param y
   */
  private _setTile(tileData: number, x: number, y: number) {
    if (!GameUtils.enableTile(tileData)) {
      return;
    }
    const id = GameUtils.getTileId(tileData);
    const index = GameUtils.getTileIndex(tileData);

    const tileWidth = this._info.tileWidth;
    const tileHeight = this._info.tileHeight;
    const tileset = this._info.tilesets[index];

    const tileId = tileset.tiles[id];
    const anim = GameUtils.getAnim(tileId);
    const pattern = GameUtils.getAnimPattern(tileId);
    const direction = GameUtils.getAnimDirection(tileId);
    const upper = GameUtils.upperTile(tileId);
    let [animX, animY, animCountX, animCountY] = [0, 0, 1, 1];
    if (anim > 0) {
      if (direction === 0) {
        animX = anim * tileWidth;
        animCountX = ShaderTilemap._animPatternNumberList[pattern];
      } else {
        animY = anim * tileHeight;
        animCountY = 3; // 固定
      }
    }

    const layer = upper ? this._upper : this._lower;
    layer.tile(index, x * tileWidth, y * tileHeight, {
      u: (id % tileset.columns) * tileset.tileWidth,
      v: ((id / tileset.columns) | 0) * tileset.tileHeight,
      tileWidth: tileset.tileWidth,
      tileHeight: tileset.tileHeight,
      animX,
      animY,
      animCountX,
      animCountY,
    });
  }

  /**
   * タイルマップの更新
   * @param sx
   * @param sy
   */
  private _updateTilemap(sx: number, sy: number) {
    this._lower.clear();
    this._upper.clear();

    const [dx, dy] = [this._dx, this._dy];
    for (let y = 0; y < dy; y++) {
      for (let x = 0; x < dx; x++) {
        this._setTiles(sx, sy, x, y);
      }
    }
    for (const tile of this._info.tiles) {
      const x = tile.x - sx;
      const y = tile.y - sy;
      if (x < 0 || y < 0 || x >= dx || y >= dy) {
        continue;
      }
      this._setExtraTile(tile.tileData, x, y);
    }
  }

  /**
   * 追加タイルを設定する
   * @param tileData
   * @param x
   * @param y
   */
  private _setExtraTile(tileData: number, x: number, y: number) {
    switch (this._roomChange) {
      case ERoomChange.None:
        if (this._currentRoomId === 0) {
          break;
        }
        return;
      case ERoomChange.Show:
        if (this._currentRoomId === 0) {
          break;
        } else {
          if (this._nextRoomId === 0) {
            const roomShow = this._checkShowRoom(x, y);
            if (roomShow) {
              break;
            }
          }
          return;
        }
      case ERoomChange.Hide:
        if (this._currentRoomId === 0) {
          break;
        } else {
          if (this._prevRoomId === 0) {
            const roomShow = this._checkHideRoom(x, y);
            if (roomShow) {
              break;
            }
          }
          return;
        }
    }
    this._setTile(tileData, x, y);
  }

  /**
   * 置き換えが発生したか
   * @param sx
   * @param sy
   */
  private _replace(sx: number, sy: number) {
    const ex = sx + this._dx;
    const ey = sy + this._dy;
    return this._replacePositions.find((pos) => {
      return pos.x >= sx && pos.x < ex && pos.y >= sy && pos.y < ey;
    });
  }

  /**
   * 更新
   */
  update() {
    if (!this._ready) {
      return;
    }
    const tileWidth = this._info.tileWidth;
    const tileHeight = this._info.tileHeight;

    // タイルの設定
    const sx = Math.floor(this.offsetX / tileWidth);
    const sy = Math.floor(this.offsetY / tileHeight);
    if (
      this._needsRepaint ||
      this._replace(sx, sy) ||
      this._lastSx !== sx ||
      this._lastSy !== sy
    ) {
      this._needsRepaint = false;
      this._lastSx = sx;
      this._lastSy = sy;
      this._updateTilemap(sx, sy);
    }

    // タイルの表示範囲をずらす
    // dispはマイナスになってはいけない
    const dispX = (tileWidth + this._outX) % tileWidth;
    const dispY = (tileHeight + this._outY) % tileHeight;
    this._lower.pivot.set(dispX, dispY);
    this._upper.pivot.set(dispX, dispY);

    this._updateTileAnimation();
  }

  /**
   * アニメーションの更新
   */
  private _updateTileAnimation() {
    const xPattern = Math.floor(this._count / 20);
    const yPattern = ShaderTilemap._animYPatternIndex[xPattern % 4];
    this._lower.tileAnim[0] = xPattern;
    this._lower.tileAnim[1] = yPattern;
    this._upper.tileAnim[0] = xPattern;
    this._upper.tileAnim[1] = yPattern;
    this._count = (this._count + 1) % 240;
  }
}
