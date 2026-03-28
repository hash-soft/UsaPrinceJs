/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Eventset,
  TiledObjectProperty,
  EventScript,
  MapInfo,
} from './DataTypes';
import { Executor } from './Executor';
import {
  GameEvent,
  GameEventAuto,
  GameEventUtils,
  GamePerson,
  GameRangeEvent,
  GameTile,
} from './GameEvent';
import { EErrorMessage, GameUtils } from './GameUtils';
import Utils from './Utils';
import {
  commonScriptset,
  encounters,
  gameMapSight,
  gameMarch,
  gameParty,
  gameSystem,
  gameTemp,
  getTiledObjectProperty,
  system,
  troops,
} from './DataStore';
import {
  TiledLayer,
  TiledLayerObjectgroup,
  TiledLayerTilelayer,
  TiledMapOrthogonal,
  TiledTileset,
} from 'tiled-types/types';
import { GameRegion, GameRoom } from './GameMapParts';
import { SuspendObjectGameMapSight, Tileset } from './GameMapSight';
import {
  GameVehicle,
  SaveObjectGameVehicle,
  SuspendObjectGameVehicle,
} from './GameVehicle';
import { GameSound } from './AudioUtils';

interface CoverGroup {
  tileLayers: any[];
  roomGroup: any;
}

/**
 * マップクラスのセーブオブジェクト
 */
export interface SaveObjectGameMap {
  mapId: number;
  vehicles: SaveObjectGameVehicle[];
}

/**
 * マップクラスの中断オブジェクト
 */
export interface SuspendObjectGameMap {
  mapId: number;
  vehicles: SuspendObjectGameVehicle[];
  sight: SuspendObjectGameMapSight;
}

type ExtraProperty =
  | 'cover'
  | 'layers'
  | 'region'
  | 'areaId'
  | 'terrainIds'
  | 'defaultTerrainId';

/**
 * マップクラス
 */
export class GameMap {
  /**
   * マップ切替時のスクリプト実行
   */
  private _mountExecutor: Executor = new Executor(true);
  /**
   * マップ名
   */
  private _mapName: string = '';
  /**
   * イベントセット名
   */
  private _eventsetName: string = '';
  /**
   * スクリプトセット名
   */
  private _scriptsetName: string = '';
  /**
   * 読み込んだマップデータ
   */
  private _map: TiledMapOrthogonal = {
    orientation: 'orthogonal',
    renderorder: 'left-down',
    version: 0,
    width: 0,
    height: 0,
    tileheight: 0,
    tilewidth: 0,
    nextobjectid: 0,
    layers: [],
    tilesets: [],
  };
  /**
   * マップのカバーデータをレイヤーデータに変換したもの
   */
  private _coverData: Uint32Array = new Uint32Array(0);
  /**
   * マップのカバーデータ外のタイルIdをレイヤーごとに持つ配列
   */
  private _coverOffData: Uint32Array = new Uint32Array(0);

  /**
   * マップデータのタイルレイヤーを抽出したもの
   */
  private _tileLayers: TiledLayerTilelayer[] = [];
  /**
   * カバーグループを抽出したもの
   */
  private _coverGroup: CoverGroup = {
    tileLayers: [],
    roomGroup: { objects: [] },
  };
  /**
   * マップデータのオブジェクトグループを抽出したもの
   */
  private _objectgroups: TiledLayer[] = [];
  /**
   * オブジェクトグループからさらにイベントグループを抽出したもの
   * regonプロパティがないオブジェクト
   */
  private _eventgroups: TiledLayerObjectgroup[] = [];
  /**
   * オブジェクトグループからさらに領域グループを抽出したもの
   * reginプロパティがあるオブジェクト
   */
  private _regiongroups: TiledLayerObjectgroup[] = [];
  /**
   * 乗り物
   */
  private _vehicles: GameVehicle[] = this._createVehicles();
  /**
   * 読み込んだタイルセットデータのキャッシュ
   */
  private _tilesetsCache: Map<string, Tileset> = new Map();
  /**
   * 呼び出し歩行終了スクリプトId
   */
  private _callWalkEndScriptId: number = 0;

