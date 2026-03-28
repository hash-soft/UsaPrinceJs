import {
  gameSystem,
  gameMembers,
  gameParty,
  gameMap,
  gameFlags,
  gameVariables,
  setGameSystem,
  setGameTemp,
  setGameBattleTemp,
  setGameMembers,
  setGameMap,
  setGameParty,
  setGameTroop,
  setGameMenus,
  setGameAnimations,
  setGameScreen,
  setGameFlags,
  setGameVariables,
  gameTemp,
  system,
  gameTroop,
  setGameMapSight,
  setGameMarch,
  gameMarch,
} from './DataStore';
import { GameAnimations } from './GameAnimation';
import { GameBattler } from './GameBattler';
import { SaveObjectGameCharacter } from './GameCharacter';
import { GameMap, SaveObjectGameMap, SuspendObjectGameMap } from './GameMap';
import { GameMapSight } from './GameMapSight';
import { GameMarch, SuspendObjectGameMarch } from './GameMarch';
import { SaveObjectGameMember, SuspendObjectGameMember } from './GameMember';
import { GameMembers } from './GameMembers';
import {
  GameParty,
  SaveObjectGameParty,
  SuspendObjectGameParty,
} from './GameParty';
import { GameScreen } from './GameScreen';
import {
  GameSystem,
  SaveObjectGameSystem,
  SuspendObjectGameSystem,
} from './GameSystem';
import { GameBattleTemp, GameTemp, SuspendObjectGameTemp } from './GameTemp';
import { GameTroop } from './GameTroop';
import { GameFlags, GameVariables } from './GameUtils';
import { GameMenus } from './GameWindows';
import Utils, { SuspendObjectUtils } from './Utils';

/**
 * セーブヘッダ
 */
export interface SaveHeader {
  name: string;
  lv: number;
  locate: string;
  count: number;
}

/**
 * セーブオブジェクト
 */
export interface SaveObject {
  system: SaveObjectGameSystem;
  members: SaveObjectGameMember[];
  party: SaveObjectGameParty;
  march: SaveObjectGameCharacter;
  map: SaveObjectGameMap;
  flags: boolean[];
  variables: number[];
}

/**
 * セーブオブジェクトを作成する
 * @returns
 */
export const createSaveObject = (): SaveObject => {
  return {
    system: gameSystem.createSaveObject(),
    members: gameMembers.createSaveObject(),
    party: gameParty.createSaveObject(),
    march: gameMarch.leader.createSaveObject(),
    map: gameMap.createSaveObject(),
    flags: gameFlags.createSaveObject(),
    variables: gameVariables.createSaveObject(),
  };
};

/**
 * 中断オブジェクト
 */
export interface SuspendObject {
  utils: SuspendObjectUtils;
  system: SuspendObjectGameSystem;
  temp: SuspendObjectGameTemp;
  members: SuspendObjectGameMember[];
  party: SuspendObjectGameParty;
  march: SuspendObjectGameMarch;
  map: SuspendObjectGameMap;
  flags: boolean[];
  variables: number[];
}

/**
 * 中断ヘッダ
 */
export type SuspendHeader = SaveHeader;

/**
 * 中断オブジェクトを作成する
 * @returns
 */
export const createSuspendObject = (): SuspendObject => {
  return {
    utils: Utils.createSuspendObject(),
    system: gameSystem.createSuspendObject(),
    temp: gameTemp.createSuspendObject(),
    members: gameMembers.createSuspendObject(),
    party: gameParty.createSuspendObject(),
    march: gameMarch.createSuspendObject(),
    map: gameMap.createSuspendObject(),
    flags: gameFlags.createSuspendObject(),
    variables: gameVariables.createSuspendObject(),
  };
};

/**
 * ゲーム中のデータを削除する
 */
export const clearGameObjects = () => {
  setGameSystem(new GameSystem());
  setGameTemp(new GameTemp());
  setGameBattleTemp(new GameBattleTemp());
  setGameMembers(new GameMembers());
  setGameParty(new GameParty());
  setGameMap(new GameMap());
  setGameMapSight(new GameMapSight());
  setGameMarch(new GameMarch());
  setGameTroop(new GameTroop());
  setGameMenus(new GameMenus());
  setGameAnimations(new GameAnimations());
  setGameScreen(new GameScreen());
  setGameFlags(new GameFlags());
  setGameVariables(new GameVariables());
};

/**
 * スロットの指定範囲を取得する
 * @param startId
 * @param endId
 * @returns
 */
export const sliceSlot = (startId: number, endId: number) => {
  return gameTemp.slots.slice(startId, endId);
};

/**
 * システムスロットに値を設定する
 * @param name
 * @param value
 */
export const setSystemSlot = (name: string, value: string | number) => {
  setSlot(getSlotId(name), value);
};

/**
 * スロットに値を設定
 * @param id
 * @param value
 */
export const setSlot = (id: number, value: string | number) => {
  gameTemp.setSlot(id, value);
};

/**
 * スロットオブジェクトを取得する
 * @param id
 */
export const getSlot = (id: number) => {
  return gameTemp.getSlot(id);
};

/**
 * スロットオブジェクトを数値として取得する
 * @param id
 * @returns
 */
export const getSlotNumber = (id: number) => {
  return gameTemp.getSlotNumber(id);
};

/**
 * スロットオブジェクトを文字列として取得する
 * @param id
 * @returns
 */
export const getSlotText = (id: number) => {
  return gameTemp.getSlotText(id);
};

/**
 * システムスロットのIdを取得する
 * @param name
 */
export const getSlotId = (name: string): number => {
  return system.slotIds[name];
};

/**
 * システムスロットを取得
 * @param name
 * @returns
 */
export const getSystemSlot = (name: string): string | number => {
  return getSlot(getSlotId(name));
};

/**
 * システムスロットを数値として取得
 * @param name
 * @returns
 */
export const getSystemSlotNumber = (name: string): number => {
  return getSlotNumber(getSlotId(name));
};

/**
 * システムスロットをテキストとして取得
 * @param name
 * @returns
 */
export const getSystemSlotText = (name: string): string => {
  return getSlotText(getSlotId(name));
};

/**
 * フラグを設定
 * @param id
 * @param value
 */
export const setFlag = (id: number, value: boolean) => {
  gameFlags.setValue(id, value);
};

/**
 * フラグを取得
 * @param id
 */
export const getFlag = (id: number) => {
  return gameFlags.getValue(id);
};

/**
 * 変数を設定
 * @param id
 * @param value
 */
export const setVariable = (id: number, value: number) => {
  gameVariables.setValue(id, value);
};

/**
 * 変数を取得
 * @param id
 */
export const getVariable = (id: number) => {
  return gameVariables.getValue(id);
};

/**
 * Idから戦闘者を取得する
 * @param id
 * @returns
 */
export const idToBattler = (id: number) => {
  if (id < 0) {
    return;
  }
  const myself = GameBattler.toMyself(id);
  const group = GameBattler.toGroup(id);
  const index = GameBattler.toIndex(id);
  if (myself) {
    return gameParty.get(group, index);
  } else {
    return gameTroop.get(group, index);
  }
};
