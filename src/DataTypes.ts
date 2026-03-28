type Primitive = number | string | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Date | Error | RegExp;

type DeepNonNullable<T> = T extends Builtin
  ? NonNullable<T>
  : { [key in keyof T]-?: DeepNonNullable<T[key]> };

export interface Battler {
  id: number;
  name: string;
  genderId: number;
  raceId: number;
  intelligenceId: number;
  elementDefs: number;
  confuseAction: number;
}

export const enum ESelectType {
  NoLimit = 0,
  NoItem = 1,
  NoSkill = 2,
  NoAlone = 4,
}

export interface Member extends Battler {
  imageId: number;
  imageIndex: number;
  downId: number;
  downIndex: number;
  classId: number;
  statesId: number;
  selectType: number;
  initialLevel: number;
  equipId: number;
  usableId: number;
  paramIds: number[];
  subParamIds: number[];
  expId: number;
  learningId: number;
  skillListId: number;
  battleSkillListId: number;
  items: PersonalItem[];
}

export interface PersonalItem {
  id: number;
  equip: boolean;
}

export interface Enemy extends Battler {
  imageName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  boots: number;
  params: number[];
  subParams: number[];
  actionTimesId: number;
  exp: number;
  gold: number;
  itemIds: number[];
  itemRatesId: number;
  patternListId: number;
  hpCorrectId: number;
  mpCorrectId: number;
}

export type MemberParts = DeepNonNullable<
  typeof import('../assets/data/memberParts.json')
>;
export type Parameter = MemberParts['parameters'][number];
export type ParameterRate = Parameter['rates'][number];
export type SkillList = MemberParts['skillLists'][number];
export type Exp = MemberParts['exps'][number];
export type ExpRate = Exp['list'][number];
export type Learning = MemberParts['learnings'][number];
export type Intelligence = MemberParts['intelligences'][number];

export interface ActionType {
  id: number;
  physical: boolean;
  numCorrection: number;
  multipleType: number;
  multipleId: number;
  messageIds: {
    nodamage1: number;
    nodamage2: number;
    evasion1: number;
    evasion2: number;
    failed1: number;
    failed2: number;
    reflection1: number;
    reflection2: number;
  };
  animationIds: {
    nodamage1: number;
    nodamage2: number;
    evasion1: number;
    evasion2: number;
    failed1: number;
    failed2: number;
    reflection1: number;
    reflection2: number;
  };
}

export interface Item {
  id: number;
  name: string;
  price: number;
  sell: boolean;
  discard: boolean;
  kind: EItemKind;
  consumable: boolean;
  actionId: number;
  battleActionId: number;
  menuEnd: boolean;
  weaponId: number;
  armorId: number;
  paramId: number;
  subParamId: number;
  elementDefLevel: number;
  statesId: number;
  mapAvailable: boolean;
  note: string[];
  availableIds: boolean[];
}

export interface ItemParts {
  weapons: Weapon[];
  armors: Armor[];
}

export interface Weapon {
  id: number;
  skillId: number;
  numRepeat: number;
  value: number;
  specialId: number;
  effectId: number;
  correctId: number;
}

export interface Armor {
  id: number;
  value: number;
  cutId: number;
}

export const enum EItemKind {
  Normal,
  Weapon,
  Armor,
  Shield,
  Helmet,
  Accessory,
}

export interface Skill {
  id: number;
  name: string;
  category: number;
  actionId: number;
  battleActionId: number;
  menuEnd: boolean;
  autoUsable: boolean;
  note: string[];
}

export interface Action {
  id: number;
  type: number;
  mpCost: number;
  scope: number;
  weapon: number;
  limitStateTypeId: number;
  successRateId: number;
  hitRateId: number;
  hitRaceValueId: number;
  animationId: number;
  messageId: number;
  extraId: number;
  safety: boolean;
  successMessageId: number;
  failedMessageId: number;
  effectIds: number[];
}

export const enum EWeaponEffect {
  Repeat = 1,
  Effect = 2,
}

export interface ActionPattern {
  id: number;
  rating: number;
}

export interface ActionPatternList {
  id: number;
  conditionId: number;
  limit: number;
  priorityId: number;
  select: EActionPatternSelect;
  list: ActionPattern[];
}

export const enum EActionPatternSelect {
  Random,
  Rotation,
  GroupRotation,
}

export const enum EActionEffectCode {
  Calc = 1,
  Figure,
  State,
  Buff,
  Release,
  TurnCorrect,
  Growth,
  Script,
  Special,
  Encounter,
  FloorDamage,
}