  /**
   * データから読み込み
   * mapIdは直接設定できないのでしない
   * @param data
   */
  load(data: SaveObjectGameMap) {
    if (data.vehicles) {
      for (const obj of data.vehicles) {
        // 存在するvehicleIdだけロードする
        this._vehicles
          .find((vehicle) => vehicle.vehicleId === obj.vehicleId)
          ?.load(obj);
      }
      for (const vehicle of this._vehicles) {
        vehicle.moveto(vehicle.x, vehicle.y);
      }
    }
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): SaveObjectGameMap {
    return {
      mapId: gameMapSight.mapId,
      vehicles: this._vehicles.map((v) => v.createSaveObject()),
    };
  }

  /**
   * 中断から読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameMap) {
    if (data.vehicles) {
      for (const obj of data.vehicles) {
        // 存在するvehicleIdだけロードする
        this._vehicles
          .find((vehicle) => vehicle.vehicleId === obj.vehicleId)
          ?.loadSuspend(obj);
      }
    }
    gameMapSight.loadSuspend(data.sight);
    // 参照が入っているだけなので抽出しなおす
    this._extractingVehicle(data.mapId);
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameMap {
    return {
      mapId: gameMapSight.mapId,
      vehicles: this._vehicles.map((v) => v.createSuspendObject()),
      sight: gameMapSight.createSuspendObject(),
    };
  }

  /**
   * マップデータを設定する
   * @param map
   */
  private _setMap(map: TiledMapOrthogonal) {
    this._map = map;
  }

  /**
   * 乗り物を作成する
   */
  private _createVehicles() {
    const vehicles: GameVehicle[] = [];
    for (let i = 1; i < system.vehicles.length; i++) {
      vehicles.push(new GameVehicle(i));
    }
    return vehicles;
  }

  /**
   * 乗り物を移動する
   * @param id
   * @param positionId
   * @param direction
   */
  moveVehicle(id: number, positionId: number, direction: number) {
    const vehicle = this._vehicles.find((v) => v.vehicleId === id);
    if (!vehicle) {
      return;
    }
    vehicle.setPosition(positionId);
    vehicle.setDirection(direction);
    // マップIdが現在のマップIdと同じ場合は再抽出
    if (vehicle.mapId === gameMapSight.mapId) {
      for (const vehicle of this._vehicles) {
        vehicle.refresh();
      }
      this._extractingVehicle(vehicle.mapId);
    }
  }

  /**
   * マップに設定されているタイルセット群
   */
  get mapTilesets() {
    return this._map.tilesets;
  }

  /**
   * カバーのレイヤーデータを取得
   */
  get coverData() {
    return this._coverData;
  }

  /**
   * カバー範囲外のレイヤーデータを取得
   */
  get coverOffData() {
    return this._coverOffData;
  }

  /**
   * タイルの横サイズを取得
   */
  get tileWidth() {
    return this._map.tilewidth;
  }

  /**
   * タイルの縦サイズを取得
   */
  get tileHeight() {
    return this._map.tileheight;
  }

  /**
   * マップファイルから読み込んだタイルデータ
   */
  get tileLayers() {
    return this._tileLayers;
  }

  /**
   * マップ名を取得
   */
  get mapName() {
    return this._mapName;
  }

  /**
   * loaderのタイルセット用キー名
   * map, eventとかぶることはない前提でファイル名をそのまま返す
   * @param name
   */
  private _tilesetKeyName(name: string) {
    return name;
  }

  /**
   * タイルセット情報を設定する
   * すでに読み込み済みのローダーから取得する
   */
  private _setTilesetsData(map: TiledMapOrthogonal) {
    // PIXIのキャッシュからは消さずに参照だけを更新する
    const tilesets = map.tilesets;

    const tilesetsData = tilesets.map((tileset) => {
      const source = tileset.source ?? '';
      const keyName = this._tilesetKeyName(source);
      // 読み込み後に行うのでundefinedのときはない前提
      const data = this._tilesetsCache.get(keyName) as Tileset;
      data.firstgid = tileset.firstgid;
      return data;
    });

    return tilesetsData;
  }

  /**
   * マップデータに関連づいているタイルセットがキャッシュされているか確認する
   * @param {tiledmapdata} map
   */
  private _checkTilemapCache(map: TiledMapOrthogonal) {
    // タイルセットを取得
    const tilesets = map.tilesets;

    // まだ読み込まれていないタイルセットをフィルター後
    // loaderに渡す情報を作成する
    const options = tilesets
      .filter((tileset) => {
        const keyName = this._tilesetKeyName(tileset.source ?? '');
        const resource = this._tilesetsCache.get(keyName);
        return resource === undefined;
      })
      .map((tileset) => {
        return {
          name: this._tilesetKeyName(tileset.source ?? ''),
          url: './assets/map/' + tileset.source,
        };
      });

    return options;
  }

