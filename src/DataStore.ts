/**
 * グローバルデータに関するファイル
 */
import {
  Member,
  MemberParts,
  SkillList,
  Learning,
  Intelligence,
  Action,
  ActionEffect,
  ActionType,
  ActionExtra,
  ActionFigure,
  ActionStrike,
  ActionPatternList,
  ActionCondition,
  Item,
  Weapon,
  Armor,
  Skill,
  StateType,
  StateOver,
  Terrain,
  Enemy,
  Troop,
  Encounter,
  Effect,
  WindowData,
  WindowSet,
  MapInfo,
  MapPart,
  EventScript,
  TiledObjectProperty,
  System,
  State,
  ActionParts,
  ItemParts,
  StateParts,
} from './DataTypes';
import { GameAnimations } from './GameAnimation';
import { GameMap } from './GameMap';
import { GameMapSight } from './GameMapSight';
import { GameMarch } from './GameMarch';
import { GameMembers } from './GameMembers';
import { GameParty } from './GameParty';
import { GameScreen } from './GameScreen';
import { GameSystem } from './GameSystem';
import { GameTemp, GameBattleTemp } from './GameTemp';
import { GameTroop } from './GameTroop';
import { GameFlags, GameVariables } from './GameUtils';
import { GameMenus } from './GameWindows';

export const fileSettings = {
  baseUrl: './assets/data/',
  extension: '.json',
  keys: [
    'system',
    'memberParts',
    'members',
    'actionParts',
    'items',
    'itemParts',
    'skills',
    'stateParts',
    'terrains',
    'enemies',
    'troops',
    'encounters',
    'animations',
    'windows',
    'windowsets',
    'mapList',
    'commonScriptset',
  ],
};

/**
 * メンバーデータ
 */
export let members: Member[];
/**
 * メンバーに関する部品
 */
export let memberParts: MemberParts;
/**
 * スキルリスト
 */
export let skillLists: SkillList[];
/**
 * スキル習得情報
 */
export let learnings: Learning[];
/**
 * 知能
 */
export let intelligences: Intelligence[];
/**
 * 行動データ
 */
export let actions: Action[];
/**
 * 行動効果データ
 */
export let actionEffects: ActionEffect[];
/**
 * 行動の種類データ
 */
export let actionTypes: ActionType[];
/**
 * 行動おまけデータ
 */
export let actionExtras: ActionExtra[];
/**
 * 行動数値データ
 */
export let actionFigures: ActionFigure[];
/**
 * 打撃データ
 */
export let actionStrikes: ActionStrike[];
/**
 * 行動パターンリスト
 */
export let actionPatternLists: ActionPatternList[];
/**
 * 行動条件
 */
export let actionConditions: ActionCondition[];
/**
 * 道具データ
 */
export let items: Item[];
/**
 * 武器追加データ
 */
export let weapons: Weapon[];
/**
 * 防具追加データ
 */
export let armors: Armor[];
/**
 * 技能データ
 */
export let skills: Skill[];
/**
 * 状態データ
 */
export let states: State[];
/**
 * 状態タイプデータ
 */
export let stateTypes: StateType[];
/**
 * 状態上書きデータ
 */
export let stateOvers: StateOver[];
/**
 * 地形データ
 */
export let terrains: Terrain[];
/**
 * 敵データ
 */
export let enemies: Enemy[];
/**
 * 敵の群れデータ
 */
export let troops: Troop[];
/**
 * エンカウントデータ
 */
export let encounters: Encounter[];
/**
 * アニメーション効果データ
 */
export let animations: Effect[];
/**
 * ウィンドウデータ
 */
export let windows: WindowData[];
/**
 * ウィンドウ集合データ
 */
export let windowsets: WindowSet[];
/**
 * マップ一式リスト
 */
export let mapList: MapInfo[];
/**
 * マップ部品データ
 * タイルの組み合わせのこと
 */
export let mapParts: MapPart[];
/**
 * 共通スクリプト
 */
export let commonScriptset: EventScript[];
/**
 * システムデータ
 */