export const enum EActionEffectType {
  Minus = 0,
  Plus,
  Drain,
}

export const enum EActionEffectValue1 {
  Hp = 0,
  Mp = 1,
}

export const enum EActionEffectStateCnd {
  None,
  Damage,
}

export const enum EActionEffectSpecial {
  Escape,
  Call,
}

export interface ActionEffect {
  id: number;
  code: number;
  elementId: number;
  refId: number;
  type: number;
  magicId: number;
  luckId: number;
  value1: number;
  value2: number;
}

export interface ActionEffectBuff {
  paramId: number;
  value: number;
  condition: EActionEffectStateCnd;
  turns: number;
}

// 効果解除
export interface ActionEffectRelease {
  releaseId: number;
  type: EActionEffectReleaseType;
  dispInfo: number;
}

export const enum EActionEffectReleaseType {
  State = 1,
  Buff = 2,
  All = State | Buff,
}

export interface ActionStrike {
  id: number;
  calcId: number;
  random: ERandomRange;
  rateId: number;
  min: number;
  max: number;
  luckId: number;
  otherId: number;
  zeroId: number;
}

export const enum ERandomRange {
  MinToMax,
  ZeroToMax,
}

/**
 * ランダムなし時のタイプ
 */
export const enum EActionNoRandomType {
  Center,
  Min,
  Max,
}

export interface ActionExtra {
  preScriptId: number;
  scriptId: number;
  expRateId: number;
  goldRateId: number;
  itemRateId: number;
  leave: boolean;
  speedId: number;
  userEffectId: number;
  dispId1: number;
  dispId2: number;
  actionPatternListId: number;
  switchingId: number;
  attemptsId: number;
  repeatId: number;
}

export const enum EActionExtraSpeed {
  AgiValue,
  AgiRateId,
  PosValue,
  PosRateId,
}

export const enum EActionExtraDisp {
  Message,
  Option,
}

export const enum EActionSwitchCondition {
  Rate = 1,
  SubParam,
  ElementDef,
}

export interface ActionConditionParam {
  param1: number;
  param2: number;
  opeType: number;
}

export interface ActionCondition extends ActionConditionParam {
  id: number;
  type: EActionConditionType;
}

export const enum EActionConditionType {
  Unfulfilled,
  Turn,
  Hp,
  Mp,
  Level,
  State,
  opponentLevel,
  Times,
  equalZero,
  TurnStart,
}

export interface ActionParts {
  actions: Action[];
  types: ActionType[];
  effects: ActionEffect[];
  strikes: ActionStrike[];
  figures: ActionFigure[];
  extras: ActionExtra[];
  patternLists: ActionPatternList[];
  conditions: ActionCondition[];
}

export interface ActionFigure {
  id: number;
  min1: number;
  max1: number;
  rate1: number;
  min2: number;
  max2: number;
  rate2: number;
}

export interface TerrainDamage {
  value: number;
  animationId: number;
}

export interface Terrain {
  id: number;
  encounterRateId: number;
  battleBackName: string;
  damage: TerrainDamage;
}

export const enum ETroopOrderType {
  Asc,
  Des,
  Random,
}

export interface Troop {
  name: string;
  lv: number;
  orderType: number;
  appears: Array<{ enemyId: number; min: number; max: number }>;
  eventId: number;
}

export interface BattleConditionParam extends ActionConditionParam {
  target: number;
  num: number;
}

export interface BattleEvent {
  id: number;
  conditionIds: number[];
  scriptId: number;
  span: EBattleEventSpan;
}

export const enum EBattleEventSpan {
  Battle,
  Turn,
  Moment,
}

export const enum EBattleConditionType {
  Unfulfilled,
  Turn, // ターン数
  TroopConsume, // 敵消耗度
  PartyConsume, // 味方消耗度
  Enemy, // 敵HP
  Member, // 味方HP
  TurnEnd, // ターン終了時
}

export interface BattleCondition extends ActionConditionParam {
  id: number;
  type: EBattleConditionType;
  target: number;
  num: number;
}

export const enum EStateRestriction {
  None, // 制約なし
  Auto, // 自動
  Confuse, // 混乱
  Incapable, // 行動不能
  Force, // 強制行動
}

export const enum StateRemoveTiming {
  None,
  BeforeAction,
  AfterAction,
  EndOfTurn,
}

export interface StateParts {
  states: State[];
  types: StateType[];
  overs: StateOver[];
}