  /**
   * オプションで指定したタイルセットを読み込む
   * @param {LoaderOptions} options
   */
  private _loadTilesets(options: Array<{ name: string; url: string }>) {
    // 読み込み完了保持
    const loaded = ((length) => {
      let count = 0;
      return {
        end: () => {
          count += 1;
          return count === length;
        },
      };
    })(options.length);

    return new Promise<Array<{ name: string; data: TiledTileset }>>(
      (resolve) => {
        const tilesets: Array<{ name: string; data: TiledTileset }> = [];
        options.forEach((option) => {
          GameUtils.loadMapFile(
            option.url,
            (data) => {
              tilesets.push({ name: option.name, data });
              if (loaded.end()) {
                // 全部終わった
                resolve(tilesets);
              }
            },
            (error) => {
              throw new Error(error);
            }
          );
        });
      }
    );
  }

  /**
   * マップデータに関連づいているタイルセットを取得する
   * 1.キャッシュされていないタイルセットを確認する
   * 2.キャッシュされていないタイルマップを読み込む
   * 3.タイルセットに変換しキャッシュに設定する
   * 4.タイルセットをキャッシュから取得する
   * @param map
   */
  private async _getTilesets(map: TiledMapOrthogonal): Promise<Tileset[]> {
    const options = this._checkTilemapCache(map);
    if (options.length !== 0) {
      const mapTilesets = await this._loadTilesets(options);

      mapTilesets.forEach((tileset) => {
        const data = tileset.data;
        const terrainIdsProperty = GameMap._getTiledExtraProperty(
          data,
          'terrainIds'
        ) as string;
        const terrainIds =
          terrainIdsProperty?.split(',').map((str) => parseInt(str, 10)) ?? [];

        // デフォルト地形を入れて初期化
        const defaultTerrainValue = GameUtils.terrainIdToTile(
          (GameMap._getTiledExtraProperty(
            data,
            'defaultTerrainId'
          ) as number) ?? 0
        );
        const tiles = new Uint32Array(data.tilecount).fill(defaultTerrainValue);

        // 地形を入れる
        terrainIds.forEach((terrainId, index) => {
          if (terrainId < 1) {
            return;
          }
          tiles[index] = GameUtils.terrainIdToTile(terrainId);
        });
        // オブジェクトを結合
        data.tiles?.forEach((tile) => {
          tiles[tile.id] |= GameUtils.tileObjectToTile(tile);
        });

        // キャッシュするタイルセットを作成
        // firstgidは取得時に都度設定する
        const destTileset: Tileset = {
          image: data.image ?? '',
          columns: data.columns,
          tileWidth: data.tilewidth,
          tileHeight: data.tileheight,
          firstgid: 1,
          tiles: tiles,
        };

        this._tilesetsCache.set(tileset.name, destTileset);
      });
    }
    return this._setTilesetsData(map);
  }

  /**
   * ファイルを読み込む
   * @param dirName
   * @param fileName
   */
  private _loadFile(dirName: string, fileName: string): any {
    return new Promise((resolve) => {
      const path = './assets/' + dirName + '/' + fileName + '.json';
      GameUtils.loadMapFile(
        path,
        (data) => {
          resolve(data);
        },
        () => {
          Utils.pushError(new Error(path));
        }
      );
    });
  }

  /**
   * マップファイルを読み込みデータを取得
   * @param mapName
   */
  private async _getMap(mapName: string): Promise<TiledMapOrthogonal> {
    if (this._mapName === mapName) {
      return this._map;
    }
    this._mapName = mapName;

    return this._loadFile('map', mapName);
  }