export let system: System;
/**
 * 単語データ
 */
export let terms: string[];
/**
 * マップのオブジェクトタイプデータ
 */
export let objectTypes: Map<string, TiledObjectProperty> = new Map();

/**
 * ゲーム中のシステムデータ
 */
export let gameSystem: GameSystem;
/**
 * ゲーム中の一時データ
 */
export let gameTemp: GameTemp;
/**
 * ゲーム中の戦闘一時データ
 */
export let gameBattleTemp: GameBattleTemp;
/**
 * ゲーム中のメンバーデータ
 */
export let gameMembers: GameMembers;
/**
 * ゲーム中のパーティデータ
 */
export let gameParty: GameParty;
/**
 * ゲーム中のマップデータ
 */
export let gameMap: GameMap;
/**
 * ゲーム中のマップ視界
 */
export let gameMapSight: GameMapSight;
/**
 * ゲーム中の隊列データ
 */
export let gameMarch: GameMarch;
/**
 * ゲーム中の敵の群れデータ
 */
export let gameTroop: GameTroop;
/**
 * ゲーム中のメニューデータ
 */
export let gameMenus: GameMenus;
/**
 * ゲーム中のアニメーションデータ
 */
export let gameAnimations: GameAnimations;
/**
 * ゲーム中のスクリーンデータ
 */
export let gameScreen: GameScreen;
/**
 * ゲーム中のフラグデータ
 */
export let gameFlags: GameFlags;
/**
 * ゲーム中の変数データ
 */
export let gameVariables: GameVariables;
/**
 * 最後に読み込んだセーブのヘッダー
 * 更新されていくのみのデータ
 */
export let lastSaveHeader: string = '';
/**
 * 最後に読み込んだセーブのデータ
 * 更新されていくのみのデータ
 */
export let lastSaveData: string = '';

/**
 * メンバーデータを設定する
 * @param value
 */
export const setMembers = (value: Member[]) => {
  members = value;
};

/**
 * メンバーに関する部品を設定する
 * @param value
 */
export const setMemberParts = (value: MemberParts) => {
  memberParts = value;
  skillLists = value.skillLists;
  learnings = value.learnings;
  intelligences = value.intelligences;
};

/**
 * 行動に関する部品を設定する
 * @param value
 */
export const setActionParts = (value: ActionParts) => {
  actions = value.actions;
  actionEffects = value.effects;
  actionTypes = value.types;
  actionExtras = value.extras;
  actionFigures = value.figures;
  actionStrikes = value.strikes;
  actionPatternLists = value.patternLists;
  actionConditions = value.conditions;
};

/**
 * 道具データを設定する
 * @param value
 */
export const setItems = (value: Item[]) => {
  items = value;
};

/**
 * 道具に関する部品を設定する
 * @param value
 */
export const setItemParts = (value: ItemParts) => {
  weapons = value.weapons;
  armors = value.armors;
};

/**
 * 技能データを設定する
 * @param value
 */
export const setSkills = (value: Skill[]) => {
  skills = value;
};

/**
 * 状態に関する部品を設定する
 * @param value
 */
export const setStateParts = (value: StateParts) => {
  states = value.states;
  stateTypes = value.types;
  stateOvers = value.overs;
};

/**
 * 地形データを設定する
 * @param value
 */
export const setTerrains = (value: Terrain[]) => {
  terrains = value;
};

/**
 * 敵データを設定する
 * @param value
 */
export const setEnemies = (value: Enemy[]) => {
  enemies = value;
};

/**
 * 敵の群れデータを設定する
 * @param value
 */
export const setTroops = (value: Troop[]) => {
  troops = value;
};

/**
 * エンカウントデータを設定する
 * @param value
 */
export const setEncounters = (value: Encounter[]) => {
  encounters = value;
};

/**
 * アニメーション効果データを設定する
 * @param value
 */
export const setAnimations = (value: Effect[]) => {
  animations = value;
};

/**
 * ウィンドウデータを設定する
 * @param value
 */