export interface State {
  id: number;
  name: string;
  type: number;
  restriction: EStateRestriction;
  correctId: number;
  sealId: number;
  subParamId: number;
  reflectionId: number;
  visual: number;
  word: string;
  colorId: number;
  iconId: number;
  priority: number;
  beginPriority: number;
  endPriority: number;
  updatable: boolean;
  removeBattleEnd: boolean;
  removeRateId: number;
  removeTiming: number;
  messageIds: {
    recover1: number;
    recover2: number;
    failedRecover: number;
    turn: number;
    damage1: number;
    damage2: number;
    already1: number;
    already2: number;
  };
  animationIds: {
    recover1: number;
    recover2: number;
    failedRecover: number;
    turn: number;
    damage1: number;
    damage2: number;
    already1: number;
    already2: number;
  };
  slipDamageId: number;
  floorDefenseId: number;
}

export interface StateType {
  id: number;
  outMessageId: number;
}

export interface StateOver {
  id: number;
  removeRateId: number;
  messageIds: {
    damage1: number;
    damage2: number;
  };
  animationIds: {
    damage1: number;
    damage2: number;
  };
}

export const enum EEffectCode {
  Wait,
  Flash,
  Opacity,
  Blur,
  Noise,
  Visible,
  Move,
  Ses,
  Scale,
  Rotation,
  ZOrder,
  Settings,
}

export const enum EEffectVisible {
  None,
  Off,
  On,
  Mirror,
}

export const enum EEffectMoveType {
  None,
  Moment,
  Add,
  Value,
}

export const enum EEffectScaleType {
  None,
  Moment,
  Add,
  Value,
}

export const enum EEffectSettings {
  Range,
}

export const enum EEffectRange {
  Target,
  Scene,
  Window,
}

export interface EffectCommand {
  duration: number;
  code: number;
  params: number[];
}

export interface Effect {
  id: number;
  length: number;
  list: EffectCommand[];
}

export interface DamageCut {
  id: number;
  type: EDamageCutType;
  rateIds: number[];
}

export const enum EDamageCutType {
  Rate,
  Reduction,
}

export const enum EParamEffectCalcType {
  Sub,
  Ave,
  Add,
}

export const enum EParamEffectApplyType {
  Add,
  Mul,
  Degree,
}

export interface ParamEffect {
  id: number;
  subject: number;
  target: number;
  calcType: EParamEffectCalcType;
  applyType: EParamEffectApplyType;
  applyValue: number;
  rateId: number;
}

export interface Element {
  id: number;
  cutId: number;
}

export interface Correct {
  attack: boolean;
  conditional: boolean; // 複数攻撃の補正をうける
  figureId: number;
  actionTypes: number;
}

export const enum ERateType {
  Const,
  Special,
}

export interface Rate {
  id: number;
  value1: number;
  value2: number;
}

export const enum EGeneralWord {
  Attack,
  Skill,
  Parry,
  Item,
}

export interface System {
  startMapId: number;
  startX: number;
  startY: number;
  startDirection: number;
  maxMember: number;
  startMembers: number[];
  startMemberId: number;
  startMaxParty: number;
  startNpcs: Array<[number, number]>;
  startMaxNpc: number;
  startNpcId: number;
  maxPartyMember: number;
  maxItem: number;
  maxGold: number;
  goldUnit: string;
  goldName: string;
  titleBack: string;
  startBack: string;
  windowSkinName: string;
  messageWindowId: number;
  battleMessageWindowId: number;
  battleStatusWindowId: number;
  autoScriptIds: number[];
  mapPartsNames: string[];
  targetPriorities: number[];
  partyRaidRateId: number;
  partySurpriseRateId: number;
  troopRaidRateId: number;
  troopSurpriseRateId: number;
  subParamRateId: number;
  hitLuckId: number;
  evasionLuckId: number;
  damageCutLuckId: number;
  stopEscapeSkillId: number;
  battleSpeed: number;
  encounterEffectId: number;
  escapeSuccessWait: number;
  switchingRateId: number;
  learnMessageIds: number[];
  plantSeed: boolean;
  correctExp: number;
  correctGold: number;
  saveInfo: {
    path: string;
    format: string;
    max: number;
    file: string;
    initName: string;
    suspendPath: string;
    suspendFormat: string;
  };
  switchingSpeed: { fadeOut: number; fadeIn: number };
  addressList: number[][];
  wordList: {
    itemAction: string[];
    params: string[];
    memberParams: string[];
  };
  kanaList: [];
  normalSkillIds: { attack: number; parry: number; enemy: number };
  messageIds: {
    mapNoSpell: number;
  };
  termIds: {
    hp: number;
    mp: number;
  };
  animationIds: {
    critical1: number;
  };
  soundIds: { confirm: number };
  musicIds: {
    title: number;
    defeat: number;
    victory: number;
    levelUp: number;
    battle: number;
  };
  slotIds: {
    actor: number;
  };
  commonScriptIds: {
    notFindTalk: number;
  };
  triggerItems: TriggerItem[];
  triggerSkills: TriggerItem[];
  battleEvents: BattleEvent[];
  battleConditions: BattleCondition[];
  moveRoutes: MoveRoute[];
  positions: Position[];
  warpPlaces: WarpPlace[];
  charsets: Charset[];
  slipDamages: SlipDamage[];
  damageCuts: DamageCut[];
  paramEffects: ParamEffect[];
  elements: Element[];
  corrects: Correct[];
  vehicles: Vehicles[];
  rates: Rate[];
  numberLists: number[][];
  numberMaps: NumberMap[];
  sounds: Sound[];
  musics: Music[];
  pictures: Picture[];
  fonts: GameFont[];
  flags: [];
  variables: [];
  slots: [];
  terms: string[];
  messages: string[];
}

