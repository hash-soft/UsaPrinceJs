import { GameSound } from './AudioUtils';
import {
  ActionParts,
  Effect,
  Encounter,
  Enemy,
  EventScript,
  GameFont,
  Item,
  ItemParts,
  MapInfo,
  MapPart,
  Member,
  MemberParts,
  Skill,
  StateParts,
  System,
  Terrain,
  TiledObjectProperty,
  TiledObjectType,
  Troop,
  WindowData,
  WindowSet,
} from './DataTypes';
import {
  setActionParts,
  setAnimations,
  setCommonScriptset,
  setEncounters,
  setEnemies,
  setItemParts,
  setItems,
  setMapList,
  setMapParts,
  setMemberParts,
  setMembers,
  setObjectTypes,
  setSkills,
  setStateParts,
  setSystem,
  setTerrains,
  setTroops,
  setWindows,
  setWindowsets,
  system,
  fileSettings,
} from './DataStore';
import { GameUtils } from './GameUtils';
import { SceneBase } from './SceneBase';
import Utils from './Utils';
import { WindowFrame } from './WindowBase';

/**
 * 起動シーン
 */
export class SceneBoot extends SceneBase {
  /**
   * 読み込みカウント
   */
  private _loadCount: number;
  /**
   * コンストラクタ
   */
  constructor() {
    super();
    this._loadCount = 0;
  }

  /**
   * 読み込み最大数
   */
  private get _maxLoad() {
    return 3;
  }

  /**
   * 作成
   */
  create() {
    super.changeWait();

    this._loadWindowTexture();
    this._loadDatabase();
    this._loadObjectTypes();
  }

  /**
   * ウィンドウテクスチャをロード
   */
  private _loadWindowTexture() {
    WindowFrame.loadWindowTexture(() => {
      this._loaded();
    });
  }

  /**
   * データベースをロード
   */
  private _loadDatabase() {
    Promise.all(
      fileSettings.keys.map((key) =>
        fetch(`${fileSettings.baseUrl}${key}${fileSettings.extension}`)
          .then((res) => this._toKeySet(key, res))
          .catch(() => {
            return { key, json: null };
          })
      )
    )
      .then((results) => {
        for (const result of results) {
          this._setLoadedJson(result);
        }
        this._loadAfterLoadingDatabase()
          .then(() => {
            this._loaded();
          })
          .catch((e) => Utils.pushError(new Error(`${e}`)));
      })
      .catch((e) => Utils.pushError(new Error(`${e}`)));
  }

  /**
   * キーセットに変換する
   * @param key
   * @param res
   * @returns
   */
  private async _toKeySet(
    key: string,
    res: Response
  ): Promise<{ key: string; json: unknown }> {
    if (res.status >= 400) {
      return { key, json: null };
    }
    const json = await res.json();
    return { key, json };
  }

  /**
   * 読み込んだjsonデータを設定する
   * @param result
   */
  private _setLoadedJson(result: { key: string; json: unknown }) {
    const json = result.json;
    if (json === null) {
      throw new Error(`failed fetch ${result.key}`);
    }
    switch (result.key) {
      case 'system':
        setSystem(json as System);
        break;
      case 'memberParts':
        setMemberParts(json as MemberParts);
        break;
      case 'members':
        setMembers(json as Member[]);
        break;
      case 'actionParts':
        setActionParts(json as ActionParts);
        break;
      case 'items':
        setItems(json as Item[]);
        break;
      case 'itemParts':
        setItemParts(json as ItemParts);
        break;
      case 'skills':
        setSkills(json as Skill[]);
        break;
      case 'stateParts':
        setStateParts(json as StateParts);
        break;
      case 'terrains':
        setTerrains(json as Terrain[]);
        break;
      case 'enemies':
        setEnemies(json as Enemy[]);
        break;
      case 'troops':
        setTroops(json as Troop[]);
        break;
      case 'encounters':
        setEncounters(json as Encounter[]);
        break;
      case 'animations':
        setAnimations(json as Effect[]);
        break;
      case 'windows':
        setWindows(json as WindowData[]);
        break;
      case 'windowsets':
        setWindowsets(json as WindowSet[]);
        break;
      case 'mapList':
        setMapList(json as MapInfo[]);
        break;
      case 'commonScriptset':
        setCommonScriptset(json as EventScript[]);
        break;
      default:
        break;
    }
  }