export const setWindows = (value: WindowData[]) => {
  windows = value;
};

/**
 * ウィンドウ群のデータを設定する
 * @param value
 */
export const setWindowsets = (value: WindowSet[]) => {
  windowsets = value;
};

/**
 * マップ情報のデータを設定する
 * @param value
 */
export const setMapList = (value: MapInfo[]) => {
  mapList = value;
};

/**
 * マップ部品のデータを設定する
 * @param value
 */
export const setMapParts = (value: MapPart[]) => {
  mapParts = value;
};

/**
 * 共通スクリプトデータを設定する
 * @param value
 */
export const setCommonScriptset = (value: EventScript[]) => {
  commonScriptset = value;
};

/**
 * システムデータを設定する
 * @param value
 */
export const setSystem = (value: System) => {
  system = value;
  terms = value.terms;
};

/**
 * マップのオブジェクトタイプデータを設定する
 * @param value
 */
export const setObjectTypes = (value: Map<string, TiledObjectProperty>) => {
  objectTypes = value;
};

/**
 * タイルオブジェクトプロパティを取得する
 * @param key
 * @returns
 */
export const getTiledObjectProperty = (key: string) => {
  return objectTypes.get(key);
};

/**
 * ゲーム中のシステムデータを設定する
 * @param value
 */
export const setGameSystem = (value: GameSystem) => {
  gameSystem = value;
};

/**
 * ゲーム中の一時データを設定する
 * @param value
 */
export const setGameTemp = (value: GameTemp) => {
  gameTemp = value;
};

/**
 * ゲーム中の戦闘一時データを設定する
 * @param value
 */
export const setGameBattleTemp = (value: GameBattleTemp) => {
  gameBattleTemp = value;
};

/**
 * ゲーム中のメンバーデータを設定する
 * @param value
 */
export const setGameMembers = (value: GameMembers) => {
  gameMembers = value;
};

/**
 * ゲーム中のマップデータを設定する
 * @param value
 */
export const setGameMap = (value: GameMap) => {
  gameMap = value;
};

/**
 * ゲーム中のマップ視界データを設定する
 * @param value
 */
export const setGameMapSight = (value: GameMapSight) => {
  gameMapSight = value;
};

/**
 * ゲーム中の隊列データを設定する
 * @param value
 */
export const setGameMarch = (value: GameMarch) => {
  gameMarch = value;
};

/**
 * ゲーム中のパーティデータを設定する
 * @param value
 */
export const setGameParty = (value: GameParty) => {
  gameParty = value;
};

// /**
//  * ゲーム中のプレイヤーデータを設定する
//  * @param value
//  */
// export const setGamePlayer = (value: GamePlayer) => {
//   gamePlayer = value;
// };

/**
 * ゲーム中の敵の群れデータを設定する
 * @param value
 */
export const setGameTroop = (value: GameTroop) => {
  gameTroop = value;
};

/**
 * ゲーム中のメニューデータを設定する
 * @param value
 */
export const setGameMenus = (value: GameMenus) => {
  gameMenus = value;
};

/**
 * ゲーム中のアニメーションデータを設定する
 * @param value
 */
export const setGameAnimations = (value: GameAnimations) => {
  gameAnimations = value;
};

/**
 * ゲーム中のスクリーンデータを設定する
 * @param value
 */
export const setGameScreen = (value: GameScreen) => {
  gameScreen = value;
};

/**
 * ゲーム中のフラグデータを設定する
 * @param value
 */
export const setGameFlags = (value: GameFlags) => {
  gameFlags = value;
};

/**
 * ゲーム中の変数データを設定する
 * @param value
 */
export const setGameVariables = (value: GameVariables) => {
  gameVariables = value;
};

/**
 * 最後に読み込んだセーブのヘッダーを保持
 * @param value
 */
export const setLastSaveHeader = (value: string) => {
  lastSaveHeader = value;
};

/**
 * 最後に読み込んだセーブのデータを保持
 * @param value
 */
export const setLastSaveData = (value: string) => {
  lastSaveData = value;
};