export const enum ETerm {
  Skill = 1,
  Item = 2,
  Attack = 51,
  Parry = 52,
}

export interface Position {
  id: number;
  name: string;
  mapId: number;
  x: number;
  y: number;
}

export interface WarpPlace {
  id: number;
  name: string;
  positionIds: number[];
}

export interface TriggerItem {
  id: number;
  trigger: number;
}

export const enum EDecisionTiming {
  BeforeTurn,
  BeforeAction,
}

export const enum EAutoTargetType {
  Off,
  On,
}

export const enum EInactionType {
  Do,
  UntilNotice, // 気づくまでする
  DoNot, // しない
}

export const enum EMeaninglessType {
  Do,
  DoNot, // 効果がなければしない
  Flexible, // 効果が低くてもしない
}

export const enum EAimType {
  FromFirst, // 先頭優先
  FromLast, // 後ろ優先
  Strong, // HP高い
  Weak, // HP低い
  Random, // ランダム
  Effective, //効率的
}

export interface NumberMap {
  key: number;
  value: number;
}

export interface Charset {
  id: number;
  name: string;
  filename: string;
  columns: number;
  charWidth: number;
  charHeight: number;
  hitScale: number;
  pattern: number;
  list: number[];
}

export interface Vehicles {
  id: number;
  name: string;
  imageId: number;
  imageIndex: number;
  bgmId: number;
  positionId: number;
  type: number;
  gatherType: number;
  speed: number;
  warpFlagId: number;
  warpDirection: number;
  passableIds: number[];
  impassableIds: number[];
  cantGetOffIds: number[];
}

export interface SlipDamage {
  id: number;
  steps: number;
  value: number;
  animationId: number;
  minHp: number;
}

export interface Sound {
  id: number;
  name: string;
  filename: string;
  start: number;
  end: number;
  speed: number;
  volume: number;
}

export interface Music {
  id: number;
  name: string;
  filename: string;
  start: number;
  end: number;
  speed: number;
  volume: number;
}

export enum EPictureType {
  Image,
  Text,
  Color,
}

export interface Picture {
  id: number;
  name: string;
  type: number;
  familyName: string;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  param5: number;
}

export interface GameFont {
  id: number;
  name: string;
  filename: string;
}

export interface Encounter {
  //lv: number;
  troops: Array<{ id: number; priority: number }>;
}

export interface Area {
  id: number;
  encounterId: number;
  terrainType: number;
}

export interface Eventset {
  objects: EventObject[];
  moveRoutes?: MoveRoute[];
  areas?: Area[];
}

export interface EventScript {
  id: number;
  name: string;
  conditions: EventCondition[];
  list: EventCommand[];
}

export interface EventCondition {
  param1: number;
  param2: number;
  compare: number;
  type: number;
}

export const enum EConditionCompareFlag {
  OFF,
  ON,
}

export const enum EConditionCompareVariable {
  EQUAL,
  MORE,
  LESS,
  GREATER,
  SMALLER,
  NOTEQUAL,
  AND,
  NAND,
}