  /**
   * イベントセットファイルを読み込みデータを取得
   * マップデータに関連づいているイベントセットを取得する
   * メモリに残し続けないのでマップと同じ方式で読み込む
   * @param eventsetName
   */
  private async _getEventset(eventsetName: string) {
    const oldEventsetName = this._eventsetName;

    this._eventsetName = eventsetName;

    // イベントなし
    if (!eventsetName) {
      return { scriptsetName: '', objects: [] };
    }
    // すでに同じものが読み込まれている
    if (oldEventsetName === eventsetName) {
      return gameMapSight.eventset;
    }
    const eventset: Eventset = this._loadFile('eventsets', eventsetName);
    if (!eventset.moveRoutes) {
      eventset.moveRoutes = [];
    }

    return eventset;
  }

  /**
   * マップデータに関連づいているイベントを取得する
   * メモリに残し続けないのでマップと同じ方式で読み込む
   * @param scriptsetName
   */
  private async _getScriptset(scriptsetName: string) {
    const oldScriptsetName = this._scriptsetName;
    this._scriptsetName = scriptsetName;

    // スクリプトなし
    if (!scriptsetName) {
      return [];
    }
    // すでに同じものが読み込まれている
    if (oldScriptsetName === scriptsetName) {
      return gameMapSight.scriptset;
    }
    const events: EventScript[] = this._loadFile('scriptsets', scriptsetName);

    return events;
  }

  /**
   * イベントリフレッシュフラグを落とす
   */
  private _endRefreshEvent() {
    gameTemp.endRefreshEvent();
  }

  /**
   * オブジェクトを再設定する
   */
  resetObjects() {
    GameMap._resetMapData(gameMapSight.layerData, this._map, this._tileLayers);

    gameMapSight.eachEvents((event) => event.reset());
    gameTemp.requestRefreshEvent();
  }

  /**
   * 範囲オブジェクトを設定
   */
  private _setRangeObjects() {
    const tileWidth = this.tileWidth;
    const tileHeight = this.tileHeight;
    const regions = new Map();
    this._regiongroups.forEach((regiongroup) => {
      regiongroup.objects.forEach((object) => {
        const x = Math.floor(object.x / tileWidth);
        const y = Math.floor(object.y / tileWidth);
        const width = Math.floor(object.width / tileWidth);
        const height = Math.floor(object.height / tileHeight);
        const range = new GameRegion(
          x,
          y,
          width,
          height,
          GameMap._getTiledExtraProperty(object, 'areaId') as number
        );
        regions.set(object.type, range);
      });
    });
    gameMapSight.setRegions(regions);
  }

  /**
   * イベントオブジェクトを設定
   */
  private _setEventObjects() {
    const events: GameEvent[] = [];
    this._eventgroups.forEach((objectgroup, groupIndex) => {
      objectgroup.objects.forEach((object, index) => {
        const event = this._makeEventObject(object, index, groupIndex);
        if (event !== null) {
          events.push(event);
        }
      });
    });
    // 自動開始イベント
    gameMapSight.mapInfo.autoIds?.forEach((id) => {
      const event = gameMapSight.eventset.objects[id];
      if (!event) {
        return;
      }
      events.push(new GameEventAuto(id));
    });
    gameMapSight.setEvents(events);
    // // タイルを抜き出し
    // this._tiles = events.filter((value) => value.objectTile) as GameTile[];
    // gameMapSight.setEvents(events);
  }

  /**
   * イベントオブジェクトを作成する
   * @param object
   * @param objectIndex
   * @param layerId
   * @returns
   */
  private _makeEventObject(
    object,
    objectIndex: number,
    layerId: number
  ): GameEvent | null {
    const objectId = object.objectId;
    // イベント情報を探す
    const event = gameMapSight.eventset.objects[objectId];
    if (event === undefined) {
      return null;
    }
    switch (object.type) {
      case 'character':
        return new GamePerson(objectId, objectIndex, layerId);
      case 'tile':
        return new GameTile(objectId, objectIndex, layerId);
      case 'range':
        return new GameRangeEvent(objectId, objectIndex, layerId);
      default:
        return null;
    }
  }

  /**
   * 通常マップデータをレイヤーデータに変換
   * @param map
   */
  private _convertNormalMapData(map) {
    return this._convertMapData(map, this._tileLayers);
  }

  /**
   * 通常マップ外のタイルをレイヤーデータに変換
   * @param map
   */
  private _convertNormalOffMapData(map) {
    return this._convertOffMapData(map, this._tileLayers);
  }

  /**
   * カバーマップデータをレイヤーデータに変換
   * @param map
   * @param tilesetsData
   */
  private _convertCoverMapData(map) {
    if (this._coverGroup.tileLayers.length === 0) {
      return new Uint32Array();
    }
    return this._convertMapData(map, this._coverGroup.tileLayers);
  }

