import { ERoomChange, ShaderTilemap } from './ShaderTilemap';
import { SpriteCharacter } from './SpriteCharacter';
import { EMapScale } from './GameConfig';
import {
  gameScreen,
  gameMap,
  gameTemp,
  gameMapSight,
  gameMarch,
} from './DataStore';
import { ViewBase } from './ViewBase';
import { GameMaterial } from './GameMaterial';
import { EffectTarget } from './SpriteEffect';

/**
 * マップ表示クラス
 */
export class ViewMap extends ViewBase {
  /**
   * タイルマップ
   */
  private _shaderTilemap: ShaderTilemap;
  /**
   * イベントキャラクターのスプライト
   */
  private _characterSprites: SpriteCharacter[];
  /**
   * プレイヤーのスプライト
   */
  private _playerSprites: SpriteCharacter[];
  /**
   * 部屋変更状態
   */
  private _roomChange: ERoomChange;

  /**
   * コンストラクタ
   */
  constructor() {
    super();
    this._shaderTilemap = new ShaderTilemap();
    this._characterSprites = [];
    this._playerSprites = [];
    this._roomChange = ERoomChange.None;
  }

  /**
   * スプライトの表示状態を設定する
   * updateごとに表示状態を変えているので
   * スナップを撮りたいなどの一時的な変更に使用する
   */
  setVisibleSprite(value: boolean) {
    for (const sprite of this._playerSprites) {
      sprite.setVisible(value);
    }
    for (const sprite of this._characterSprites) {
      sprite.setVisible(value);
    }
  }

  /**
   * 描画オブジェクトを作成
   * 再設定するので再作成前に削除する必要はない
   */
  create() {
    this._shaderTilemap.setup({
      mapWidth: gameMapSight.width,
      mapHeight: gameMapSight.height,
      layerData: gameMapSight.layerData,
      coverData: gameMap.coverData,
      roomData: gameMapSight.roomData,
      roomId: gameMapSight.currentRoomId,
      tileWidth: gameMap.tileWidth,
      tileHeight: gameMap.tileHeight,
      tilesets: gameMapSight.tilesets,
      layerOffData: gameMapSight.layerOffData,
      coverOffData: gameMap.coverOffData,
      tiles: gameMapSight.tiles,
    });

    this._removeCharacter();

    this._characterSprites = gameMapSight.mapCharacters(
      (character) => new SpriteCharacter(character)
    );
    for (let i = 0; i < gameMapSight.vehicles.length; i++) {
      const vehicle = gameMapSight.vehicles[i];
      this._characterSprites.push(new SpriteCharacter(vehicle));
    }
    // 隊列歩行
    this._playerSprites.push(new SpriteCharacter(gameMarch.leader));
    const players = gameMarch.followers;
    for (let i = 0; i < players.length; i++) {
      this._playerSprites.push(new SpriteCharacter(players[i]));
    }
  }

  /**
   * 現在の部屋Idに置き換える
   * @param roomId
   */
  replaceCurrentRoomId() {
    this._shaderTilemap.replaceRoomId(gameMapSight.currentRoomId);
  }

  /**
   * 更新
   */
  update() {
    // 画面表示設定
    this._updateTilemap();
    this._updateCharacters();
    this._updatePlayer();
    super.update();
  }

  /**
   * キャラクターの更新
   */
  private _updateCharacters() {
    const prevTotalLength = this._characterSprites.length;
    const totalLength =
      gameMapSight.characterLength + gameMapSight.vehicles.length;
    for (let i = prevTotalLength; i < totalLength; i++) {
      this._characterSprites.push(
        new SpriteCharacter(
          gameMapSight.vehicles[i - gameMapSight.characterLength]
        )
      );
    }
    for (const sprite of this._characterSprites) {
      sprite.update();
    }
  }

  /**
   * プレイヤーの更新
   */
  private _updatePlayer() {
    this._checkPlayers();
    for (const sprite of this._playerSprites) {
      sprite.update();
    }
  }

  /**
   * プレイヤーが増減しているかの確認
   */
  private _checkPlayers() {
    const length = this._playerSprites.length;
    const value = gameMarch.displayLength() - length;
    if (value > 0) {
      for (let i = 0; i < value; i++) {
        this._playerSprites.push(
          new SpriteCharacter(gameMarch.getPlayer(length + i))
        );
      }
    } else if (value < 0) {
      const sprites = this._playerSprites.splice(length + value);
      for (const sprite of sprites) {
        sprite.remove();
      }
    }
  }

  /**
   * タイルマップの更新
   */
  private _updateTilemap() {
    this._shaderTilemap.offsetX = Math.floor(
      (gameMapSight.dispX + gameScreen.offsetX) / EMapScale.Scale
    );
    this._shaderTilemap.offsetY = Math.floor(
      (gameMapSight.dispY + gameScreen.offsetY) / EMapScale.Scale
    );
    this._shaderTilemap.setReplacePositions(gameTemp.replaceTilePositions);
    this._updateRoom();
    this._shaderTilemap.update();
    // 更新タイル情報をクリア
    gameTemp.clearReplaceTilePositions();
  }

  /**
   * 部屋の更新
   */
  private _updateRoom() {
    if (gameMapSight.roomOpening) {
      if (this._roomChange !== ERoomChange.Show) {
        this._roomChange = ERoomChange.Show;
        this._shaderTilemap.startShowRoom(gameMapSight.currentRoomId);
      }
      // 開く処理を入れる
      this._shaderTilemap.setShowRoomRange(gameMapSight.getOpenRoomRange());
    } else if (gameMapSight.roomClosing) {
      if (this._roomChange !== ERoomChange.Hide) {
        this._roomChange = ERoomChange.Hide;
        this._shaderTilemap.startHideRoom(gameMapSight.currentRoomId);
      }
      this._shaderTilemap.setShowRoomRange(gameMapSight.getCloseRoomRange());
    } else {
      if (this._roomChange !== ERoomChange.None) {
        this._shaderTilemap.endRoomChange();
      }
    }
  }

  /**
   * キャラクターを削除
   */
  private _removeCharacter() {
    for (const sprite of this._characterSprites) {
      sprite.remove();
    }
    this._characterSprites = [];
    for (const sprite of this._playerSprites) {
      sprite.remove();
    }
    this._playerSprites = [];
  }

  /**
   * 削除
   */
  override remove() {
    super.remove();
    this._removeCharacter();
    this._shaderTilemap.removeDisplay();
  }

  /**
   * 対象スプライトを検索する
   * @param target
   * @returns
   */
  protected override _findTargetSprite(
    target: GameMaterial
  ): undefined | EffectTarget {
    return (
      this._playerSprites.find((sprite) => sprite.equalMaterial(target)) ??
      this._characterSprites.find((sprite) => sprite.equalMaterial(target))
    );
  }
}