export const enum EConditionCompareSlot {
  EQUAL,
  MORE,
  LESS,
  GREATER,
  SMALLER,
  NOTEQUAL,
  AND,
  NAND,
}

/**
 * トリガーの16進数定義
 */
export const enum EEventTriggerHex {
  None = 0,
  Talk = 0x01,
  Search = 0x02,
  Door = 0x04,
  SelfContact = 0x08,
  Contacted = 0x10,
  Auto = 0x20,
  Counter = 0x40,
  Expand = 0xff00,
  Front = Talk | Search | Door | Expand,
  Current = Search | SelfContact | Expand,
  Multi = Talk | Search | Door | Counter,
  All = 0xffff,
}

interface EventObjectBase {
  layerIndex?: number;
  imageId?: number;
  index?: number;
  direction?: number;
  moveType?: EMoveType;
  moveRouteId?: number;
  moveRegionKey?: string;
  speed?: number;
  lockType?: ELockType;
  trigger?: number;
  inout?: string;
  priority?: number;
  partId?: number;
  partOrder?: EMapPartOrder;
}

export interface EventObject extends EventObjectBase {
  id: number;
  name: string;
  pages: EventPage[];
}

export interface EventPage extends EventObjectBase {
  scriptId: number;
  commonScriptId: number;
}

export interface MapInfo {
  id: number;
  name: string;
  map: string;
  eventset: string;
  scriptset: string;
  speed: number;
  slipDamageRateId: number;
  valuesId: number;
  autoBgm: boolean;
  bgmId: number;
  vehicleBgm: boolean;
  startupId: number;
  cleanupId: number;
  autoIds: number[];
  encounterId: number;
  encounterOptionId: number;
  encounterElementsId: number;
  terrainId: number;
  saveName: string;
  savePositionId: number;
  saveDirection: number;
}

export enum EEncounterOption {
  Rate,
  SkipSteps,
  PartyRaid,
  PartySurprise,
  TroopRaid,
  TroopSurprise,
}

/**
 * マップ部品の型
 */
export interface MapPart {
  sizeX: number;
  sizeY: number;
  layers: number[][];
}

export const enum EMapPartOrder {
  LeftTop, // 0,0
  LeftBottom, // 0,-
  RightTop, // -,0
  RightBottom, // -,-
}

/**
 * 移動タイプ
 */
export const enum EMoveType {
  None,
  Random,
  Near,
  Custom,
  CustomCommon = 3,
  CustomMap,
}

/**
 * ロックタイプ
 */
export const enum ELockType {
  KEEP, // 向きを変えない
  HOLDING, // 向いたまま
  ABOUT, // 向き直る
}

/**
 * オブジェクト優先度の16進数定義
 */
export const enum EObjectPriorityHex {
  None = 0,
  Front = 0x01, // 前方有効
  Collision = 0x02,
  Player = 0x04,
  PlayerCollision = Collision | Player,
}

export interface MoveRoute {
  id: number;
  repeat: boolean;
  skippable: boolean;
  moveFrequency: number;
  list: MoveRouteCommand[];
}

export interface MoveRouteCommand {
  code: number;
  parameters: number[];
}

export interface EventCommand {
  code: number;
  parameters: Array<number | string>;
}

export interface TiledObjectType {
  name: string;
  properties: TiledObjectProperty;
}

export type TiledObjectKey =
  | 'character'
  | 'collision'
  | 'counter'
  | 'poison'
  | 'range'
  | 'room'
  | 'tile'
  | 'upper'
  | 'walter';

export interface TiledObjectProperty {
  objectId?: number;
  collision?: boolean;
  collision4?: number;
  counter?: boolean;
  terrainId?: number;
  roomId?: number;
  upper?: boolean;
  anim?: number;
  direction?: number;
  pattern?: number;
}

export interface WindowData {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  paddingLeft: number;
  paddingTop: number;
  itemWidth: number;
  itemHeight: number;
  cursor: boolean;
  visible: boolean;
  column: number;
  row: number;
  maxItem: number;
  position: string;
  fluctuate: boolean;
  stateColor: boolean;
  scroll: boolean;
  inactiveColor: boolean;
  headerReverse: boolean;
  colGroupCount: number;
  colGroupSpace: number;
  propertyNames: string[];
  textAlign: string;
  headerProperty: string;
  className: string;
  header: unknown[];
  body: unknown[];
}

export interface WindowSet {
  id: number;
  windowIds: number[];
  className: string;
}

export const enum EShakeType {
  Normal,
  MapOnly,
  CharacterForce,
}