  /**
   * カバーマップ外のタイルをレイヤーデータに変換
   * @param map
   */
  private _convertCoverOffMapData(map) {
    if (this._coverGroup.tileLayers.length === 0) {
      const tileId = this._coverGroup.roomGroup.outgid;
      if (tileId == null) {
        return new Uint32Array();
      }
      const tileData = GameUtils.gidToTileData(tileId, map.tilesets);
      return new Uint32Array([tileData]);
    }
    return this._convertOffMapData(map, this._coverGroup.tileLayers);
  }

  /**
   * マップデータをレイヤーデータに変換
   * @param map
   * @param tilesetsData
   */
  private _convertMapData(map, layers) {
    const size = map.width * map.height;
    const destData = new Uint32Array(size * layers.length); // 面分

    GameMap._resetMapData(destData, map, layers);
    return destData;
  }

  /**
   * マップデータの再設定
   * @param destData
   * @param map
   * @param layers
   */
  private static _resetMapData(destData: Uint32Array, map, layers) {
    const size = map.width * map.height;
    for (let i = 0; i < layers.length; i++) {
      const layerData = layers[i].data;
      const addIndex = size * i;
      for (let mapId = 0; mapId < layerData.length; mapId++) {
        const tileId = layerData[mapId];
        const tileData = GameUtils.gidToTileData(tileId, map.tilesets);
        if (tileData === 0) {
          continue;
        }
        destData[mapId + addIndex] = tileData;
      }
    }
  }

  /**
   * マップ外のタイルをレイヤーデータに変換
   * @param map
   * @param layers
   */
  private _convertOffMapData(map, layers) {
    const destData = new Uint32Array(layers.length); // 面分

    for (let i = 0; i < layers.length; i++) {
      const tileId = layers[i].outgid || 0;
      const tileData = GameUtils.gidToTileData(tileId, map.tilesets);
      if (tileData === 0) {
        continue;
      }
      destData[i] = tileData;
    }
    return destData;
  }

  /**
   * 部屋データを配列に変換
   * @param map
   */
  private _convertRoomData(map) {
    if (this._coverGroup.roomGroup.objects.length === 0) {
      return new Uint8Array();
    }
    const rooms: GameRoom[] = this._coverGroup.roomGroup.objects.map((room) => {
      return new GameRoom(room.x, room.y, room.width, room.height, room.roomId);
    });
    const size = map.width * map.height;
    const roomData = new Uint8Array(size);
    const gRoom = getTiledObjectProperty('room') as TiledObjectProperty;
    for (let i = 0; i < size; i++) {
      const x = (i % map.width) * map.tilewidth;
      const y = Math.floor(i / map.width) * map.tileheight;
      const inRoom = rooms.find((room) => room.within(x, y));
      const roomId = inRoom ? (inRoom.roomId ?? gRoom.roomId) : 0;
      roomData[i] = GameUtils.createRoomData(roomId);
    }
    return roomData;
  }

  /**
   * 次のマップIdからマップを取得し設定する
   */
  async setup() {
    gameMapSight.setup();
    await this.loadMapData(gameMapSight.mapInfo);
    // イベント
    // 不正タイプのイベントは作成しないためforEachを使用する
    this._setEventObjects();
    this._endRefreshEvent();

    return true;
  }

