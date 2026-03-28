import { EShakeType, MoveRoute, MoveRouteCommand } from './DataTypes';
import {
  gameMapSight,
  gameMenus,
  gameScreen,
  gameSystem,
  gameTemp,
  system,
} from './DataStore';
import { ECharacter, EMap, EMapScale } from './GameConfig';
import { GameMaterial } from './GameMaterial';
import { GameRate, GameUtils } from './GameUtils';
import { getSlotNumber, setSlot } from './DataUtils';
import { GameSound } from './AudioUtils';

/**
 * キャラクターId構築値
 * イベントはindex = objectId
 * Index > 10bit 1024 0x3FF
 * type > 3bit 8 0x1C00 >> 10
 * 例：先頭プレイヤー 1024
 *    隊列全部 2048
 */
const enum ECharacterId {
  IndexMask = 0x3ff,
  TypeMask = 0x1c00,
  typeShift = 10,
}

export const enum ECharacterTargetType {
  Event,
  Player,
  March,
}

/**
 * 方向列挙体
 */
export const enum EDirection {
  Down,
  Left,
  Right,
  Up,
  Start = Down,
  End = Up,
}

/**
 * 移動ルート列挙体
 */
const enum EMoveRouteCode {
  // 移動
  MoveLeft = 1,
  MoveUp,
  MoveRight,
  MoveDown,
  MoveForward,
  WaitOne = 10,
  MoveLeftOne = 11,
  MoveUpOne,
  MoveRightOne,
  MoveDownOne,
  // 待機
  Wait = 15,
  // 画面位置まで移動
  MoveScreenX = 16,
  MoveScreenY,
  MoveMapX = 18,
  MoveMapY,
  // ジャンプ
  Jump = 20,
  // 向き
  TurnLeft = 21,
  TurnUp,
  TurnRight,
  TurnDown,
  TurnRight90,
  TurnLeft90,
  Turn180,
  TurnPlayer,
  // システム
  ChangeSpeed = 31,
  ChangePriority,
  // 動作
  DirectionFixOff = 41,
  DirectionFixOn,
  StepAnimeOff,
  StepAnimeOn,
  ThroughOn,
  ThroughOff,
  IgnoredEventsOn,
  IgnoredEventsOff,
  TransparentOn,
  TransparentOff,
  // 足踏み
  Step = 51,
  // 表示
  ChangeImage = 52,
  // グローバル
  OperateSlot = 61, // スロット操作
  StartRoute, // 移動ルート開始
  PlaySe,
}

/**
 * 移動ルート情報
 */
interface MoveRouteInfo {
  data: MoveRoute;
  index: number;
  stopThreshold: number;
  repeater: MoveRouteRepeater | null;
  redoCommand: MoveRouteCommand | null;
}

interface MoveRouteRepeater {
  count: number;
  command: MoveRouteCommand;
}

/**
 * キャラクタークラスのセーブオブジェクト
 */
export interface SaveObjectGameCharacter {
  x: number;
  y: number;
  direction: number;
  through: boolean;
  ignoredEvents: boolean;
  directionFix: boolean;
  transparent: boolean;
}

/**
 * キャラクタークラスの中断オブジェクト
 */
export interface SuspendObjectGameCharacter extends SaveObjectGameCharacter {
  realX: number;
  realY: number;
  jumpCount: number;
  jumpPeak: number;
  jumpHalf: number;
  jumpDirection: number;
  moveSpeed: number;
  stopThreshold: number;
  priority: number;
  characterName: string;
  charasetId: number;
  characterIndex: number;
  characterWidth: number;
  characterHeight: number;
  characterColumns: number;
  characterHitScale: number;
  characterPatternMax: number;
  characterPatternList: number[];
  direction: number;
  animeCount: number;
  stopCount: number;
  stepAnime: boolean;
  moveSuccess: boolean;
  moveRoute: MoveRouteInfo;
  orgMoveRoute: MoveRouteInfo;
  moveRouteOverride: boolean;
  forceMoveMenu: boolean;
}

/**
 * キャラクタークラス
 */
export class GameCharacter extends GameMaterial {
  /**
   * タイル単位のX座標
   */
  protected _x: number = 0;
  /**
   * タイル単位のY座標
   */
  protected _y: number = 0;
  /**
   * 実単位のX座標 ドット*8
   */
  protected _realX: number = 0;
  /**
   * 実単位のY座標 ドット*8
   */
  protected _realY: number = 0;
  /**
   * ジャンプ中のカウント
   */
  private _jumpCount: number = 0;
  /**
   * ジャンプの最高地点
   */
  private _jumpPeak: number = 0;
  /**
   * ジャンプ全体の半分の位置
   */
  private _jumpHalf: number = 0;
  /**
   * ジャンプ中の方向
   */
  private _jumpDirection: number = 0;
  /**
   * 移動速度
   */
  private _moveSpeed: number = EMapScale.DefaultSpeed;
  /**
   * 停止閾値
   */
  private _stopThreshold: number = GameCharacter._calcStopThreshold(3);
  /**
   * 表示の優先度
   */
  private _priority: number = 0;
  /**
   * キャラクター名
   */
  private _characterName: string = '';
  /**
   * キャラセットId
   */
  private _charasetId: number = 0;
  /**
   * キャラクターインデックス
   */
  private _characterIndex: number = 0;
  /**
   * キャラクターの横幅
   */
  private _characterWidth: number = 32;
  /**
   * キャラクターの縦幅
   */
  private _characterHeight: number = 32;
  /**
   * キャラクター列数
   */
  private _characterColumns: number = 4;
  /**
   * キャラクター当たり判定倍率
   */
  private _characterHitScale: number = 1;
  /**
   * キャラクターパターン数
   */
  private _characterPatternMax: number = 0;
  /**
   * キャラクターパターンリスト
   */
  private _characterPatternList: number[] = [];
  /**
   * 方向
   */
  private _direction: number = 0;
  /**
   * _pattern更新のためのカウント
   */
  private _animeCount: number = 0;
  /**
   * 移動頻度の待機のカウント
   */
  protected _stopCount: number = 0;
  /**
   * すり抜け
   */
  private _through: boolean = false;
  /**
   * イベントに無視されるかどうか
   */
  private _ignoredEvents: boolean = false;
  /**
   * 向き固定するかどうか
   */
  private _directionFix: boolean = false;
  /**
   * 足踏みアニメをするかどうか
   * falseだとカウントも停止する
   * パターン固定もアニメはしないがカウントが停止しない
   */
  private _stepAnime: boolean = true;
  /**
   * 透明かどうか
   */
  private _transparent: boolean = false;
  /**
   * 移動が成功したかどうか
   */
  private _moveSuccess: boolean = true;
  /**
   * 移動ルート
   */
  private _moveRoute: MoveRouteInfo = this._createEmptyMoveRoute();
  /**
   * 移動ルートのバックアップ
   */
  private _orgMoveRoute: MoveRouteInfo = this._createEmptyMoveRoute();
  /**
   * 移動ルート上書きかどうか
   */
  protected _moveRouteOverride: boolean = false;
  /**
   * メニュー表示時の強制移動が可能か
   */
  private _forceMoveMenu: boolean = false;