  /**
   * データベース読み込み後のロード
   */
  private async _loadAfterLoadingDatabase() {
    // サウンドデータが必要なので読み込み後になる
    GameSound.loadSystemSound();

    const systemFonts: GameFont[] = system.fonts.slice(1);
    const fonts = await Promise.all(
      this._loadFontFacesAsync(systemFonts)
    ).catch((e) => {
      Utils.pushError(new Error(e as string));
    });
    for (const font of fonts as FontFace[]) {
      document.fonts.add(font);
    }
    const mapPartsPromise: unknown[] = [];
    for (const name of system.mapPartsNames) {
      const url = './assets/map/' + name;
      mapPartsPromise.push(this._loadMapPartsAsync(url));
    }
    const data = await Promise.all(mapPartsPromise).catch((e) => {
      Utils.pushError(new Error(e as string));
    });
    setMapParts(this._convertMapParts(data));
  }

  /**
   * マップパーツを非同期でロード
   * @param url
   * @returns
   */
  private _loadMapPartsAsync(url: string) {
    return new Promise<string>((resolve, reject) => {
      GameUtils.loadMapFile(
        url,
        (data) => {
          resolve(data);
        },
        () => {
          reject(url);
        }
      );
    });
  }

  /**
   * マップパーツを変換する
   * @param data
   * @returns
   */
  private _convertMapParts(data) {
    const mapParts = [];
    for (const loadData of data) {
      const converter = new MapPartsConverter(loadData);
      converter.setParts(mapParts);
    }
    return mapParts;
  }

  /**
   * tiledmapeditorの定義ファイルをロード
   */
  private _loadObjectTypes() {
    const url = './assets/tilesets/objecttypes.json';
    GameUtils.loadObjectTypesFile(
      url,
      (data: TiledObjectType[]) => {
        const types: Array<[string, TiledObjectProperty]> = data.map((item) => [
          item.name,
          item.properties,
        ]);
        setObjectTypes(new Map(types));
        this._loaded();
      },
      () => {
        Utils.pushError(new Error(url));
      }
    );
  }

  /**
   * @description
   *   fontFaceをロードする
   *   fetchでfontをDLし、arrayBufferをFontFaceに渡す
   *   load()でfontFaceをロードするPromiseを返す
   *   FontFaceにurlを指定する方法だとネットワーク未接続時に
   *   Slow network is detected.
   *   のログが出てしまうためfetchでfontをDLするという面倒なことをしている
   * @param systemFonts {GameFont[]} システムのフォント情報
   * @return {Promise<FontFace>[]} fontFaceのPromiseの配列
   */
  private _loadFontFacesAsync(systemFonts: GameFont[]): Promise<FontFace>[] {
    return systemFonts.map((font) =>
      fetch(`./assets/fonts/${font.filename}`)
        .then((res) => res.arrayBuffer())
        .then((source) => {
          const fontFace = new FontFace(font.name, source);
          return fontFace.load();
        })
    );
  }

  /**
   * ロード完了
   */
  private _loaded() {
    this._loadCount += 1;
    if (this._loadCount >= this._maxLoad) {
      super.changeUpdate(false);
    }
  }

  /**
   * 更新
   */
  update() {
    super.changeScene('title');
  }
}

/**
 * マップパーツ変換クラス
 */
class MapPartsConverter {
  private _width: number;
  private _layers: number[][];
  private _objectsList: Array<
    Array<{
      rectId: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  >;

  /**
   * コンストラクタ
   * @param data
   */
  constructor(data) {
    this._convert(data);
  }

  /**
   * 読み込んだデータを設定しやすいように変換
   * @param data
   */
  private _convert(data) {
    this._width = data.width;
    this._layers = data.layers
      .filter((layer) => layer.type === 'tilelayer')
      .map((layer) => layer.data);
    this._objectsList = data.layers
      .filter((layer) => layer.type === 'objectgroup')
      .map((layer) => layer.objects);
  }

  /**
   * パーツを設定
   * @param parts
   */
  setParts(parts: MapPart[]) {
    for (const objects of this._objectsList) {
      for (const object of objects) {
        if (object.rectId <= 0) {
          continue;
        }
        const sizeX = Math.floor(object.width / 32);
        const sizeY = Math.floor(object.height / 32);
        const layers = this._layers.map((layer) => {
          const x = Math.floor(object.x / 32);
          const y = Math.floor(object.y / 32);
          const layerPart: number[] = [];
          for (let y1 = y; y1 < sizeY + y; y1++) {
            for (let x1 = x; x1 < sizeX + x; x1++) {
              const index = y1 * this._width + x1;
              layerPart.push(layer[index]);
            }
          }
          return layerPart;
        });
        parts[object.rectId] = { sizeX, sizeY, layers };
      }
    }
  }
}