  /**
   * マップデータを読み込む
   * 1.マップを読み込む
   * 2.イベントを読み込む
   * 3.スクリプトを読み込む
   * 4.タイルセットを取得する
   * @returns
   */
  async loadMapData(mapInfo: MapInfo) {
    // マップ
    const map = await this._getMap(mapInfo.map);
    this._setMap(map);
    this._tileLayers = map.layers.filter(
      (value) =>
        value.type === 'tilelayer' &&
        !GameMap._getTiledExtraProperty(value, 'cover')
    ) as TiledLayerTilelayer[];
    this._fetchCoverGroup(map);
    this._fetchObjectGroup(map);

    // イベント
    const eventset = await this._getEventset(mapInfo.eventset);
    const scriptset = await this._getScriptset(mapInfo.scriptset);
    gameMapSight.setEventData(
      this._eventgroups.map((value) => value.objects),
      eventset,
      scriptset
    );

    // タイルセット
    gameMapSight.setTilesets(await this._getTilesets(map));

    // マップデータを作成する
    // もともとのデータは下面と上面なので
    // 下層と上層に変換する
    // ファイルを読み込む時間に比べれば僅かなので時間は気にしない
    gameMapSight.setSize(map.width, map.height);
    gameMapSight.setLayers(
      this._tileLayers.map((value) => value.data as number[]),
      this._convertNormalMapData(map),
      this._convertNormalOffMapData(map)
    );

    this._coverData = this._convertCoverMapData(map);
    this._coverOffData = this._convertCoverOffMapData(map);
    gameMapSight.setRoomData(this._convertRoomData(map));

    // 乗り物
    for (const vehicle of this._vehicles) {
      vehicle.moveToWarpPosition();
    }
    this._extractingVehicle(mapInfo.id);

    // イベントから参照するため範囲を先に作成する
    this._setRangeObjects();

    return true;
  }

  /**
   * 乗り物のワープ位置を設定する
   * @param vehicleId
   * @param positionId
   */
  setVehicleWarpPosition(vehicleId: number, positionId: number) {
    this._vehicles[vehicleId - 1].setWarpPositionId(positionId);
  }

  /**
   * 乗り物を取得する
   * @param vehicleId
   * @returns
   */
  getVehicle(vehicleId: number) {
    return this._vehicles[vehicleId - 1];
  }

  /**
   * 乗り物の抽出
   */
  private _extractingVehicle(mapId: number) {
    gameMapSight.setVehicles(
      this._vehicles.filter((value) => value.mapId === mapId)
    );
  }

  /**
   * TiledMapEditorの追加プロパティを取得する
   * @param tiled
   * @returns
   */
  private static _getTiledExtraProperty<T>(
    tiled: T,
    name: ExtraProperty
  ): unknown {
    return tiled[name];
  }

  /**
   * カバーグループの取り出し
   * @param map
   */
  private _fetchCoverGroup(map: TiledMapOrthogonal) {
    const layer = map.layers.find(
      (layer) =>
        layer.type === 'group' && GameMap._getTiledExtraProperty(layer, 'cover')
    );
    if (!layer) {
      // なければ初期化する
      this._coverGroup = { tileLayers: [], roomGroup: { objects: [] } };
      return;
    }
    const innerLayers = GameMap._getTiledExtraProperty(
      layer,
      'layers'
    ) as TiledLayer[];
    this._coverGroup.tileLayers = innerLayers.filter(
      (layer) => layer.type === 'tilelayer'
    );
    this._coverGroup.roomGroup = innerLayers.find(
      (layer) => layer.type === 'objectgroup'
    );
  }

  /**
   * オブジェクトグループの取り出し
   * @param map
   */
  private _fetchObjectGroup(map: TiledMapOrthogonal) {
    this._objectgroups = map.layers.filter(
      (value) => value.type === 'objectgroup'
    );
    // さらにイベントと範囲に分ける
    this._eventgroups = this._objectgroups.filter((value) => {
      return !GameMap._getTiledExtraProperty(value, 'region');
    }) as TiledLayerObjectgroup[];
    this._regiongroups = this._objectgroups.filter((value) => {
      return !!GameMap._getTiledExtraProperty(value, 'region');
    }) as TiledLayerObjectgroup[];
  }

  /**
   * 更新
   */
  update() {
    gameMapSight.update();
    this._updateMap();
  }

  /**
   * マップ開始時のイベントを設定
   * @returns
   */
  setStartupEvent() {
    const startupId = gameMapSight.mapInfo?.startupId;
    if (!startupId) {
      return;
    }
    const event = gameMapSight.scriptset[startupId];
    this._mountExecutor.setup(event.list, null);
  }

  /**
   * マップ終了時のイベントを設定
   * マップに設定されている分とイベントで設定された２つがある
   */
  setCleanupEvent() {
    if (gameTemp.transferGetOut) {
      // 関数名と役割が違うが新しい関数を作るのが面倒なので妥協する
      gameMapSight.vehicleGetOut();
      gameTemp.setTransferGetOut(false);
    }
    const cleanupId = gameMapSight.mapInfo?.cleanupId;
    if (cleanupId > 0) {
      const event = gameMapSight.scriptset[cleanupId];
      this._mountExecutor.setup(event.list, null);
    }
    if (gameTemp.transferCleanupId > 0) {
      const event = commonScriptset[gameTemp.transferCleanupId];
      this._mountExecutor.pushQueue(event);
    }
    // イベント設定分は毎回消す
    gameTemp.setTransferCleanupId(0);
  }

