import { gameFlags, gameMapSight, system } from './DataStore';
import { GameCharacter, SaveObjectGameCharacter } from './GameCharacter';
import { GamePerson, SuspendObjectGamePerson } from './GameEvent';

/**
 * 乗り物クラスのセーブオブジェクト
 */
export interface SaveObjectGameVehicle extends SaveObjectGameCharacter {
  vehicleId: number;
  mapId: number;
  driving: boolean;
  warpPositionId: number;
}

/**
 * 乗り物クラスの中断オブジェクト
 */
export interface SuspendObjectGameVehicle extends SuspendObjectGamePerson {
  vehicleId: number;
  mapId: number;
  driving: boolean;
  warpPositionId: number;
}

/**
 * 乗り物クラス
 */
export class GameVehicle extends GamePerson {
  /**
   * 所在マップId
   */
  private _mapId: number = 0;
  /**
   * 運転中
   */
  private _driving: boolean = false;
  /**
   * ワープする位置Id
   */
  private _warpPositionId: number = 0;

  /**
   * コンストラクタ
   * @param objectId 乗り物Id
   */
  constructor(private _vehicleId: number) {
    super(0, -1, -1);
    this._setInitialImage();
    this.setPosition(this.vehicle.positionId);
  }

  /**
   * 再設定
   */
  override reset(): void {
    super.reset();
    this._mapId = 0;
    this._driving = false;
    this._warpPositionId = 0;
    this._setInitialImage();
    this.setPosition(this.vehicle.positionId);
  }

  /**
   * データから読み込み
   * @param data
   */
  override load(data: SaveObjectGameVehicle) {
    super.load(data);
    this._vehicleId = data.vehicleId ?? this._vehicleId;
    this._mapId = data.mapId ?? this._mapId;
    this._driving = data.driving ?? this._driving;
    this._warpPositionId = data.warpPositionId ?? this._warpPositionId;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  override createSaveObject(): SaveObjectGameVehicle {
    const object: SaveObjectGameVehicle = {
      ...super.createSaveObject(),
      vehicleId: this._vehicleId,
      mapId: this._mapId,
      driving: this._driving,
      warpPositionId: this._warpPositionId,
    };
    return object;
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  loadSuspend(data: SuspendObjectGameVehicle) {
    super.loadSuspend(data);
    this._vehicleId = data.vehicleId ?? this._vehicleId;
    this._mapId = data.mapId ?? this._mapId;
    this._driving = data.driving ?? this._driving;
    this._warpPositionId = data.warpPositionId ?? this._warpPositionId;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameVehicle {
    return {
      ...super.createSuspendObject(),
      vehicleId: this._vehicleId,
      mapId: this._mapId,
      driving: this._driving,
      warpPositionId: this._warpPositionId,
    };
  }

  /**
   * 乗り物Idを取得する
   */
  get vehicleId() {
    return this._vehicleId;
  }

  /**
   * 乗り物オブジェクトを取得する
   */
  get vehicle() {
    return system.vehicles[this._vehicleId];
  }

  /**
   * 所在マップIdを取得する
   */
  get mapId() {
    return this._mapId;
  }

  /**
   * 運転中かどうかを返す
   */
  get driving() {
    return this._driving;
  }

  /**
   * 接触で乗り込めるか
   */
  get contactRide() {
    return this.vehicle.type === 0;
  }

  /**
   * 集合タイプを取得する
   */
  get gatherType() {
    return this.vehicle.gatherType;
  }

  /**
   * 乗り物のBGMを取得する
   */
  get bgmId() {
    return this.vehicle.bgmId;
  }

  /**
   * 初期位置設定のオーバーライド
   * イベントの設定はないのでなにもしない
   */
  protected override _setInitialPosition() {}

  /**
   * 初期画像を設定する
   */
  private _setInitialImage() {
    const vehicle = this.vehicle;
    this.setImage(vehicle.imageId, vehicle.imageIndex);
  }

  /**
   * 再構築
   */
  override refresh() {
    const currentMapId = gameMapSight.mapId;
    if (currentMapId === this.mapId) {
      const { imageId, imageIndex } = this.vehicle;
      this.setImage(imageId, imageIndex);
    } else {
      this.setImage(0, 0);
    }
  }

  /**
   * 所在マップIdを設定する
   * @param value
   */
  setMapId(value: number) {
    this._mapId = value;
  }

  /**
   * 運転中かどうかを設定する
   * @param value
   */
  setDriving(value: boolean) {
    this._driving = value;
  }

  /**
   * ワープ位置Idを設定する
   * @param value
   */
  setWarpPositionId(value: number) {
    if (gameFlags.getValue(this.vehicle.warpFlagId)) {
      this._warpPositionId = value;
    } else {
      this._warpPositionId = 0;
    }
  }

  /**
   * ワープ位置に移動する
   */
  moveToWarpPosition() {
    if (this._driving) {
      return;
    }
    if (this._warpPositionId > 0) {
      this.setPosition(this._warpPositionId);
      this.setDirection(this.vehicle.warpDirection);
      this._warpPositionId = 0;
    }
  }

  /**
   * 位置を設定する
   * @param positionId
   */
  setPosition(positionId: number) {
    const position = system.positions[positionId];
    if (position) {
      this.setMapId(position.mapId);
      this.moveto(position.x, position.y);
    }
  }

  /**
   * 乗り込んだ
   */
  getOn(direction: number) {
    this.setDirection(direction);
  }

  /**
   * 降りた
   */
  getOff(direction: number) {
    this.setDirection(direction);
  }

  /**
   * 指定のキャラと同期する
   * @param character
   */
  sync(character: GameCharacter) {
    this.copyPosition(character);
  }

  /**
   * 移動の更新
   * 乗車中は自分で移動しない
   */
  override updateMove() {
    if (this._driving) {
      return;
    }
    super.updateMove();
  }
}
