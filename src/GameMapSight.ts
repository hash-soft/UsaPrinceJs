import { TiledObject } from 'tiled-types/types';
import { GameMusic, GameSound } from './AudioUtils';
import {
  gameMapSight,
  gameMarch,
  gameSystem,
  gameTemp,
  mapList,
  terrains,
} from './DataStore';
import {
  EEncounterOption,
  EEventTriggerHex,
  EventScript,
  Eventset,
  MapPart,
} from './DataTypes';
import { getSlotNumber } from './DataUtils';
import { ECharacterTargetType, GameCharacter } from './GameCharacter';
import { ECharacter, EMap, EMapScale } from './GameConfig';
import {
  GameEvent,
  GameEventAuto,
  GamePerson,
  GameRangeEvent,
  GameTile,
  SuspendObjectGameEvent,
  SuspendObjectGamePerson,
  SuspendObjectGameRangeEvent,
  SuspendObjectGameTile,
} from './GameEvent';
import { GameMapRoom, GameRange, GameRegion } from './GameMapParts';
import { GameNumberList, GameUtils } from './GameUtils';
import { GameVehicle } from './GameVehicle';
import { Graphics } from './Graphics';
import Utils from './Utils';

/**
 * 場所移動
 */
export interface TransferInfo {
  move: boolean;
  mapId: number;
  x: number;
  y: number;
  direction: number;
}

/**
 * タイルセット情報
 */
export interface Tileset {
  image: string;
  columns: number;
  tileWidth: number;
  tileHeight: number;
  firstgid: number;
  tiles: Uint32Array;
}

/**
 * マップ操作クラスの中断オブジェクト
 */
export interface SuspendObjectGameMapSight {
  transferring: boolean;
  transit: boolean;
  comeback: boolean;
  nextTransfer: TransferInfo;
  currentRoomId: number;
  dispX: number;
  dispY: number;
  centerRealX: number;
  centerRealY: number;
  shiftDispX: number;
  shiftDispY: number;
  shiftX: number;
  shiftY: number;
  scrollX: number;
  scrollY: number;
  scrollSpeed: number;
  scrollCount: number;
  width: number;
  height: number;
  events: SuspendObjectGameEvent[];
  eventStarting: boolean;
  drivingIndex: number;
  vehicleGettingOn: boolean;
  vehicleGettingOff: boolean;
  nextTroopId: number;
  encounterEffectId: number;
  encounterId: number;
  encounterOptionId: number;
  encounterElementsId: number;
}

/**
 * マップ操作クラス
 */