  /**
   * マップ切替時のスクリプト実行中かどうか
   * @returns
   */
  runningMount() {
    return this._mountExecutor.running();
  }

  /**
   * マップ切替時のスクリプト実行
   */
  updateMount() {
    this._mountExecutor.update();
  }

  /**
   * マップを更新する
   */
  private _updateMap() {
    // 部屋移動中
    if (gameTemp.changeRoom) {
      return;
    }
    if (gameMapSight.vehicleGettingOn) {
      return;
    }
    this.updateScript();
  }

  /**
   * スクリプトの更新
   * 実行予約がありスクリプト実行中でなければすぐさま設定する
   * @returns
   */
  updateScript() {
    const executor = gameSystem.mapExecutor;
    for (;;) {
      executor.update();
      if (executor.running()) {
        return;
      }
      if (this._setupScript()) {
        continue;
      }
      if (gameMapSight.needTransfer() || this._checkEncounter()) {
        return;
      }
      this._updateMoveDamage();
      if (this._setupWalkDownScript() || this._setupFinishedAdjustScript()) {
        continue;
      }
      if (this._setupWalkEndScript()) {
        continue;
      }
      if (this._setupMultiScript() || this._setupMenuScript()) {
        continue;
      }
      break;
    }
    executor.setupEndCheckCommand();
    executor.update();
  }

  /**
   * スクリプトを設定する
   * @returns
   */
  private _setupScript() {
    gameMapSight.needsRefresh();
    if (this._setupCommonScript()) {
      return true;
    }
    if (this._setupMapScript()) {
      return true;
    }
    if (this._setupAutoCommonScript()) {
      return true;
    }
    return false;
  }

  /**
   * 予約している共通スクリプトを設定する
   */
  private _setupCommonScript() {
    const info = gameTemp.shiftScript();
    if (!info) {
      return false;
    }
    const script =
      info.kind === 0
        ? commonScriptset[info.id]
        : gameMapSight.scriptset[info.id];
    if (script === undefined) {
      throw new Error(EErrorMessage.OutrangeScript);
    }
    info.callFn?.();
    gameSystem.mapExecutor.setup(script.list, null);
    return true;
  }

  /**
   * マップスクリプトを設定する
   */
  private _setupMapScript() {
    const event = gameMapSight.findStartingEvent();
    if (event) {
      event.clearStarting();
      // 実行イベントを設定
      gameSystem.mapExecutor.setup(event.list, event);
      // 実行中のチェック、キャラクターの場合は
      // プレイヤーの方向を向く処理も兼ねている
      event.lock();
      return true;
    }
    return false;
  }

  /**
   * 自動実行スクリプトを設定する
   */
  private _setupAutoCommonScript() {
    for (const script of gameSystem.autoScripts) {
      if (!GameEventUtils.checkConditions(script.conditions)) {
        continue;
      }
      gameSystem.mapExecutor.setup(script.list, null);
      return true;
    }
    return false;
  }

  /**
   * エンカウントを更新する
   * @returns
   */
  private _checkEncounter() {
    if (gameMapSight.nextTroopId > 0) {
      return true;
    }
    if (!gameMarch.leader.encounterCalling) {
      return false;
    }
    gameMarch.leader.clearEncounterCalling();
    if (!gameMapSight.allowBattle()) {
      return false;
    }

    const troopId = this.decideTroopId();
    if (!troopId) {
      return false;
    }
    if (this._evasionEncounterTroop(troopId)) {
      return false;
    }
    gameMapSight.setNextTroopId(troopId);
    gameMapSight.setEncounterEffectId(gameSystem.encounterEffectId);
    // 戦闘背景
    gameMapSight.setBattleBackNameByPosition(
      gameMarch.leader.x,
      gameMarch.leader.y
    );
    gameTemp.resetBattleOptions();

    return true;
  }

  /**
   * 敵の群れIdを決定する
   * @returns
   */
  decideTroopId() {
    const encounterId = gameMapSight.getEncounterId();
    if (!encounterId) {
      return 0;
    }
    return this.decideTroopIdByEncounterId(encounterId);
  }