  /**
   * 対象タイプに変換する
   * @param id
   * @returns
   */
  static toTargetType(id: number): ECharacterTargetType {
    return (id & ECharacterId.TypeMask) >> ECharacterId.typeShift;
  }

  /**
   * インデックスに変換する
   * @param id
   * @returns
   */
  static toIndex(id: number) {
    return id & ECharacterId.IndexMask;
  }

  /**
   * コンストラクタ
   * @param args
   */
  constructor(...args);
  constructor() {
    super();
  }

  /**
   * 再設定
   */
  reset() {
    this._x = 0;
    this._y = 0;
    this._realX = 0;
    this._realY = 0;
    this._jumpCount = 0;
    this._jumpPeak = 0;
    this._jumpHalf = 0;
    this._jumpDirection = 0;
    this._direction = 0;
    this.setMoveSpeed(EMapScale.DefaultSpeed);
    this.setStopThreshold(3);
    this.setPriority(0);
    this._characterName = '';
    this._charasetId = 0;
    this._characterIndex = 0;
    this._characterWidth = 32;
    this._characterHeight = 32;
    this._characterColumns = 4;
    this._characterHitScale = 1;
    this._characterPatternMax = 0;
    this._characterPatternList = [];
    this._animeCount = 0;
    this._stopCount = 0;
    this._through = false;
    this._ignoredEvents = false;
    this._directionFix = false;
    this._stepAnime = true;
    this._transparent = false;
    this._moveSuccess = true;
    this._moveRoute = this._createEmptyMoveRoute();
    this._orgMoveRoute = this._createEmptyMoveRoute();
    this._moveRouteOverride = false;
    this._forceMoveMenu = false;
  }

  /**
   * データから読み込み
   * @param data
   */
  load(data: SaveObjectGameCharacter) {
    this._x = data.x ?? this._x;
    this._y = data.y ?? this._y;
    this._direction = data.direction ?? this._direction;
    this._through = data.through ?? this._through;
    this._ignoredEvents = data.ignoredEvents ?? this._ignoredEvents;
    this._directionFix = data.directionFix ?? this._directionFix;
    this._transparent = data.transparent ?? this._transparent;
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): SaveObjectGameCharacter {
    return {
      x: this._x,
      y: this._y,
      direction: this._direction,
      through: this._through,
      ignoredEvents: this._ignoredEvents,
      directionFix: this._directionFix,
      transparent: this._transparent,
    };
  }