export class GameMapSight {
  /**
   * マップId
   */
  private _mapId: number = 0;
  /**
   * 移送予約
   * 移送可能なタイミングで移送開始する
   */
  private _transferring: boolean = false;
  /**
   * 移送中
   */
  private _transit: boolean = false;
  /**
   * 別のシーンからマップにもどるかどうか
   */
  private _comeback: boolean = false;
  /**
   * 次移動情報
   */
  private _nextTransfer: TransferInfo = {
    move: false,
    mapId: 0,
    x: 0,
    y: 0,
    direction: -1,
  };
  /**
   * 現在いる部屋
   */
  private _currentRoomId: number = 0;
  /**
   * 表示する左座標
   */
  private _dispX: number = 0;
  /**
   * 表示する上座標
   */
  private _dispY: number = 0;
  /**
   * 中心キャラクターの横座標
   */
  private _centerRealX: number = 0;
  /**
   * 中心キャラクターの縦座標
   */
  private _centerRealY: number = 0;
  /**
   * ずらしている表示X座標
   */
  private _shiftDispX: number = 0;
  /**
   * ずらしている表示Y座標
   */
  private _shiftDispY: number = 0;
  /**
   * ずらし先のX座標
   */
  private _shiftX: number = 0;
  /**
   * ずらし先のY座標
   */
  private _shiftY: number = 0;
  /**
   * スクロール横サイズ
   */
  private _scrollX: number = 0;
  /**
   * スクロール縦サイズ
   */
  private _scrollY: number = 0;
  /**
   * スクロール速度
   */
  private _scrollSpeed: number = 2;
  /**
   * スクロールカウント
   */
  private _scrollCount: number = 0;
  /**
   * マップの横幅
   */
  private _width: number = 0;
  /**
   * マップの縦幅
   */
  private _height: number = 0;
  /**
   * データ化する前のレイヤー
   */
  private _originalLayers: number[][] = [];
  /**
   * マップデータをレイヤーデータに変換したもの
   */
  private _layerData: Uint32Array = new Uint32Array(0);
  /**
   * マップ外のタイルIdをレイヤーごとに持つ配列
   */
  private _layerOffData: Uint32Array = new Uint32Array(0);
  /**
   * マップの部屋データを配列に変換したもの
   */
  private _roomData: Uint8Array = new Uint8Array(0);
  /**
   * 実在範囲群
   * tilemapeditorは id=配列順序 にならないため仕方なくMapに
   */
  private _regions: Map<string, GameRegion> = new Map();
  /**
   * マップに設定されている生のオブジェクト
   */
  private _rawObjectsList: TiledObject[][] = [];
  /**
   * 読み込んだイベントデータ
   * eventsetsフォルダにあるやつ
   */
  private _eventset: Eventset = { objects: [] };
  /**
   * 読み込んだスクリプトデータ
   * scriptsetsフォルダにあるやつ
   */
  private _scriptset: EventScript[] = [];
  /**
   * タイルセット群
   */
  private _tilesets: Tileset[] = [];
  /**
   * 実行イベント群
   */
  private _events: GameEvent[] = [];
  /**
   * 実行イベント群からキャラクターを抽出したもの
   */
  private _characters: GamePerson[] = [];
  /**
   * 実行イベント群からタイルを抽出したもの
   */
  private _tiles: GameTile[] = [];
  /**
   * イベント開始予約があるか
   */
  private _eventStarting: boolean = false;
  /**
   * 部屋表示情報
   */
  private _roomShow: GameMapRoom = new GameMapRoom();
  /**
   * 戦闘背景名
   */
  private _battleBackName: string = '';
  /**
   * マップに存在している乗り物
   */
  private _vehicles: GameVehicle[] = [];
  /**
   * 乗っている乗り物のインデックス
   */
  private _drivingIndex: number = -1;
  /**
   * 搭乗中
   */
  private _vehicleGettingOn: boolean = false;
  /**
   * 降りる際中
   */
  private _vehicleGettingOff: boolean = false;
  /**
   * 出現トループId
   */
  private _nextTroopId: number = 0;
  /**
   * 敵遭遇効果
   */
  private _encounterEffectId: number = 0;
  /**
   * エンカウントId
   */
  private _encounterId: number = 0;
  /**
   * エンカウントオプションId
   */
  private _encounterOptionId: number = 0;
  /**
   * エンカウント属性
   */
  private _encounterElementsId: number = 0;

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameMapSight) {
    this._transferring = data.transferring ?? this._transferring;
    this._transit = data.transit ?? this._transit;
    this._comeback = data.comeback ?? this._comeback;
    this._nextTransfer = data.nextTransfer ?? this._nextTransfer;
    this._currentRoomId = data.currentRoomId ?? this._currentRoomId;
    this._dispX = data.dispX ?? this._dispX;
    this._dispY = data.dispY ?? this._dispY;
    this._centerRealX = data.centerRealX ?? this._centerRealX;
    this._centerRealY = data.centerRealY ?? this._centerRealY;
    this._shiftDispX = data.shiftDispX ?? this._shiftDispX;
    this._shiftDispY = data.shiftDispY ?? this._shiftDispY;
    this._shiftX = data.shiftX ?? this._shiftX;
    this._shiftY = data.shiftY ?? this._shiftY;
    this._scrollX = data.scrollX ?? this._scrollX;
    this._scrollY = data.scrollY ?? this._scrollY;
    this._scrollSpeed = data.scrollSpeed ?? this._scrollSpeed;
    this._scrollCount = data.scrollCount ?? this._scrollCount;
    this._width = data.width ?? this._width;
    this._height = data.height ?? this._height;
    this._loadSuspendEvent(data.events);
    this._eventStarting = data.eventStarting ?? this._eventStarting;
    this._drivingIndex = data.drivingIndex ?? this._drivingIndex;
    this._vehicleGettingOn = data.vehicleGettingOn ?? this._vehicleGettingOn;
    this._vehicleGettingOff = data.vehicleGettingOff ?? this._vehicleGettingOff;
    this._nextTroopId = data.nextTroopId ?? this._nextTroopId;
    this._encounterEffectId = data.encounterEffectId ?? this._encounterEffectId;
    this._encounterId = data.encounterId ?? this._encounterId;
    this._encounterOptionId = data.encounterOptionId ?? this._encounterOptionId;
    this._encounterElementsId =
      data.encounterElementsId ?? this._encounterElementsId;
  }

  /**
   * 中断データからイベントの読み込み
   * @param suspendEvents
   */
  private _loadSuspendEvent(suspendEvents: SuspendObjectGameEvent[]) {
    const events: GameEvent[] = [];
    for (const suspendEvent of suspendEvents) {
      const event = this._makeEventObjectFromSuspendEvent(suspendEvent);
      if (event) {
        event.afterLoadSuspend();
        events.push(event);
      }
    }
    this.setEvents(events);
  }

  /**
   * オブジェクト名からイベントオブジェクトを作成する
   * @param objectTypeName
   * @returns
   */
  private _makeEventObjectFromSuspendEvent(
    suspendEvent: SuspendObjectGameEvent
  ) {
    let event: GameEvent;
    switch (suspendEvent.objectTypeName) {
      case 'auto':
        event = new GameEventAuto(-1);
        event.loadSuspend(suspendEvent);
        break;
      case 'range':
        event = new GameRangeEvent(-1, -1, -1);
        event.loadSuspend(suspendEvent as SuspendObjectGameRangeEvent);
        break;
      case 'tile':
        event = new GameTile(-1, -1, -1);
        event.loadSuspend(suspendEvent as SuspendObjectGameTile);
        break;
      case 'person':
        event = new GamePerson(-1, -1, -1);
        event.loadSuspend(suspendEvent as SuspendObjectGamePerson);
        break;
      default:
        return;
    }
    return event;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameMapSight {
    return {
      transferring: this._transferring,
      transit: this._transit,
      comeback: this._comeback,
      nextTransfer: this._nextTransfer,
      currentRoomId: this._currentRoomId,
      dispX: this._dispX,
      dispY: this._dispY,
      centerRealX: this._centerRealX,
      centerRealY: this._centerRealY,
      shiftDispX: this._shiftDispX,
      shiftDispY: this._shiftDispY,
      shiftX: this._shiftX,
      shiftY: this._shiftY,
      scrollX: this._scrollX,
      scrollY: this._scrollY,
      scrollSpeed: this._scrollSpeed,
      scrollCount: this._scrollCount,
      width: this._width,
      height: this._height,
      events: this._events.map((event) => event.createSuspendObject()),
      eventStarting: this._eventStarting,
      drivingIndex: this._drivingIndex,
      vehicleGettingOn: this._vehicleGettingOn,
      vehicleGettingOff: this._vehicleGettingOff,
      nextTroopId: this._nextTroopId,
      encounterEffectId: this._encounterEffectId,
      encounterId: this._encounterId,
      encounterOptionId: this._encounterOptionId,
      encounterElementsId: this._encounterElementsId,
    };
  }

  /**
   * 場所移動期間か
   */
  get transferPeriod() {
    return this.transit || this.needTransfer();
  }

  /**
   * 場所移動中か
   */
  get transit() {
    return this._transit;
  }

  /**
   * 再構築するか
   */
  get rebuild() {
    return this.comeback || this.nextMove;
  }

  /**
   * 同一マップに復帰かどうか
   */
  get comeback() {
    return this._comeback;
  }

  /**
   * マップの移動かどうか
   * 同一マップで位置を変更するだけの場合はfalseとなる
   */
  get nextMove() {
    return this._nextTransfer.move;
  }

  /**
   * マップId
   */
  get mapId() {
    return this._mapId;
  }

  /**
   * 遷移横座標
   */
  get nextX() {
    return this._nextTransfer.x;
  }

  /**
   * 遷移縦座標
   */
  get nextY() {
    return this._nextTransfer.y;
  }

  /**
   * 遷移直後の向き
   */
  get nextDirection() {
    return this._nextTransfer.direction;
  }

  /**
   * マップ情報を取得する
   */
  get mapInfo() {
    return mapList[this.mapId];
  }

  /**
   * マップに設定されている移動速度
   */
  get nextMapMoveSpeed() {
    const speed = this.mapInfo.speed;
    return speed ? 1 << (speed - 1) : EMapScale.DefaultSpeed;
  }

  /**
   * 現在の部屋Id
   */
  get currentRoomId() {
    return this._currentRoomId;
  }

  /**
   * X軸の中央位置
   */
  get centerX() {
    return ((Graphics.width - EMap.TileSize) / 2) * EMapScale.Scale;
  }

  /**
   * Yの中央位置
   */
  get centerY() {
    return ((Graphics.height - EMap.TileSize) / 2) * EMapScale.Scale;
  }

  /**
   * 左の表示位置を取得
   */
  get dispX() {
    return this._dispX + this._shiftDispX;
  }

  /**
   * 上の表示位置を取得
   */
  get dispY() {
    return this._dispY + this._shiftDispY;
  }

  /**
   * X軸の表示中央位置を取得
   */
  get dispCenterX() {
    return this.dispX + this.centerX;
  }

  /**
   * Y軸の表示中央位置を取得
   */
  get dispCenterY() {
    return this.dispY + this.centerY;
  }

  /**
   * スクロール中か
   */
  get scrolling() {
    return (
      this._shiftDispX !== this._shiftX || this._shiftDispY !== this._shiftY
    );
  }

  /**
   * マップの横幅を取得する
   */
  get width() {
    return this._width;
  }

  /**
   * マップの縦幅を取得する
   */
  get height() {
    return this._height;
  }

  /**
   * 描画に使用するレイヤーデータ（メイン）を取得
   */
  get layerData() {
    return this._layerData;
  }

  /**
   * マップ範囲外のレイヤーデータを取得
   */
  get layerOffData() {
    return this._layerOffData;
  }

  /**
   * 部屋の配列データを取得
   */
  get roomData() {
    return this._roomData;
  }

  /**
   * eventsの中からtileを抜き出したものを取得
   */
  get tiles() {
    return this._tiles;
  }

  /**
   * 移動範囲
   */
  get regions() {
    return this._regions;
  }

  /**
   * イベントセットを取得する
   */
  get eventset() {
    return this._eventset;
  }

  /**
   * スクリプトセットを取得する
   */
  get scriptset() {
    return this._scriptset;
  }

  /**
   * タイルセット群を取得
   */
  get tilesets() {
    return this._tilesets;
  }

  /**
   * 部屋表示中か
   */
  get roomOpening() {
    return this._roomShow.roomOpening;
  }

  /**
   * 部屋非表示中か
   */
  get roomClosing() {
    return this._roomShow.roomClosing;
  }

  /**
   * 戦闘背景を取得
   */
  get battleBackName() {
    return this._battleBackName;
  }

  /**
   * 乗り物を取得する
   */
  get vehicles() {
    return this._vehicles;
  }

  /**
   * 乗り物に乗り込もうとしている状態か
   */
  get vehicleGettingOn() {
    return this._vehicleGettingOn;
  }

  /**
   * 搭乗中か
   */
  get driving() {
    return this._drivingIndex >= 0;
  }

  /**
   * 搭乗中の乗り物を取得する
   */
  protected get _drivingVehicle() {
    return this._vehicles[this._drivingIndex];
  }

  /**
   * 搭乗中の乗り物Idを取得する
   * @returns
   */
  getDrivingVehicleId() {
    return this._drivingVehicle?.vehicleId ?? 0;
  }

  /**
   * 次のトループIdを取得する
   */
  get nextTroopId() {
    return this._nextTroopId;
  }

  /**
   * 敵遭遇効果を取得する
   */
  get encounterEffectId() {
    return this._encounterEffectId;
  }

  /**
   * キャラクター数を取得する
   */
  get characterLength() {
    return this._characters.length;
  }

  /**
   * 有効範囲かどうか
   * @param x
   * @param y
   * @returns
   */
  valid(x: number, y: number) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * ずらし開始
   * @param distanceX
   * @param distanceY
   * @param scrollSpeed
   */
  startShift(distanceX: number, distanceY: number, scrollSpeed: number) {
    this._scrollX = distanceX * EMap.RealScale;
    this._scrollY = distanceY * EMap.RealScale;
    this._shiftX += this._scrollX;
    this._shiftY += this._scrollY;
    this._setScrollSpeed(scrollSpeed);
  }

  /**
   * ずらしを戻す
   * @param scrollSpeed
   */
  restoreShift(scrollSpeed: number) {
    this._scrollX = this._shiftDispX;
    this._scrollY = this._shiftDispY;
    this._shiftDispX = 0;
    this._shiftDispY = 0;
    this._setScrollSpeed(scrollSpeed);
  }

  /**
   * スクロール速度を設定
   * @param scrollSpeed
   */
  private _setScrollSpeed(scrollSpeed: number) {
    if (scrollSpeed > 90) {
      // 一定以上なら瞬時とする
      this.stopScroll();
    } else {
      this._scrollSpeed = scrollSpeed;
      this._scrollCount = 0;
    }
  }

  /**
   * スクロールを停止
   */
  stopScroll() {
    this._shiftDispX = this._shiftX;
    this._shiftDispY = this._shiftY;
  }

  /**
   * 表示時の範囲
   */
  getOpenRoomRange() {
    const maxCount = this._roomShow.maxCount();
    // カウントダウンなので最大値から減算した値が距離
    const distance = maxCount - this._roomShow.roomOpenCount;
    const start = maxCount - distance;
    return new GameRange(start, start, distance * 2, distance * 2);
  }

  /**
   * 非表示時の範囲
   */
  getCloseRoomRange() {
    const maxCount = this._roomShow.maxCount();
    // 外から内なのでカウントがそのまま範囲
    const distance = this._roomShow.roomCloseCount;
    const start = maxCount - distance;
    return new GameRange(start, start, distance * 2, distance * 2);
  }

  /**
   * マップのgidを取得
   * @param index
   * @param x
   * @param y
   * @returns
   */
  getGId(index: number, x: number, y: number) {
    return this._originalLayers[index][x + y * this._width];
  }

  /**
   * マップに設定されている生オブジェクトを取得する
   * @param n
   * @returns
   */
  getRawObjects(n: number) {
    return this._rawObjectsList[n];
  }

  /**
   * 指定位置のエリアデータを取得する
   * @param x
   * @param y
   * @returns
   */
  getAreas(x: number, y: number) {
    const areas = this.eventset.areas;
    if (!areas) {
      return [];
    }
    const terrainId = this.getTerrainId(x, y);
    const regions = this._getRegions(x, y);
    return regions
      .filter((region) => {
        if (!region.areaId) {
          return false;
        }
        // 有効地形確認
        const terrainType = areas[region.areaId].terrainType;
        if (!terrainType) {
          return true;
        }
        const enables = GameNumberList.get(terrainType);
        for (const enable of enables) {
          if (enable > 0) {
            if (enable === terrainId) {
              return true;
            }
          } else {
            if (-enable !== terrainId) {
              return true;
            }
          }
        }
        return false;
      })
      .map((region) => areas[region.areaId]);
  }

  /**
   * 指定位置の範囲データを取得する
   * @param x
   * @param y
   * @returns
   */
  private _getRegions(x: number, y: number) {
    return Array.from(this.regions.values()).filter((value) =>
      value.within(x, y)
    );
  }

  /**
   * キャラクターを検索する
   * @param objectId
   * @returns
   */
  findCharacter(objectId: number) {
    return this._characters.find((value) => value.objectId === objectId);
  }

  /**
   * 場所移動予約を取得する
   */
  needTransfer() {
    return this._transferring;
  }

  /**
   * マップ移送チェック
   */
  checkTransfer() {
    if (!this.needTransfer()) {
      return false;
    }

    if (gameSystem.transferSoundId > 0) {
      GameSound.play(gameSystem.transferSoundId);
    }

    return true;
  }

  /**
   * 場所移動を予約する
   * @param options
   */
  reserveTransfer(options: TransferInfo) {
    this._transferring = true;
    this._nextTransfer = options;
  }

  /**
   * 移送開始
   */
  startTransfer() {
    this._comeback = !this._transferring;
    this._transferring = false;
    this._transit = true;
  }

  /**
   * 移送終了
   */
  endTransfer() {
    this._transit = false;
    if (this.rebuild) {
      const skips = this.getEncounterOption()[EEncounterOption.SkipSteps] ?? 0;
      gameMarch.clearMenuCalling();
      gameMarch.leader.setEncounterSkipCount(skips);
    }
    this._nextTransfer.move = false;
    this._comeback = false;
  }

  /**
   * 次のマップ開始
   * @returns
   */
  startNextMap() {
    if (this._comeback) {
      // 予約がなかった場合はなにもしない
      return false;
    }

    this._center(this.nextX, this.nextY);

    return true;
  }

  /**
   * 指定座標が中央になるように設定する
   * @param x
   * @param y
   */
  private _center(x: number, y: number) {
    const centerX = this.centerX;
    const centerY = this.centerY;
    this._dispX = x * EMap.RealScale - centerX;
    this._dispY = y * EMap.RealScale - centerY;
  }

  /**
   * 部屋Idを設定する
   * @param value
   */
  setRoomId(value: number) {
    this._currentRoomId = value;
  }

  /**
   * パーツを戻す
   * @param layerIndex
   * @param mapPart
   * @param rx
   * @param ry
   */
  restorePart(layerIndex: number, mapPart: MapPart, rx: number, ry: number) {
    for (let i = 0; i < mapPart.layers.length; i++) {
      if (layerIndex >= 0 && i !== layerIndex) {
        continue;
      }
      for (let yI = 0; yI < mapPart.sizeY; yI++) {
        for (let xI = 0; xI < mapPart.sizeX; xI++) {
          const x = rx + xI;
          const y = ry + yI;
          this._setTile(i, this.getGId(i, x, y), x, y);
        }
      }
    }
  }

  /**
   * パーツを設定する
   * @param layerIndex
   * @param mapPart
   * @param rx
   * @param ry
   */
  setPart(layerIndex: number, mapPart: MapPart, rx: number, ry: number) {
    for (let i = 0; i < mapPart.layers.length; i++) {
      if (layerIndex >= 0 && i !== layerIndex) {
        continue;
      }
      for (let yI = 0; yI < mapPart.sizeY; yI++) {
        for (let xI = 0; xI < mapPart.sizeX; xI++) {
          const x = rx + xI;
          const y = ry + yI;
          const partIndex = yI * mapPart.sizeX + xI;
          this._setTile(i, mapPart.layers[i][partIndex], x, y);
        }
      }
    }
  }

  /**
   * タイルを設定する
   * タイルオブジェクトから設定
   * @param layerIndex
   * @param gid
   * @param x
   * @param y
   */
  private _setTile(layerIndex: number, gid: number, x: number, y: number) {
    // 置き換え位置を求める
    const pos = x + y * this.width + this.width * this.height * layerIndex;
    // 位置がはみ出していればなにもしない
    if (pos >= this.layerData.length) {
      return null;
    }
    // gidの場合タイルデータに変換する
    const tileData = GameUtils.gidToTileData(gid, gameMapSight.tilesets);

    const oldGId = this.getGId(layerIndex, x, y);
    this.layerData[pos] = tileData;

    // 変わった位置を記憶する
    gameTemp.pushReplaceTilePositions(x, y);

    return oldGId;
  }

  /**
   * 指定位置の戦闘背景名を設定する
   * @param x
   * @param y
   */
  setBattleBackNameByPosition(x: number, y: number) {
    const id = this.mapInfo.terrainId
      ? this.mapInfo.terrainId
      : gameMapSight.getTerrainId(x, y);
    if (!id) {
      this._battleBackName = '';
      return;
    }
    this._battleBackName = terrains[id].battleBackName;
  }

  /**
   * 戦闘背景名を設定する
   * @param name
   */
  setBattleBackName(name: string) {
    this._battleBackName = name;
  }

  /**
   * 左の座標をドット単位にしたもの
   * @param x
   */
  adjustX(x: number) {
    return Math.floor((x - this.dispX) / EMapScale.Scale);
  }

  /**
   * 上の座標をドット単位にしたもの
   * @param y
   */
  adjustY(y: number) {
    return Math.floor((y - this.dispY) / EMapScale.Scale);
  }

  /**
   * 中心の原寸位置を設定する
   * @param realX
   * @param realY
   */
  setCenterRealPosition(realX: number, realY: number) {
    this._centerRealX = realX;
    this._centerRealY = realY;
  }

  /**
   * 保存している中央の位置に対してスクロールを行う
   * @param realX
   * @param realY
   */
  centerScroll(realX: number, realY: number) {
    this._dispX += realX - this._centerRealX;
    this._dispY += realY - this._centerRealY;
  }

  /**
   * マップのサイズを設定する
   * @param width
   * @param height
   */
  setSize(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  /**
   * レイヤーを設定する
   * @param layerLength
   * @param layerData
   * @param layerOffData
   */
  setLayers(
    originalLayers: number[][],
    layerData: Uint32Array,
    layerOffData: Uint32Array
  ) {
    this._originalLayers = originalLayers;
    this._layerData = layerData;
    this._layerOffData = layerOffData;
  }

  /**
   * 部屋データを設定する
   * @param value
   */
  setRoomData(value: Uint8Array) {
    this._roomData = value;
  }

  /**
   * 範囲データを設定する
   * @param value
   */
  setRegions(value: Map<string, GameRegion>) {
    this._regions = value;
  }

  /**
   * イベントデータを設定する
   * @param rawObjects
   * @param eventset
   * @param scriptset
   */
  setEventData(
    rawObjectsList: TiledObject[][],
    eventset: Eventset,
    scriptset: EventScript[]
  ) {
    this._rawObjectsList = rawObjectsList;
    this._eventset = eventset;
    this._scriptset = scriptset;
  }

  /**
   * タイルセットデータを設定する
   * @param value
   */
  setTilesets(value: Tileset[]) {
    this._tilesets = value;
  }

  /**
   * イベントデータを設定する
   * @param value
   */
  setEvents(value: GameEvent[]) {
    this._events = value;
    this._setFilterEvents();
  }

  /**
   * イベントをタイプごとにフィルターして設定する
   */
  private _setFilterEvents() {
    this._characters = this._events.filter(
      (value) => value.objectPerson
    ) as GamePerson[];
    this._tiles = this._events.filter(
      (value) => value.objectTile
    ) as GameTile[];
  }

  /**
   * イベントをループさせて任意の処理を行う
   * @param fn
   */
  eachEvents(fn: (event: GameEvent) => void) {
    for (const event of this._events) {
      fn(event);
    }
  }

  /**
   * 乗り物を設定する
   * @param value
   */
  setVehicles(value: GameVehicle[]) {
    this._vehicles = value;
    // 搭乗中の乗り物を更新する
    this._drivingIndex = -1;
    for (let i = 0; i < this._vehicles.length; i++) {
      if (this._vehicles[i].driving) {
        this._drivingIndex = i;
        break;
      }
    }
  }

  /**
   * キャラクターから任意のオブジェクトを作成する
   * @param fn
   * @returns
   */
  mapCharacters<T>(fn: (character: GameCharacter) => T) {
    return this._characters.map((character) => fn(character));
  }

  /**
   * 接触で乗り込む乗り物の座標か
   * @param x
   * @param y
   * @returns
   */
  contactVehicle(x: number, y: number) {
    // 何かに乗っている場合は直接乗り継ぎできないので不可
    if (this.driving) {
      return false;
    }
    return this._vehicles.some(
      (value) => value.contactRide && value.contact(x, y)
    );
  }

  /**
   * 通行可能か
   * @param x
   * @param y
   * @param march
   * @returns
   */
  noTraffic(x: number, y: number, march: boolean) {
    const collisionFn = march
      ? (event: GameEvent) => event.playerCollision
      : (event: GameEvent) => event.collision;
    const result = this._events.some(
      (event) => collisionFn(event) && event.noTraffic(x, y)
    );
    if (result || march) {
      return result;
    }
    return gameMarch.noTraffic(x, y);
  }

  /**
   * イベント実行中かどうか
   * @returns
   */
  eventRunning() {
    return gameSystem.mapExecutor.running() || this._eventStarting;
  }

  /**
   * 開始を待機しているイベントを取得する
   * @returns
   */
  findStartingEvent() {
    return this._events.find((event) => event.starting);
  }

  /**
   * 必要ならリフレッシュを行う
   */
  needsRefresh() {
    if (gameTemp.needsRefreshEvent) {
      this.refresh();
    }
  }

  /**
   * リフレッシュ
   */
  refresh() {
    // イベントを一新してフラグを落とす
    this.eachEvents((event) => event.refresh());
    gameTemp.endRefreshEvent();
  }

  /**
   * 更新
   */
  update() {
    if (this._checkRoomShowing()) {
      return;
    }
    this.needsRefresh();
    this._setCenterLastPosition();
    gameMarch.update();
    this._updateVehicle();
    this.eachEvents((event) => event.update());

    const center = this._getCenterCharacter();
    if (center) {
      this.centerScroll(center.realX, center.realY);
    }
    this._updateScroll();
  }

  /**
   * 部屋表示処理中かどうか確認
   * gameTemp.roomTransferがtrueの場合は移動中判定
   */
  private _checkRoomShowing(): boolean {
    if (!gameTemp.changeRoom) {
      return false;
    }
    if (this._roomShow.processing) {
      this._roomShow.update();
    } else {
      // 部屋表示処理をしてなかったら開始する
      this._roomShow.startOpen(() => {
        this._roomShow.startClose(() => {
          gameTemp.endChangeRoom();
        });
      });
    }
    return true;
  }

  /**
   * 乗り物の更新
   */
  private _updateVehicle() {
    for (const vehicle of this._vehicles) {
      vehicle.update();
    }
    if (this._vehicleGettingOn) {
      this._updateVehicleGetOn();
    } else if (this._vehicleGettingOff) {
      this._updateVehicleGetOff();
    } else if (this.driving) {
      this._drivingVehicle.sync(gameMarch.leader);
    }
  }

  /**
   * 乗り込み中の更新
   * @returns
   */
  private _updateVehicleGetOn() {
    if (gameMarch.leader.gathering) {
      return;
    }
    this._vehicleGettingOn = false;
    if (this.driving) {
      const vehicle = this._drivingVehicle;
      vehicle.setDriving(true);
      vehicle.getOn(gameMarch.leader.direction);
      this.playVehicleMusic(vehicle.bgmId);
    }
  }

  /**
   * 降りる際中の処理
   * @returns
   */
  private _updateVehicleGetOff() {
    this._vehicleGettingOff = false;
    if (this.driving) {
      const vehicle = this._drivingVehicle;
      vehicle.getOff(-1);
      this._drivingIndex = -1;
      gameMarch.allVisible(true);
      this.playMusic();
    }
  }

  /**
   * 乗り物から出る
   */
  vehicleGetOut() {
    if (this.driving) {
      gameMarch.gatherLeader();
      const vehicle = this._drivingVehicle;
      vehicle.setDriving(false);
      vehicle.getOff(-1);
      this._drivingIndex = -1;
      gameMarch.allVisible(true);
    }
  }

  /**
   * 中心キャラクターの直前の位置を設定する
   */
  private _setCenterLastPosition() {
    const center = this._getCenterCharacter();
    if (center) {
      this.setCenterRealPosition(center.realX, center.realY);
    }
  }

  /**
   * 中心キャラクターを取得する
   * @returns
   */
  private _getCenterCharacter() {
    if (gameSystem.mapScroll) {
      return gameMarch.leader;
    }
    return;
  }

  /**
   * プレイヤーキャラクターを取得する
   * @returns
   */
  getPlayerCharacter() {
    return gameMarch.leader;
  }

  /**
   * スクロールの更新
   */
  private _updateScroll() {
    if (!this.scrolling) {
      return;
    }
    this._scrollCount += 1 << this._scrollSpeed;

    const baseX = this._shiftX - this._scrollX;
    const baseY = this._shiftY - this._scrollY;

    const [x, y] = this._getScrollAbsDistance();
    this._shiftDispX = baseX + (this._scrollX < 0 ? -x : x);
    this._shiftDispY = baseY + (this._scrollY < 0 ? -y : y);
  }

  /**
   * スクロール距離の絶対値を取得
   */
  private _getScrollAbsDistance() {
    const [absX, absY] = [Math.abs(this._scrollX), Math.abs(this._scrollY)];
    const baseDistance = Math.max(absX, absY);
    const [x, y] = (() => {
      if (baseDistance === absX) {
        return [
          this._scrollCount,
          Math.ceil((this._scrollCount * absY) / absX),
        ];
      } else {
        return [
          Math.ceil((this._scrollCount * absX) / absY),
          this._scrollCount,
        ];
      }
    })();
    return [Math.min(absX, x), Math.min(absY, y)];
  }

  /**
   * マップ設定時の最初に設定する
   */
  setup() {
    this._mapId = this._nextTransfer.mapId;
    this._drivingVehicle?.setMapId(this._mapId);
  }

  /**
   * 隊列移送
   */
  transferMarch() {
    gameMarch.refresh();
    if (!this.startNextMap()) {
      return;
    }
    if (this.nextMove) {
      gameMarch.setMoveSpeed(this.nextMapMoveSpeed);
      if (this.nextDirection >= 0) {
        gameMarch.leader.changeDirection(this.nextDirection);
      }
      this._resetEncounterInfo();
      gameMarch.resetPattern();
    }
    const transferX = this._transferMarchX();
    const transferY = this._transferMarchY();
    gameMarch.moveto(transferX, transferY);
    gameMarch.moveAfterVisible();
    this._moveToVehicle(transferX, transferY);
    const [, roomId] = this._getRoom(this.nextX, this.nextY);
    this.setRoomId(roomId);
  }

  /**
   * 乗り物に乗っていれば一緒に移動する
   * @param transferX
   * @param transferY
   * @returns
   */
  private _moveToVehicle(transferX: number, transferY: number) {
    if (!this.driving) {
      return;
    }
    this._drivingVehicle.moveto(transferX, transferY);
  }

  /**
   * エンカウント情報の再設定を行う
   */
  private _resetEncounterInfo() {
    const mapInfo = this.mapInfo;
    this._encounterId = mapInfo.encounterId;
    this._encounterOptionId = mapInfo.encounterOptionId;
    this._encounterElementsId = mapInfo.encounterElementsId;
  }

  /**
   * 隊列の遷移先横座標を取得する
   */
  private _transferMarchX() {
    const slotId = gameSystem.transferScreenXId;
    if (!slotId) {
      return this.nextX;
    }
    // スクリーン座標からマップ座標に変換
    return (
      getSlotNumber(slotId) +
      Math.floor(
        (this._dispX / EMapScale.Scale + ECharacter.LeftOut) / EMap.TileSize
      )
    );
  }

  /**
   * 隊列の遷移先縦座標を取得する
   */
  private _transferMarchY() {
    const slotId = gameSystem.transferScreenYId;
    if (!slotId) {
      return this.nextY;
    }
    // スクリーン座標からマップ座標に変換
    return (
      getSlotNumber(slotId) +
      Math.floor(
        (this._dispY / EMapScale.Scale - ECharacter.TopOut) / EMap.TileSize
      )
    );
  }

  /**
   * マップを開始する
   * @param options
   */
  start(options: TransferInfo) {
    this.reserveTransfer(options);
    gameMarch.setup();
  }

  /**
   * メニューを許可する
   * @returns
   */
  allowMenu() {
    return gameMarch.enableMenu();
  }

  /**
   * 便利行動を許可する
   * @returns
   */
  allowMulti() {
    return gameMarch.enableMulti();
  }

  /**
   * 戦闘許可しているか
   * @returns
   */
  allowBattle() {
    return gameSystem.encounter;
  }

  /**
   * 部屋移動の確認
   */
  checkChangeRoom() {
    if (!gameSystem.roomMove) {
      return false;
    }
    const person = gameMarch.leader;
    const [inRoom, roomId] = this._getRoom(person.x, person.y);
    if (inRoom && this._currentRoomId !== roomId) {
      this.setRoomId(roomId);
      gameTemp.startChangeRoom();
      return true;
    }
    return false;
  }

  /**
   * 指定位置の部屋情報を取得
   * @param x
   * @param y
   */
  private _getRoom(x: number, y: number) {
    const index = this._posToIndex(x, y);
    const room = this._roomData[index] ?? 0;
    return this._expandRoom(room);
  }

  /**
   * 位置からインデックスに変換
   * @param x
   * @param y
   */
  private _posToIndex(x: number, y: number) {
    return x + y * this._width;
  }

  /**
   * 部屋情報を取得
   * @param room
   */
  private _expandRoom(room: number): [boolean, number] {
    return [GameUtils.roomIn(room), GameUtils.getRoomId(room)];
  }

  /**
   * 前方イベントの確認
   * @returns
   */
  checkEventFront() {
    const person = gameMarch.leader;
    if (person.ignoredEvents) {
      return false;
    }
    const frontEvents = this._getFrontEvents(
      person,
      EEventTriggerHex.SelfContact
    );
    if (frontEvents.length > 0) {
      this._startEvent(frontEvents, EEventTriggerHex.SelfContact);
      return true;
    }
    return false;
  }

  /**
   * 自分の位置を確認する
   * @returns
   */
  checkEventCurrent() {
    return this.checkEventTrigger(EEventTriggerHex.SelfContact);
  }

  /**
   * 決定イベントの確認
   * @returns
   */
  checkEventDecide() {
    if (!this.checkEventTrigger(EEventTriggerHex.Multi)) {
      gameTemp.pushCommonScript(GameUtils.getCommonScriptId('notFindAnything'));
    }

    return true;
  }

  /**
   * 指定イベントIdでイベントを確認する
   * @param triggerHex
   * @param eventId
   * @returns
   */
  checkEventTriggerByEventId(triggerHex: number, eventId: number) {
    const event = this._events.find(
      (event) => event.objectId === eventId && event.checkTriggerHex(triggerHex)
    );
    if (event) {
      event.start(triggerHex);
      return true;
    }
    return false;
  }

  /**
   * 指定のトリガーでイベントを確認する
   * @param triggerHex
   * @returns
   */
  checkEventTrigger(triggerHex: number) {
    const events = this.getTriggerEvents(triggerHex);
    if (events.length > 0) {
      this._startEvent(events, triggerHex);
      return true;
    }

    return false;
  }

  /**
   * 起動イベントを取得する
   * @param triggerHex
   * @returns
   */
  getTriggerEvents(triggerHex: number) {
    const person = gameMarch.leader;
    if (person.ignoredEvents) {
      return [];
    }
    // 前方
    const frontTrigger = triggerHex & EEventTriggerHex.Front;
    if (frontTrigger) {
      const frontEvents = this._getFrontEvents(person, triggerHex);
      if (frontEvents.length > 0) {
        return frontEvents;
      }
    }

    // カウンター
    const counterTrigger = triggerHex & EEventTriggerHex.Counter;
    if (counterTrigger) {
      const counterEvents = this._getCounterEvents(person, triggerHex);
      if (counterEvents.length > 0) {
        return counterEvents;
      }
    }

    // その場
    const currentTrigger = triggerHex & EEventTriggerHex.Current;
    if (currentTrigger) {
      const currentEvents = this._getCurrentEvents(person, triggerHex);
      if (currentEvents.length > 0) {
        return currentEvents;
      }
    }
    return [];
  }

  /**
   * 前方のイベントを取得する
   * @param person
   * @returns
   */
  private _getFrontEvents(person: GamePerson, triggerHex: number) {
    // 前方
    const frontX = this.frontX(person.x, person.direction);
    const frontY = this.frontY(person.y, person.direction);
    // 前方から侵入不可か確認しているだけで現在位置から出られるかは
    // 確認していない
    const noTraffic = !this.passable(frontX, frontY, person.reverseDir());

    return this._events.filter((event) => {
      // 前方はキャラクターか通行不可かつ優先度1以上の範囲イベントが対象になる
      return (
        event.contact(frontX, frontY) &&
        (event.detectFront ||
          (noTraffic && (triggerHex & EEventTriggerHex.Front) > 0)) &&
        event.checkTriggerHex(triggerHex)
      );
    });
  }

  /**
   * カウンターごしのイベントを取得する
   * @param person
   * @returns
   */
  private _getCounterEvents(person: GamePerson, triggerHex: number) {
    // 前方
    const frontX = this.frontX(person.x, person.direction);
    const frontY = this.frontY(person.y, person.direction);

    if (!this.counter(frontX, frontY)) {
      return [];
    }
    // カウンターごし
    const counterX = this.frontX(frontX, person.direction);
    const counterY = this.frontY(frontY, person.direction);

    return this._events.filter((event) => {
      // カウンターはキャラクターだけが対象になる
      return (
        event.contact(counterX, counterY) &&
        event.objectPerson &&
        event.checkTriggerHex(triggerHex)
      );
    });
  }

  /**
   * その場のイベントを取得する
   * @param person
   * @returns
   */
  private _getCurrentEvents(person: GamePerson, triggerHex: number) {
    return this._events.filter((event) => {
      // その場は単純接触
      return (
        event.contact(person.x, person.y) && event.checkTriggerHex(triggerHex)
      );
    });
  }

  /**
   * イベントを開始する
   * @param events
   * @param triggerHex
   * @returns
   */
  private _startEvent(events: GameEvent[], triggerHex: number) {
    for (const event of events) {
      event.start(triggerHex);
    }
  }

  /**
   * 前方横位置を取得する
   * @param x
   * @param dir
   * @param distance
   * @returns
   */
  frontX(x: number, dir: number, distance = 1) {
    return x + GameCharacter.directionX(dir) * distance;
  }

  /**
   * 前方縦位置を取得する
   * @param y
   * @param dir
   * @param distance
   * @returns
   */
  frontY(y: number, dir: number, distance = 1) {
    return y + GameCharacter.directionY(dir) * distance;
  }

  /**
   * 通行判定
   * いずれかのレイヤーが不可かどうか
   * @param x
   * @param y
   */
  passable(x: number, y: number, dir = 0) {
    if (!this.valid(x, y)) {
      for (const tileData of this._layerOffData) {
        const tile = this._getTileByTileData(tileData);
        const collision4 = GameUtils.getCollision4(tile);
        if (collision4 & (1 << dir)) {
          return false;
        }
      }
      return true;
    }
    for (let i = 0; i < this._originalLayers.length; i++) {
      const tile = this._getTile(x, y, i);
      const collision4 = GameUtils.getCollision4(tile);
      if (collision4 & (1 << dir)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 乗り物に乗っている時の通行を判定する
   * @param x
   * @param y
   * @returns 0:乗っていない時と同じ 1:通行可 -1:通行不可
   */
  passInVehicle(x: number, y: number) {
    if (!this.driving) {
      return 0;
    }
    const vehicle = this._drivingVehicle;
    // 不可のほうが優先
    const terrainId = this.getTerrainId(x, y);
    if (vehicle.vehicle.impassableIds.includes(terrainId)) {
      return -1;
    }
    if (vehicle.vehicle.passableIds.includes(terrainId)) {
      return 1;
    }
    // どれにもあてはまらなければ変化なし
    return 0;
  }

  /**
   * 接触搭乗
   * 搭乗中完了したらdrivingをtrueにする
   * @param x
   * @param y
   * @returns
   */
  contactGetOn(x: number, y: number) {
    if (this.driving) {
      return;
    }
    const index = this._vehicles.findIndex(
      (value) => value.contact(x, y) && value.contactRide
    );
    if (index < 0) {
      return;
    }
    this._drivingIndex = index;
    this._vehicleGettingOn = true;

    return this._drivingVehicle;
  }

  /**
   * 接触降りる
   * @returns
   */
  contactGetOff() {
    if (!this.driving) {
      return false;
    }
    const vehicle = this._drivingVehicle;
    if (vehicle.contactRide) {
      vehicle.setDriving(false);
      vehicle.setDirection(gameMarch.leader.direction);
      this._vehicleGettingOff = true;
      gameMarch.gatherLeader();
      return true;
    } else {
      return false;
    }
  }

  /**
   * 縁かうー属性か
   * いずれかのレイヤーがカウンター属性かどうか
   * @param x
   * @param y
   */
  counter(x: number, y: number) {
    for (let i = 0; i < this._originalLayers.length; i++) {
      const tile = this._getTile(x, y, i);
      if (GameUtils.counterTile(tile)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 地形Idを取得
   * 上層が優先
   * @param x
   * @param y
   */
  getTerrainId(x: number, y: number): number {
    for (let i = this._originalLayers.length - 1; i >= 0; i--) {
      const tile = this._getTile(x, y, i);
      const terrainId = GameUtils.getTerrainId(tile);
      if (terrainId > 0) {
        return terrainId;
      }
    }
    return 0;
  }

  /**
   * 指定位置のタイルIdを取得
   * @param x
   * @param y
   * @param index
   * @returns
   */
  getTileId(x: number, y: number, index: number) {
    const tileData = this._getTileData(x, y, index);
    return GameUtils.getTileId(tileData);
  }

  /**
   * 指定位置のタイルを取得
   * @param x
   * @param y
   * @param index
   */
  private _getTile(x: number, y: number, index: number) {
    const tileData = this._getTileData(x, y, index);
    return this._getTileByTileData(tileData);
  }

  /**
   * タイルデータを取得
   * @param x
   * @param y
   * @param index
   */
  private _getTileData(x: number, y: number, index: number) {
    const pos = x + y * this._width + index * (this._width * this._height);
    return gameMapSight.layerData[pos];
  }

  /**
   * タイルをタイルデータから取得
   * @param tileData
   * @returns
   */
  private _getTileByTileData(tileData: number) {
    const [enable, tileId, tileIndex] = this._expandTileData(tileData);
    if (enable) {
      return this._tilesets[tileIndex].tiles[tileId];
    } else {
      return 0;
    }
  }

  /**
   * タイルデータを展開
   * @param tileData
   */
  private _expandTileData(tileData: number): [boolean, number, number] {
    return [
      GameUtils.enableTile(tileData),
      GameUtils.getTileId(tileData),
      GameUtils.getTileIndex(tileData),
    ];
  }

  /**
   * 現在エリアのエンカウントIdを取得する
   * @returns
   */
  getEncounterId() {
    const areas = this.getAreas(gameMarch.leader.x, gameMarch.leader.y);
    if (areas.length === 1) {
      return areas[0].encounterId;
    } else if (areas.length > 1) {
      const index = Utils.randomInt(0, areas.length);
      return areas[index].encounterId;
    }
    return this._encounterId;
  }

  /**
   * エンカウント率を取得する
   * @returns
   */
  getEncounterRateId() {
    return this.getEncounterOption()[EEncounterOption.Rate] ?? 0;
  }

  /**
   * エンカウントオプションを取得する
   * @returns
   */
  getEncounterOption() {
    return this._encounterOptionId > 0
      ? GameNumberList.get(this._encounterOptionId)
      : [];
  }

  /**
   * エンカウント属性を取得する
   * @returns
   */
  getEncounterElements() {
    const elementsId = this.getEncounterElementsId();
    return elementsId ? GameNumberList.get(elementsId) : [];
  }

  /**
   * エンカウント属性Idを取得する
   * @returns
   */
  getEncounterElementsId() {
    return this._encounterElementsId;
  }

  /**
   * マップに設定されている曲の演奏
   */
  playMusic() {
    const map = this.mapInfo;
    if (map.vehicleBgm && this.driving) {
      const vehicleBgm = this._drivingVehicle.bgmId;
      if (vehicleBgm) {
        GameMusic.play(vehicleBgm, true);
        return;
      }
    }
    if (gameMarch.leader.bgmId) {
      GameMusic.play(gameMarch.leader.bgmId, true);
      return;
    }
    if (map.autoBgm) {
      GameMusic.play(map.bgmId, true);
    }
  }

  /**
   * 乗り物の曲を演奏
   * @param bgmId
   */
  playVehicleMusic(bgmId: number) {
    if (this.mapInfo.vehicleBgm) {
      GameMusic.play(bgmId, true);
    } else {
      this.playMusic();
    }
  }

  /**
   * 対象キャラクターを取得する
   * @param targetId
   * @param self
   * @returns
   */
  getTargetCharacters(targetId: number): GamePerson[] {
    switch (GameCharacter.toTargetType(targetId)) {
      case ECharacterTargetType.Event:
        {
          const event = this.findCharacter(GameCharacter.toIndex(targetId));
          if (event) {
            return [event];
          }
        }
        return [];
      case ECharacterTargetType.Player:
        {
          const player = gameMarch.getPlayer(GameCharacter.toIndex(targetId));
          if (player) {
            return [player];
          }
        }
        return [];
      case ECharacterTargetType.March:
        return [gameMarch.leader, ...gameMarch.followers];
      default:
        return [];
    }
  }

  /**
   * 強制移動中かどうか
   * @returns
   */
  someForceMoving() {
    return (
      gameMarch.someForceMoving() ||
      this._characters.some((value) => value.forceMoving)
    );
  }

  /**
   * 次のトループIdを設定する
   * @param value
   */
  setNextTroopId(value: number) {
    this._nextTroopId = value;
  }

  /**
   * 敵戦闘効果を設定する
   * @param value
   */
  setEncounterEffectId(value: number) {
    this._encounterEffectId = value;
  }
}