  /**
   * エンカウンターIdを指定してトループIdを決定する
   * @param encounterId
   * @returns
   */
  decideTroopIdByEncounterId(encounterId: number) {
    const encounter = encounters[encounterId];
    if (encounter.troops.length === 0) {
      return 0;
    }
    const priorities = encounter.troops.map((troop) => troop.priority);
    const index = Utils.roulette(priorities);
    return encounter.troops[index].id;
  }

  /**
   * 指定トループに対するエンカウントを回避したかどうか
   * @param troopId
   * @returns
   */
  private _evasionEncounterTroop(troopId: number) {
    const ids = gameMapSight.getEncounterElements();
    const troopLv = troops[troopId].lv;
    return gameParty.evasionEncounter(ids, troopLv);
  }

  /**
   * 移動ダメージを更新する
   * @returns
   */
  private _updateMoveDamage() {
    if (!gameMarch.leader.moveDamageCalling) {
      return false;
    }
    gameMarch.executeMoveDamage();
    gameMarch.refresh();

    gameMarch.clearMoveDamageCalling();
    this._callWalkEndScriptId = GameUtils.getCommonScriptId('walkEnd');
  }

  /**
   * 移動で倒れたときのスクリプトを設定する
   * @returns
   */
  private _setupWalkDownScript() {
    for (const member of gameParty.members) {
      if (member.moveDown) {
        member.setMoveDown(false);
        GameUtils.setSlotActorName(member.name);
        gameSystem.mapExecutor.setup(
          GameUtils.getSpecialScript('walkDown').list,
          null
        );
        return true;
      }
    }
    return false;
  }

  /**
   * 移動が終わった後のスクリプトを設定する
   */
  private _setupWalkEndScript() {
    const id = this._callWalkEndScriptId;
    if (id) {
      gameSystem.mapExecutor.setup(commonScriptset[id].list, null);
      this._callWalkEndScriptId = 0;
      return true;
    }
    return false;
  }

  /**
   * 調整終了時のスクリプトを設定する
   * @returns
   */
  private _setupFinishedAdjustScript() {
    for (const id of gameMapSight.getEncounterElements()) {
      const scriptId = gameParty.deleteFinishedEncounterAdjust(id);
      if (scriptId) {
        gameSystem.mapExecutor.setup(commonScriptset[scriptId].list, null);
        return true;
      }
    }
    return false;
  }

  /**
   * 便利ボタンスクリプトを設定する
   * @returns
   */
  private _setupMultiScript() {
    if (!gameMapSight.allowMulti()) {
      return false;
    }
    if (gameMarch.multiCalling) {
      gameMarch.clearMultiCalling();
      gameMapSight.checkEventDecide();
      return true;
    }

    return false;
  }

  /**
   * メニュースクリプトを設定する
   */
  private _setupMenuScript() {
    if (!gameMapSight.allowMenu()) {
      return false;
    }
    if (gameMarch.menuCalling) {
      gameMarch.clearMenuCalling();
      GameSound.playDecide();
      gameSystem.mapExecutor.setup(
        GameUtils.getSpecialScript('callMenu').list,
        null
      );
      return true;
    }
    if (gameTemp.debugCalling) {
      gameTemp.clearDebugCalling();
      GameSound.playDecide();
      gameSystem.mapExecutor.setup(
        GameUtils.getSpecialScript('callDebug').list,
        null
      );
      return true;
    }
    return false;
  }

  /**
   * 現在のマップを終了する
   * @returns true:再構築必要 false:再構築不要
   */
  terminateCurrentMap() {
    if (!gameMapSight.transit) {
      throw Error(EErrorMessage.NoMove);
    }

    // 別のマップに移動（場所移動）
    // comeback時にtransfer()が呼ばれることはないのでチェックしない
    if (gameMapSight.nextMove) {
      this.setCleanupEvent();
      this._cleanupCalling();
      return true;
    } else {
      // 同一マップ（位置設定）
      return false;
    }
  }

  /**
   * 呼び出し予約を消去する
   */
  private _cleanupCalling() {
    gameMarch.clearMoveDamageCalling();
    gameMarch.leader.clearEncounterCalling();
    gameParty.resetSlipSteps();
    this._callWalkEndScriptId = 0;
  }
}