  /**
   * 中断データから読み込み
   * @param data
   */
  protected _loadSuspend(data: SuspendObjectGameCharacter) {
    this.load(data);
    this._realX = data.realX ?? this._realX;
    this._realY = data.realY ?? this._realY;
    this._jumpCount = data.jumpCount ?? this._jumpCount;
    this._jumpPeak = data.jumpPeak ?? this._jumpPeak;
    this._jumpHalf = data.jumpHalf ?? this._jumpHalf;
    this._jumpDirection = data.jumpDirection ?? this._jumpDirection;
    this._moveSpeed = data.moveSpeed ?? this._moveSpeed;
    this._stopThreshold = data.stopThreshold ?? this._stopThreshold;
    this._priority = data.priority ?? this._priority;
    this._characterName = data.characterName ?? this._characterName;
    this._charasetId = data.charasetId ?? this._charasetId;
    this._characterIndex = data.characterIndex ?? this._characterIndex;
    this._characterWidth = data.characterWidth ?? this._characterWidth;
    this._characterHeight = data.characterHeight ?? this._characterHeight;
    this._characterColumns = data.characterColumns ?? this._characterColumns;
    this._characterHitScale = data.characterHitScale ?? this._characterHitScale;
    this._characterPatternMax =
      data.characterPatternMax ?? this._characterPatternMax;
    this._characterPatternList =
      data.characterPatternList ?? this._characterPatternList;
    this._animeCount = data.animeCount ?? this._animeCount;
    this._stopCount = data.stopCount ?? this._stopCount;
    this._stepAnime = data.stepAnime ?? this._stepAnime;
    this._moveSuccess = data.moveSuccess ?? this._moveSuccess;
    this._moveRoute = data.moveRoute ?? this._moveRoute;
    this._orgMoveRoute = data.orgMoveRoute ?? this._orgMoveRoute;
    this._moveRouteOverride = data.moveRouteOverride ?? this._moveRouteOverride;
    this._forceMoveMenu = data.forceMoveMenu ?? this._forceMoveMenu;
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  protected _createSuspendObject(): SuspendObjectGameCharacter {
    return {
      ...this.createSaveObject(),
      realX: this._realX,
      realY: this._realY,
      jumpCount: this._jumpCount,
      jumpPeak: this._jumpPeak,
      jumpHalf: this._jumpHalf,
      jumpDirection: this._jumpDirection,
      moveSpeed: this._moveSpeed,
      stopThreshold: this._stopThreshold,
      priority: this._priority,
      characterName: this._characterName,
      charasetId: this._charasetId,
      characterIndex: this._characterIndex,
      characterWidth: this._characterWidth,
      characterHeight: this._characterHeight,
      characterColumns: this._characterColumns,
      characterHitScale: this._characterHitScale,
      characterPatternMax: this._characterPatternMax,
      characterPatternList: this._characterPatternList,
      animeCount: this._animeCount,
      stopCount: this._stopCount,
      stepAnime: this._stepAnime,
      moveSuccess: this._moveSuccess,
      moveRoute: this._moveRoute,
      orgMoveRoute: this._orgMoveRoute,
      moveRouteOverride: this._moveRouteOverride,
      forceMoveMenu: this._forceMoveMenu,
    };
  }

  /**
   * X座標を取得
   */
  get x() {
    return this._x;
  }

  /**
   * Y座標を取得
   */
  get y() {
    return this._y;
  }

  /**
   * 実X座標を取得する
   */
  get realX() {
    return this._realX;
  }

  /**
   * 実Y座標を取得する
   */
  get realY() {
    return this._realY;
  }

  /**
   * ジャンプ中かどうか
   */
  get jumping() {
    return this._jumpCount > 0;
  }

  /**
   * キャラ画像名を取得
   */
  get characterName() {
    return this._characterName;
  }

  /**
   * キャラセットIdを取得
   */
  get charasetId() {
    return this._charasetId;
  }

  /**
   * キャラ画像インデックスを取得
   */
  get characterIndex() {
    return this._characterIndex;
  }

  /**
   * キャラ画像横幅を取得
   */
  get characterWidth() {
    return this._characterWidth;
  }

  /**
   * キャラ画像縦幅を取得
   */
  get characterHeight() {
    return this._characterHeight;
  }

  /**
   * キャラ画像列数を取得
   */
  get characterColumns() {
    return this._characterColumns;
  }

  /**
   * キャラ画像パターン数を取得
   */
  get characterPatternMax() {
    return this._characterPatternMax;
  }

  /**
   * キャラ画像パターンリストを取得
   */
  get characterPatternList() {
    return this._characterPatternList;
  }

  /**
   * 現在のキャラ画像パターンを取得
   */
  get currentCharacterPattern() {
    return this.characterPatternList[this.pattern];
  }

  /**
   * 画面上のX座標を取得
   */
  get screenX() {
    return gameMapSight.adjustX(
      this._realX - this._adjustOffset(gameScreen.offsetX)
    );
  }

  /**
   * 画面上のY座標を取得
   */
  get screenY() {
    return (
      gameMapSight.adjustY(
        this._realY -
          this._jumpHeight() -
          this._adjustOffset(gameScreen.offsetY)
      ) - this._shiftY()
    );
  }

  /**
   * 画面上のZ座標を取得
   */
  get screenZ() {
    return this.screenY + this.priority;
  }

  /**
   * 横幅当たり判定の半分の大きさ
   */
  get halfWidthHit() {
    return this._characterHitScale * 16;
  }

  /**
   * Y座標のオフセット
   * @returns
   */
  private _shiftY() {
    return this._charasetId === 0 ? 0 : 4;
  }

  /**
   * ジャンプ中の高さ
   * @returns
   */
  private _jumpHeight() {
    return this._jumpHalf === 0
      ? 0
      : (this._jumpPeak *
          (this._jumpHalf - Math.abs(this._jumpCount - this._jumpHalf))) /
          this._jumpHalf;
  }

  /**
   * オフセットを調整する
   * @param value
   * @returns
   */
  private _adjustOffset(value: number) {
    switch (gameScreen.shakeType) {
      case EShakeType.MapOnly:
        return 0;
      default:
        return value;
    }
  }

  /**
   * 描画分のタイルスケールのX座標を取得
   */
  get screenTileX() {
    return Math.floor(
      (gameMapSight.adjustX(this._realX) + ECharacter.LeftOut) / EMap.TileSize
    );
  }

  /**
   * 描画分のタイルスケールのY座標を取得
   */
  get screenTileY() {
    return Math.floor(
      (gameMapSight.adjustY(this._realY) + ECharacter.TopOut) / EMap.TileSize
    );
  }

  /**
   * 方向を取得
   */
  get direction() {
    return this._direction;
  }

  /**
   * 移動速度を取得
   */
  get moveSpeed() {
    return this._moveSpeed;
  }

  /**
   * 実際に移動している速度を取得
   * 現在は移動速度をそのまま返す
   */
  get realMoveSpeed() {
    return this.moveSpeed;
  }

  /**
   * 実際の足踏み速度を取得
   */
  get realStepSpeed() {
    return EMapScale.DefaultStepSpeed;
  }

  /**
   * 表示の優先度を取得
   */
  get priority() {
    return this._priority;
  }

  /**
   * 表示の優先度を設定
   * @param value
   */
  setPriority(value: number) {
    this._priority = value;
  }

  /**
   * 表示中のX軸の中央位置
   */
  get centerX() {
    return Math.floor(gameMapSight.dispCenterX / EMap.RealScale);
  }

  /**
   * 表示中のY軸の中央位置
   */
  get centerY() {
    return Math.floor(gameMapSight.dispCenterY / EMap.RealScale);
  }

  /**
   * 方向を設定
   * @param value
   */
  setDirection(value: number) {
    if (value >= 0) {
      this._direction = value;
    }
  }

  /**
   * 表示パターンを取得
   */
  get pattern() {
    return this._calcAnimePattern();
  }

  /**
   * 向き固定を取得する
   */
  get directionFix() {
    return this._directionFix;
  }

  /**
   * 向きの固定を設定する
   * @param value
   */
  setDirectionFix(value: boolean) {
    this._directionFix = value;
  }

  /**
   * 足踏みの設定
   * @param value
   */
  setStepAnime(value: boolean) {
    this._stepAnime = value;
  }

  /**
   * 足踏みの設定を取得
   */
  get stepAnime(): boolean {
    return this._stepAnime;
  }

  /**
   * 透明状態を設定する
   * @param value
   */
  setTransparent(value: boolean) {
    this._transparent = value;
  }

  /**
   * 表示状態を取得する
   */
  get transparent() {
    return this._transparent;
  }

  /**
   * 移動が成功したかどうかを設定する
   * @param value
   */
  setMoveSuccess(value: boolean) {
    this._moveSuccess = value;
  }

  /**
   * 移動が成功したかどうかを取得する
   */
  get moveSuccess() {
    return this._moveSuccess;
  }

  /**
   * すり抜け状態を設定する
   * @param value
   */
  setThrough(value: boolean) {
    this._through = value;
  }

  /**
   * すり抜け状態を取得する
   */
  get through() {
    return this._through;
  }

  /**
   * イベントに無視される状態を設定する
   * @param value
   */
  setIgnoredEvents(value: boolean) {
    this._ignoredEvents = value;
  }

  /**
   * イベントに無視される状態を取得する
   */
  get ignoredEvents() {
    return this._ignoredEvents;
  }

  /**
   * 強制移動中かどうか
   */
  get forceMoving() {
    return this._moveRouteOverride;
  }

  /**
   * アニメカウントを設定する
   * @param value
   */
  setAnimeCount(value: number) {
    this._animeCount = value;
  }

  /**
   * アニメカウントを取得する
   */
  get animeCount() {
    return this._animeCount;
  }

  /**
   * 移動ルート上書きフラグの設定
   * @param value
   */
  setMoveRouteOverride(value: boolean) {
    this._moveRouteOverride = value;
  }

  /**
   * 方向を反転させる
   * @param direction 反転させる方向
   * @returns 反転方向
   */
  reverseDir(direction = -1) {
    return EDirection.End - (direction < 0 ? this.direction : direction);
  }

  /**
   * 横軸の距離
   * @param x
   */
  rangeX(x: number) {
    return x - this._x;
  }

  /**
   * 縦軸の距離
   * @param y
   */
  rangeY(y: number) {
    return y - this._y;
  }

  // /**
  //  * 同一座標かどうか
  //  * @param x
  //  * @param y
  //  * @returns
  //  */
  // equalPos(x: number, y: number) {
  //   return this.x === x && this.y === y;
  // }

  /**
   * 位置を交換する
   * @param character
   */
  swapPos(character: GameCharacter) {
    const [x, y] = [character._x, character._y];
    character.moveto(this._x, this._y);
    this.moveto(x, y);
  }

  /**
   * 場所移動
   * @param x
   * @param y
   * @param d
   * @param speed
   */
  moveto(x: number, y: number) {
    this._x = x;
    this._y = y;
    this._realX = x * EMap.RealScale;
    this._realY = y * EMap.RealScale;
  }

  /**
   * 後ろに移動
   * @param front
   */
  toBack(front: GameCharacter) {
    if (this._passable(front.x, front.y, this.reverseDir(front.direction))) {
      const subX = GameCharacter.directionX(front.direction);
      const subY = GameCharacter.directionY(front.direction);
      this.moveto(front.x - subX, front.y - subY);
    } else {
      this.moveto(front.x, front.y);
    }
    this.changeDirection(front.direction);
  }

  /**
   * 再設定
   */
  refresh() {
    //
  }

  /**
   * 歩行画像を設定
   * @param charasetId
   * @param characterIndex
   */
  setImage(charasetId: number, characterIndex: number) {
    if (charasetId === 0) {
      this._setTilesetImage(characterIndex);
    } else {
      this._setCharasetImage(charasetId, characterIndex);
    }
  }

  /**
   * 歩行タイルセット画像を設定
   * characterIndexがタイルのgidになる
   * @param gid
   */
  private _setTilesetImage(gid: number) {
    const [id, index] = GameUtils.getTile(gid, gameMapSight.tilesets);
    if (id < 0 || index < 0) {
      this._characterName = '';
      return;
    }
    const tileset = gameMapSight.tilesets[index];
    this._characterName = tileset.image;
    this._charasetId = 0;
    this._characterIndex = id;
    this._characterWidth = EMap.TileSize;
    this._characterHeight = EMap.TileSize;
    this._characterColumns = tileset.columns;
    this._characterHitScale = 1;
    this._characterPatternMax = 1;
    const anim = GameUtils.getAnim(tileset.tiles[id]);
    if (anim > 0) {
      this._characterPatternList = [0, anim, 2 * anim];
    } else {
      this._characterPatternList = [0];
    }
  }

  /**
   * 歩行キャラセット画像を設定
   * @param charasetId
   * @param characterIndex
   * @returns
   */
  private _setCharasetImage(charasetId: number, characterIndex: number) {
    const charset = system.charsets[charasetId];
    if (charset == null) {
      this._characterName = '';
      return;
    }
    this._characterName = charset.filename;
    this._charasetId = charasetId;
    this._characterIndex = characterIndex;
    this._characterWidth = charset.charWidth;
    this._characterHeight = charset.charHeight;
    this._characterColumns = charset.columns;
    this._characterHitScale = charset.hitScale || 1;
    this._characterPatternMax = charset.pattern;
    this._characterPatternList = charset.list;
  }

  /**
   * 移動開始かどうか
   */
  protected _startMoveable() {
    // コマンド実行中でなければ可能
    if (!gameMapSight.eventRunning()) {
      return true;
    }
    // コマンド実行中でも指定移動の場合は可能
    if (this._moveRouteOverride) {
      return true;
    }
    return false;
  }

  /**
   * 移動可能かどうか
   * @returns
   */
  canMove() {
    return !(gameMapSight.eventRunning() || this._moveRouteOverride);
  }

  /**
   * 更新
   */
  update() {
    if (this.moveStopping()) {
      this.updateStop();
    }
    // イベント実行中はなにもしないが
    // 指定移動の場合は実行する
    // 指定移動待ちの場合は足踏みだけ実行する
    if (this.checkUpdateMove()) {
      if (this.jumping) {
        this.updateJump();
      } else {
        this.updateMove();
      }
    }
    if (this.checkUpdateAnimation()) {
      this.updateAnimation();
    }
  }

  /**
   * 停止状態
   */
  updateStop() {
    // イベント実行中で指定移動でない場合はなにもしない
    if (!this._startMoveable()) {
      return;
    }

    // 移動指定の場合はこっち
    if (this._moveRouteOverride) {
      this._updateMoveRoute();
      return;
    }

    // 停止カウントを加算する
    this._stopCount += 1;
  }

  /**
   * 移動の更新が可能か
   */
  checkUpdateMove() {
    // メニュー表示中で強制移動がメニュー表示中に
    // 開始されていなければNG
    if (gameMenus.hasMenu && !this._forceMoveMenu) {
      return false;
    }
    // スクリプト実行中でないならOK
    if (!gameMapSight.eventRunning()) {
      return true;
    }
    // 強制移動中ならOK
    if (this.forceMoving) {
      return true;
    }
    // そのほかはNG
    return false;
  }

  /**
   * アニメーションの更新が可能か
   */
  checkUpdateAnimation() {
    // 組み込みメニュー中ならNG
    if (gameSystem.mapExecutor.embedding) {
      return false;
    }
    // ジャンプ中の場合NG
    if (this.jumping) {
      return false;
    }
    // スクリプト実行中でないならOK
    if (!gameMapSight.eventRunning()) {
      return true;
    }
    // 強制移動中でジャンプ中でなければOK
    if (this.forceMoving) {
      return true;
    }
    // 移動ルート終了待ちで足踏みするならOK
    if (gameSystem.mapExecutor.moveRouteWaiting && gameTemp.moveRouteWaitStep) {
      return true;
    }
    // そのほかはNG
    return false;
  }

  /**
   * ジャンプの更新
   */
  updateJump() {
    this._jumpCount--;
    this._realX =
      (this._realX * this._jumpCount + this._x * EMap.RealScale) /
      (this._jumpCount + 1);
    this._realY =
      (this._realY * this._jumpCount + this._y * EMap.RealScale) /
      (this._jumpCount + 1);
  }

  /**
   * 移動の更新
   */
  updateMove() {
    if (this._y * EMap.RealScale > this._realY) {
      this._realY += this.realMoveSpeed;
    }
    if (this._x * EMap.RealScale < this._realX) {
      this._realX -= this.realMoveSpeed;
    }
    if (this._x * EMap.RealScale > this._realX) {
      this._realX += this.realMoveSpeed;
    }
    if (this._y * EMap.RealScale < this._realY) {
      this._realY -= this.realMoveSpeed;
    }
  }

  /**
   * オプションコマンド群を実行する
   * @param commands
   */
  executeOptionCommands(commands: MoveRouteCommand[]) {
    for (const command of commands) {
      this._executeOptionCommand(command);
    }
  }

  /**
   * 移動ルート更新
   */
  protected _updateMoveRoute() {
    this.setMoveSuccess(true);
    for (;;) {
      const command = this._getMoveRouteCommand();
      if (!command) {
        break;
      }
      if (!this._executeMoveCommand(command)) {
        this._checkMoveRouteRedo(command);
        break;
      }
    }
  }

  /**
   * 空の移動ルート情報を作成
   */
  private _createEmptyMoveRoute(): MoveRouteInfo {
    return {
      data: {
        id: 0,
        repeat: false,
        skippable: false,
        moveFrequency: 0,
        list: [],
      },
      index: 0,
      stopThreshold: -1,
      repeater: null,
      redoCommand: null,
    };
  }

  /**
   * 移動ルート設定
   * @param moveRoute
   */
  protected _setMoveRoute(moveRoute: MoveRoute) {
    this._moveRoute = this._createEmptyMoveRoute();
    this._moveRoute.data = moveRoute;
    this._moveRoute.stopThreshold =
      moveRoute.moveFrequency > 0
        ? GameCharacter._calcStopThreshold(moveRoute.moveFrequency - 1)
        : -1;
  }

  /**
   * 移動ルート上書き
   * @param moveRoute
   */
  overrideMoveRoute(moveRoute: MoveRoute) {
    // もともとの設定を保存
    if (!this._moveRouteOverride) {
      // 上書き状態でない場合
      // なので上書き状態でさらに上書きするとルートも上書きされる
      this._memorizeMoveRoute();
    }
    // 新しいのを設定
    this._setMoveRoute(moveRoute);
    // 上書き記録
    this.setMoveRouteOverride(true);
    this._forceMoveMenu = gameMenus.hasMenu;
  }

  /**
   * 移動ルートを保存
   * 毎回オブジェクトを作り直すのでそのまま代入
   */
  private _memorizeMoveRoute() {
    this._orgMoveRoute = this._moveRoute;
  }

  /**
   * 移動ルート復元
   */
  private _restoreMoveRoute() {
    this._moveRoute = this._orgMoveRoute;
    this._orgMoveRoute = this._createEmptyMoveRoute();
  }

  /**
   * 移動ルートコマンド取得
   */
  private _getMoveRouteCommand() {
    const redoCommand = this._takeMoveRouteRedoCommand();
    if (redoCommand) {
      return redoCommand;
    }
    // リピート系
    const repeatCommand = this._takeMoveRouteRepeatCommand();
    if (repeatCommand) {
      return repeatCommand;
    }

    return this._takeMoveRouteNextCommand();
  }

  /**
   * 移動ルートやり直しコマンドを取り出し
   * 保存していたコマンドは削除する
   */
  private _takeMoveRouteRedoCommand() {
    if (this._moveRoute.redoCommand === null) {
      return;
    }
    const command = this._moveRoute.redoCommand;
    this._moveRoute.redoCommand = null;
    return command;
  }

  /**
   * リピートコマンドを取り出し
   */
  private _takeMoveRouteRepeatCommand() {
    if (this._moveRoute.repeater === null) {
      return;
    }
    if (this._moveRoute.repeater.count <= 0) {
      this._moveRoute.repeater = null;
      return;
    }
    this._moveRoute.repeater.count--;
    return this._moveRoute.repeater.command;
  }

  /**
   * 次コマンドを取り出し
   */
  private _takeMoveRouteNextCommand() {
    const command = this._getMoveRouteCommandCurrent();
    if (command === undefined) {
      // 最後まできた
      return;
    }
    this._moveRoute.index += 1;
    return command;
  }

  /**
   * 現在位置の移動ルートコマンドを取得
   */
  private _getMoveRouteCommandCurrent() {
    const command = this._moveRoute.data.list[this._moveRoute.index];
    if (command === undefined) {
      // 最後まできた
      return this._moveRouteEnd();
    }
    return command;
  }

  /**
   * 移動ルート最後まで来たときの処理
   */
  private _moveRouteEnd() {
    if (this._moveRoute.data.repeat) {
      // 最初に戻す
      this._moveRoute.index = 0;
      return this._moveRoute.data.list[this._moveRoute.index];
    } else if (this._moveRouteOverride) {
      this.setMoveRouteOverride(false);
      this._forceMoveMenu = false;
      this._restoreMoveRoute();
    }
    return;
  }

  /**
   * 移動コマンドを実行
   * true:すぐ次コマンドを実施
   * false:フレームを進める
   * @param command
   */
  private _executeMoveCommand(command: MoveRouteCommand) {
    const params = command.parameters;
    switch (command.code) {
      case EMoveRouteCode.MoveLeft:
        this._moveLeftToMoveOneRepeatCommand(params[0]);
        return true;
      case EMoveRouteCode.MoveUp:
        this._moveUpToMoveOneRepeatCommand(params[0]);
        return true;
      case EMoveRouteCode.MoveRight:
        this._moveRightToMoveOneRepeatCommand(params[0]);
        return true;
      case EMoveRouteCode.MoveDown:
        this._moveDownToMoveOneRepeatCommand(params[0]);
        return true;
      case EMoveRouteCode.MoveForward:
        this._moveForwardToMoveOneRepeatCommand(params[0]);
        return true;
      case EMoveRouteCode.WaitOne:
        return false;
      case EMoveRouteCode.MoveLeftOne:
        this.moveStraight(EDirection.Left);
        return false;
      case EMoveRouteCode.MoveUpOne:
        this.moveStraight(EDirection.Up);
        return false;
      case EMoveRouteCode.MoveRightOne:
        this.moveStraight(EDirection.Right);
        return false;
      case EMoveRouteCode.MoveDownOne:
        this.moveStraight(EDirection.Down);
        return false;
      case EMoveRouteCode.Wait: // コマンドを進めるだけ
        this._toWaitRepeatCommand(params[0]);
        return true;
      case EMoveRouteCode.MoveScreenX:
        this._moveScreenXToMoveOneRepeatCommand(
          params[0],
          params[1],
          params[2] > 0
        );
        return true;
      case EMoveRouteCode.MoveScreenY:
        this._moveScreenYToMoveOneRepeatCommand(
          params[0],
          params[1],
          params[2] > 0
        );
        return true;
      case EMoveRouteCode.MoveMapX:
        this._moveMapXToMoveOneRepeatCommand(
          params[0],
          params[1],
          params[2] > 0
        );
        return true;
      case EMoveRouteCode.MoveMapY:
        this._moveMapYToMoveOneRepeatCommand(
          params[0],
          params[1],
          params[2] > 0
        );
        return true;
      case EMoveRouteCode.Jump:
        this.jump(...(params as [number, number, number, number, number]));
        return false;
      case EMoveRouteCode.Step:
        this._stepToWaitCommand(params[0]);
        return true;
      case EMoveRouteCode.OperateSlot:
        this._operateSlot(params[0], params[1], params[2]);
        return true;
      case EMoveRouteCode.StartRoute:
        this._startRoute(params[0], params[1], params[2]);
        return true;
      case EMoveRouteCode.PlaySe:
        GameSound.play(params[0]);
        return true;
      default:
        return this._executeOptionCommand(command);
    }
  }

  /**
   * 設定コマンドを実行
   * @param command
   * @returns
   */
  private _executeOptionCommand(command: MoveRouteCommand) {
    const params = command.parameters;
    switch (command.code) {
      case EMoveRouteCode.TurnLeft:
        this.changeDirection(EDirection.Left);
        break;
      case EMoveRouteCode.TurnUp:
        this.changeDirection(EDirection.Up);
        break;
      case EMoveRouteCode.TurnRight:
        this.changeDirection(EDirection.Right);
        break;
      case EMoveRouteCode.TurnDown:
        this.changeDirection(EDirection.Down);
        break;
      case EMoveRouteCode.TurnLeft90:
        this._turnLeft90();
        break;
      case EMoveRouteCode.TurnRight90:
        this._turnRight90();
        break;
      case EMoveRouteCode.Turn180:
        this.changeDirection(this.reverseDir(this.direction));
        break;
      case EMoveRouteCode.TurnPlayer:
        this.turnAwayCharacterDirection(gameMapSight.getPlayerCharacter());
        break;
      case EMoveRouteCode.ChangeSpeed:
        this._changeMoveSpeed(params[0]);
        break;
      case EMoveRouteCode.ChangePriority:
        this.setPriority(params[0]);
        break;
      case EMoveRouteCode.DirectionFixOff:
        this.setDirectionFix(false);
        break;
      case EMoveRouteCode.DirectionFixOn:
        this.setDirectionFix(true);
        break;
      case EMoveRouteCode.StepAnimeOff:
        this.setStepAnime(false);
        break;
      case EMoveRouteCode.StepAnimeOn:
        this.setStepAnime(true);
        break;
      case EMoveRouteCode.ThroughOn:
        this.setThrough(true);
        break;
      case EMoveRouteCode.ThroughOff:
        this.setThrough(false);
        break;
      case EMoveRouteCode.IgnoredEventsOn:
        this.setIgnoredEvents(true);
        break;
      case EMoveRouteCode.IgnoredEventsOff:
        this.setIgnoredEvents(false);
        break;
      case EMoveRouteCode.TransparentOn:
        this.setTransparent(true);
        break;
      case EMoveRouteCode.TransparentOff:
        this.setTransparent(false);
        break;
      case EMoveRouteCode.ChangeImage:
        this.changeImage(params[0], params[1], params[2]);
        break;
      default:
        return false;
    }
    return true;
  }

  /**
   * 左に90度回転
   */
  private _turnLeft90() {
    switch (this.direction) {
      case EDirection.Down:
        this.changeDirection(EDirection.Left);
        break;
      case EDirection.Left:
        this.changeDirection(EDirection.Up);
        break;
      case EDirection.Right:
        this.changeDirection(EDirection.Down);
        break;
      case EDirection.Up:
        this.changeDirection(EDirection.Right);
        break;
    }
  }

  /**
   * 右に90度回転
   */
  private _turnRight90() {
    switch (this.direction) {
      case EDirection.Down:
        this.changeDirection(EDirection.Right);
        break;
      case EDirection.Left:
        this.changeDirection(EDirection.Down);
        break;
      case EDirection.Right:
        this.changeDirection(EDirection.Up);
        break;
      case EDirection.Up:
        this.changeDirection(EDirection.Left);
        break;
    }
  }

  /**
   * 移動速度を変更 0～9
   * 0指定の場合は標準速度を設定
   * @param speed
   */
  private _changeMoveSpeed(speed: number) {
    if (speed > 0) {
      speed = 1 << (speed - 1);
    } else {
      speed = gameMapSight.nextMapMoveSpeed;
    }
    this.setMoveSpeed(speed);
  }

  /**
   * 移動速度を変更する
   * @param value
   */
  setMoveSpeed(value: number) {
    this._moveSpeed = value;
  }

  /**
   * 停止閾値を設定する
   * @param value
   */
  setStopThreshold(value: number) {
    this._stopThreshold = GameCharacter._calcStopThreshold(value);
  }

  /**
   * 停止閾値を計算する
   * @param moveFrequency
   * @returns
   */
  static _calcStopThreshold(moveFrequency: number) {
    return 20 * moveFrequency;
  }

  /**
   * 現在の停止閾値を取得する
   */
  protected get _currentStopThreshold() {
    return this._moveRoute.stopThreshold < 0
      ? this._stopThreshold
      : this._moveRoute.stopThreshold;
  }

  /**
   * スロット演算を行う
   * @param id
   * @param opecode
   * @param value
   */
  private _operateSlot(id: number, opecode: number, value: number) {
    const newValue = GameUtils.calcOpecode(opecode, getSlotNumber(id), value);
    setSlot(id, newValue);
    gameTemp.requestRefreshEvent();
  }

  /**
   * 別の移動ルートを開始する
   * 同じキャラクターの場合は開始したルートで上書きされる
   * @param targetId
   * @param type
   * @param routeId
   * @returns
   */
  private _startRoute(targetId: number, type: number, routeId: number) {
    const moveRoute = GameUtils.getMoveRoute(type, routeId);
    if (!moveRoute) {
      return true;
    }

    const characters = this._getTargetCharacters(targetId);
    for (const character of characters) {
      character.overrideMoveRoute(moveRoute);
    }
  }

  /**
   * 対象キャラクターを取得
   * @param targetId
   * @returns
   */
  private _getTargetCharacters(targetId: number) {
    if (targetId < 0) {
      return [this];
    } else {
      return gameMapSight.getTargetCharacters(targetId);
    }
  }

  /**
   * 移動ルートやり直しか確認
   * @param command
   */
  private _checkMoveRouteRedo(command: MoveRouteCommand) {
    if (this.moveSuccess || this._moveRoute.data.skippable) {
      return;
    }
    this._moveRoute.redoCommand = command;
  }

  /**
   * アニメーションの更新
   */
  updateAnimation() {
    this._updateAnimeCount();
  }

  /**
   * アニメパターンのためのカウントを更新
   */
  private _updateAnimeCount() {
    if (!this._stepAnime) {
      return;
    }
    this._animeCount =
      (this._animeCount + this._currentAnimationSpeed()) %
      ECharacter.MaxAnimeCount;
  }

  /**
   * アニメパターンを算出
   */
  private _calcAnimePattern() {
    const roughPattern = Math.floor(
      this._animeCount / ECharacter.SwitchAnimeCount
    );
    return roughPattern % this._characterPatternList.length;
  }

  /**
   * 現在のアニメーション速度を取得する
   * @returns
   */
  private _currentAnimationSpeed() {
    return this.isMoving() ? this.realMoveSpeed : this.realStepSpeed;
  }

  /**
   * アニメパターンをリセット
   */
  resetPattern() {
    this._animeCount = 0;
  }

  /**
   * 移動停止中か
   */
  moveStopping() {
    return !this.isMoving() && !this.jumping;
  }

  /**
   * 移動中か
   */
  isMoving() {
    return (
      this._realX !== this._x * EMap.RealScale ||
      this._realY !== this._y * EMap.RealScale
    );
  }

  /**
   * 1ステップ完了したか
   * 前フレーム動いていて今フレーム移動残りなし
   * @param lastMoving
   */
  protected _endStep(lastMoving: boolean) {
    return lastMoving && !this.isMoving();
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
   * 向きを横方向の値にする
   * @param dir
   * @returns
   */
  static directionX(dir: number) {
    return dir === 2 ? 1 : dir === 1 ? -1 : 0;
  }

  /**
   * 向きを縦方向の値にする
   * @param dir
   * @returns
   */
  static directionY(dir: number) {
    return dir === 0 ? 1 : dir === 3 ? -1 : 0;
  }

  /**
   * 通行可能判定
   * @param x
   * @param y
   * @param dir
   * @returns
   */
  protected _passable(x: number, y: number, dir: number) {
    const newX = x + GameCharacter.directionX(dir);
    const newY = y + GameCharacter.directionY(dir);
    // 範囲外か
    if (this._outRegion(newX, newY)) {
      return false;
    }
    // すり抜け状態
    if (this._through) {
      return true;
    }

    if (this._passableCharacters(newX, newY)) {
      return false;
    }
    // 乗り物の降車判定もここで行うため
    // 最後に判定するようにする
    if (!this._mapPassable(x, y, newX, newY, dir)) {
      return false;
    }

    return true;
  }

  /**
   * マップの通行可能判定
   * 現在位置から離れられるかと次回位置に侵入できるかを判定する
   * @param x
   * @param y
   * @param newX
   * @param newY
   * @param dir
   * @returns
   */
  protected _mapPassable(
    x: number,
    y: number,
    newX: number,
    newY: number,
    dir: number
  ) {
    return (
      gameMapSight.passable(newX, newY, this.reverseDir(dir)) &&
      gameMapSight.passable(x, y, dir)
    );
  }

  /**
   * 範囲外かどうか確認
   * @param x
   * @param y
   */
  protected _outRegion(newX?: number, newY?: number);
  protected _outRegion() {
    return false;
  }

  /**
   * 通行可能か
   * @param x
   * @param y
   * @returns
   */
  protected _passableCharacters(x: number, y: number) {
    // イベントとの判定
    return gameMapSight.noTraffic(x, y, false);
  }

  /**
   * 通行禁止か
   * @param x
   * @param y
   * @returns
   */
  noTraffic(x: number, y: number) {
    // キャラクター座標にいなければ禁止でない
    if (!this.contact(x, y)) {
      return false;
    }
    // グラフィック設定がない場合も禁止でない
    if (!this._characterName) {
      return false;
    }
    return true;
  }

  /**
   * 指定座標と接触しているか
   * @param x
   * @param y
   */
  contact(x: number, y: number) {
    return (
      this._y === y && this._x <= x && this._x + this._characterHitScale > x
    );
  }

  /**
   * 直進
   * @param dir
   */
  moveStraight(dir: number, judged = false) {
    this.changeDirection(dir);
    this.setMoveSuccess(judged || this._passable(this._x, this._y, dir));
    if (this.moveSuccess) {
      this._addMovePoint(
        GameCharacter.directionX(dir),
        GameCharacter.directionY(dir)
      );
    } else {
      this._checkFrontEvent();
    }
    this._resetStopCount();
  }

  /**
   * 前方イベントの確認
   * @returns
   */
  protected _checkFrontEvent() {
    return false;
  }

  /**
   * 移動地点までの加算をする
   * @param addX
   * @param addY
   */
  protected _addMovePoint(addX: number, addY: number) {
    this._x += addX;
    this._y += addY;
  }

  /**
   * 左に移動コマンドから横軸移動リピートコマンドに変換する
   * @param num
   */
  private _moveLeftToMoveOneRepeatCommand(num: number) {
    if (num > 0) {
      this._makeMoveXOneRepeatCommand(-num);
    }
    // 回数がなければ何もしない
  }

  /**
   * 上に移動コマンドから横軸移動リピートコマンドに変換する
   * @param num
   */
  private _moveUpToMoveOneRepeatCommand(num: number) {
    if (num > 0) {
      this._makeMoveYOneRepeatCommand(-num);
    }
    // 回数がなければ何もしない
  }

  /**
   * 右に移動コマンドから横軸移動リピートコマンドに変換する
   * @param num
   */
  private _moveRightToMoveOneRepeatCommand(num: number) {
    if (num > 0) {
      this._makeMoveXOneRepeatCommand(num);
    }
    // 回数がなければ何もしない
  }

  /**
   * 下に移動コマンドから横軸移動リピートコマンドに変換する
   * @param num
   */
  private _moveDownToMoveOneRepeatCommand(num: number) {
    if (num > 0) {
      this._makeMoveYOneRepeatCommand(num);
    }
    // 回数がなければ何もしない
  }

  /**
   * 待機リピートコマンドに変換する
   * @param waitCount
   * @returns
   */
  private _toWaitRepeatCommand(waitCount: number) {
    if (waitCount > 0) {
      this._moveRoute.repeater = {
        count: waitCount,
        command: { code: EMoveRouteCode.WaitOne, parameters: [] },
      };
    }
  }

  /**
   * 前進コマンドから各方向のリピートコマンドに変換する
   * @param direction
   * @param num
   */
  private _moveForwardToMoveOneRepeatCommand(num: number) {
    switch (this.direction) {
      case EDirection.Down:
        this._moveDownToMoveOneRepeatCommand(num);
        break;
      case EDirection.Left:
        this._moveLeftToMoveOneRepeatCommand(num);
        break;
      case EDirection.Right:
        this._moveRightToMoveOneRepeatCommand(num);
        break;
      case EDirection.Up:
        this._moveUpToMoveOneRepeatCommand(num);
        break;
    }
  }

  /**
   * 指定の画面位置横軸移動コマンドから横軸移動リピートコマンドに変換する
   * @param type
   * @param value
   * @returns
   */
  private _moveScreenXToMoveOneRepeatCommand(
    type: number,
    value: number,
    teleport: boolean
  ) {
    if (type !== 0) {
      value = getSlotNumber(value);
    }
    const x = this.screenTileX;
    if (x === value) {
      // 同一座標なら何もしないので変換不要
      return;
    }
    if (teleport) {
      this._x = value;
      this._realX = value * EMap.RealScale;
    } else {
      this._makeMoveXOneRepeatCommand(value - x);
    }
  }

  /**
   * 指定の画面位置縦軸移動コマンドから縦軸移動リピートコマンドに変換する
   * @param type
   * @param value
   * @returns
   */
  private _moveScreenYToMoveOneRepeatCommand(
    type: number,
    value: number,
    teleport: boolean
  ) {
    if (type !== 0) {
      value = getSlotNumber(value);
    }
    const y = this.screenTileY;
    if (y === value) {
      // 同一座標なら何もしないので変換不要
      return;
    }
    if (teleport) {
      this._y = value;
      this._realY = value * EMap.RealScale;
    } else {
      this._makeMoveYOneRepeatCommand(value - y);
    }
  }

  /**
   * 指定のマップ位置横軸移動コマンドから横軸移動リピートコマンドに変換する
   * @param type
   * @param value
   * @returns
   */
  private _moveMapXToMoveOneRepeatCommand(
    type: number,
    value: number,
    teleport: boolean
  ) {
    switch (type) {
      case 1:
        value = getSlotNumber(value);
        break;
      case 2:
        value = gameMapSight.nextX;
        break;
    }
    const x = this.x;
    if (x === value) {
      // 同一座標なら何もしないので変換不要
      return;
    }
    if (teleport) {
      this._x = value;
      this._realX = value * EMap.RealScale;
    } else {
      this._makeMoveXOneRepeatCommand(value - x);
    }
  }

  /**
   * 指定のマップ位置縦軸移動コマンドから縦軸移動リピートコマンドに変換する
   * @param type
   * @param value
   * @returns
   */
  private _moveMapYToMoveOneRepeatCommand(
    type: number,
    value: number,
    teleport: boolean
  ) {
    switch (type) {
      case 1:
        value = getSlotNumber(value);
        break;
      case 2:
        value = gameMapSight.nextY;
        break;
    }
    const y = this.y;
    if (y === value) {
      // 同一座標なら何もしないので変換不要
      return;
    }
    if (teleport) {
      this._y = value;
      this._realY = value * EMap.RealScale;
    } else {
      this._makeMoveYOneRepeatCommand(value - y);
    }
  }

  /**
   * 横軸移動のリピートコマンドを作成
   * @param value
   */
  private _makeMoveXOneRepeatCommand(value: number) {
    if (value < 0) {
      this._moveRoute.repeater = {
        count: -value,
        command: { code: EMoveRouteCode.MoveLeftOne, parameters: [] },
      };
    } else {
      this._moveRoute.repeater = {
        count: value,
        command: { code: EMoveRouteCode.MoveRightOne, parameters: [] },
      };
    }
  }

  /**
   * 縦軸移動のリピートコマンドを作成
   * @param value
   */
  private _makeMoveYOneRepeatCommand(value: number) {
    if (value < 0) {
      this._moveRoute.repeater = {
        count: -value,
        command: { code: EMoveRouteCode.MoveUpOne, parameters: [] },
      };
    } else {
      this._moveRoute.repeater = {
        count: value,
        command: { code: EMoveRouteCode.MoveDownOne, parameters: [] },
      };
    }
  }

  /**
   * 足踏みコマンドから待機コマンドに変換する
   * @param stepCount
   */
  private _stepToWaitCommand(stepCount: number) {
    // 移動速度から待機数を算出する
    const waitCount = Math.floor(
      (ECharacter.SwitchAnimeCount / this.realMoveSpeed) * stepCount
    );
    this._moveRoute.repeater = {
      count: waitCount,
      command: { code: EMoveRouteCode.WaitOne, parameters: [] },
    };
  }

  /**
   * ジャンプ
   * @param x
   * @param y
   * @param height その場でのジャンプの最高点
   * @param speedRate
   * @param powerRate ジャンプの力強さ 強いほど山なりになる
   */
  jump(
    x: number,
    y: number,
    height: number,
    speedRate: number,
    powerRate: number,
    type = 0
  ) {
    if (type > 0) {
      x = getSlotNumber(x);
      y = getSlotNumber(y);
    }
    const tx = x * EMap.TileSize;
    const absY = Math.abs(y) * EMap.TileSize;
    const ty = absY + height * 2;
    const distance = Math.sqrt(tx * tx + ty * ty) * EMapScale.Scale;

    const speed = GameRate.div(speedRate, this.realMoveSpeed);
    this._jumpPeak = (GameRate.div(powerRate, absY) + height) * EMapScale.Scale;
    this._jumpCount = Math.round(distance / (speed < 1 ? 1 : speed));
    if (this._jumpCount % 2 !== 0) {
      // 偶数に補正する
      this._jumpCount++;
    }
    // 垂直ジャンプかつその場ジャンプじゃないときは高さを調整しない
    this._jumpHalf = x === 0 && height === 0 ? 0 : this._jumpCount / 2;
    this._jumpDirection = this.direction;
    this._addMovePoint(x, y);
  }

  /**
   * 移動する方向を向く
   * @param x
   * @param y
   */
  protected _turnAwayMoveDirection(x: number, y: number) {
    if (x === 0 && y === 0) {
      return;
    }
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    if (absX > absY) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      x !== 0 &&
        this.changeDirection(x < 0 ? EDirection.Left : EDirection.Right);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      y !== 0 && this.changeDirection(y < 0 ? EDirection.Up : EDirection.Down);
    }
  }

  /**
   * ジャンプパラメータを設定する
   * @param jumpPeak
   * @param jumpCount
   * @param jumpHalf
   */
  protected _setJumpParameters(
    jumpPeak: number,
    jumpCount: number,
    jumpHalf: number,
    jumpDirection: number
  ) {
    this._jumpPeak = jumpPeak;
    this._jumpCount = jumpCount;
    this._jumpHalf = jumpHalf;
    this._jumpDirection = jumpDirection;
  }

  /**
   * ジャンプパラメータを取得する
   * @returns
   */
  protected _getJumpParameters() {
    return [
      this._jumpPeak,
      this._jumpCount,
      this._jumpHalf,
      this._jumpDirection,
    ];
  }

  /**
   * キャラクターの方向を向く
   * @param character
   */
  turnAwayCharacterDirection(character: GameCharacter) {
    if (this.y > character.y) {
      this.changeDirection(EDirection.Up);
    } else if (this.x > character.x) {
      this.changeDirection(EDirection.Left);
    } else if (this.x < character.x) {
      this.changeDirection(EDirection.Right);
    } else if (this.y < character.y) {
      this.changeDirection(EDirection.Down);
    }
  }

  /**
   * 向きを変更する
   * @param direction
   */
  changeDirection(direction: number) {
    if (this.directionFix) {
      return;
    }
    this.setDirection(direction);
  }

  /**
   * 停止カウントをリセットする
   */
  private _resetStopCount() {
    this._stopCount = 0;
  }

  /**
   * タイルスケールに変換する
   * @param size
   */
  toTileScale(size: number) {
    return size / EMap.RealScale;
  }

  /**
   * 地形確認
   */
  checkTerrainHere() {
    const terrainId = gameMapSight.getTerrainId(this._x, this._y);
    if (terrainId === 0) {
      return;
    }
  }

  /**
   * 画像を変更する
   * @param type
   * @param id
   */
  changeImage(type: number, id: number, index: number) {
    if (type !== 0) {
      id = getSlotNumber(id);
      index = getSlotNumber(index);
    }
    this.setImage(id, index);
  }

  /**
   * 指定のキャラの位置をコピーする
   * @param character
   */
  copyPosition(character: GameCharacter) {
    this._x = character._x;
    this._y = character._y;
    this._realX = character._realX;
    this._realY = character._realY;
    this._direction = character._direction;
  }

  /**
   * 現在の場所のエリアを取得する
   * @returns
   */
  getAreas() {
    return gameMapSight.getAreas(this._x, this._y);
  }
}
