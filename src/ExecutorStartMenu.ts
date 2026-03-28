import { gameTemp, system } from './DataStore';
import {
  getSlotId,
  SaveHeader,
  setSlot,
  setSystemSlot,
  SuspendHeader,
} from './DataUtils';
import { EmbeddedMenuInfo, ExecutorEmbeddedBase } from './ExecutorEmbedded';
import { GameLog } from './GameLog';
import { SaveFileInfo, SuspendFileInfo } from './GameTemp';
import { EDefine, EErrorMessage, GameUtils } from './GameUtils';
import Utils from './Utils';

/**
 * タイトルコマンド
 */
const enum EStartCommand {
  OPEN,
  MAKE,
  COPY,
  REMOVE,
}

/**
 * タイトルメニュー定数定義
 */
const enum EExecutorStartMenu {
  JudgeData,
  WaitResult,
  CommandNew,
  CommandSelect,
  CommandFull,
  DiaryMake,
  DiaryConfirm,
  DiaryInvalidMes,
  SuspendConfirm,
  DiaryCopy,
  DiaryMove,
  DiaryCopyDest,
  DiaryRemoveConfirm,
  InputName,
  SaveResult,
}

/**
 * 組み込み開始メニュークラス
 */
export class ExecutorStartMenu extends ExecutorEmbeddedBase {
  /**
   * 選択日記Id
   */
  private _selectDiaryId: number = 0;
  /**
   * 新規インデックステーブル
   */
  private static StartNewIndex = [EStartCommand.MAKE, -1, -1, -1];
  /**
   * データありインデックステーブル
   */
  private static StartSelectIndex = [
    EStartCommand.OPEN,
    EStartCommand.MAKE,
    EStartCommand.COPY,
    EStartCommand.REMOVE,
  ];
  /**
   * 全データありインデックステーブル
   */
  private static StartFullIndex = [
    EStartCommand.OPEN,
    EStartCommand.REMOVE,
    -1,
    -1,
  ];

  /**
   * 選択日記Idを選択インデックスから設定する
   * @param index
   */
  private _setSelectDiaryId(id: number) {
    this._selectDiaryId = id;
  }

  /**
   * メニュー情報
   */
  protected _getMenuInfos(): EmbeddedMenuInfo[] {
    return [
      { menuId: 0 }, // データ判定
      { menuId: 0 }, // 結果待ち
      { menuId: 11 }, // 新規
      { menuId: 12 }, // 選択
      { menuId: 13 }, // 全使用
      { menuId: 14, extra: GameUtils.getMenuExtraSlotIds() }, // 日記作成リスト
      { menuId: 15, extra: GameUtils.getMenuExtraSlotIds() }, // 開く日記選択
      { menuId: 0, messageNames: ['invalidDiary'] }, // 無効日記メッセージ
      { menuId: 81, messageNames: ['confirmSuspendStart'] }, // 中断から開始確認
      { menuId: 15, extra: GameUtils.getMenuExtraSlotIds() }, // 写す日記選択
      { menuId: 15, extra: GameUtils.getMenuExtraSlotIds() }, // 削除日記選択
      { menuId: 14, extra: GameUtils.getMenuExtraSlotIds() }, // 写し先選択
      { menuId: 81, messageNames: ['removeDiaryConfirm'] }, // 削除確認
      { menuId: 9 }, // 名前入力
      { menuId: 0 }, // セーブ結果
    ];
  }

  /**
   * カスタムコマンド
   * @param newPos
   * @param params
   * @returns
   */
  protected _createCustomCommand(newPos: number) {
    switch (newPos) {
      case EExecutorStartMenu.SuspendConfirm:
      case EExecutorStartMenu.DiaryRemoveConfirm:
        this._createMessageCommand(newPos);
        this._pushSeCommand(system.soundIds.confirm);
        this._createMenuCommand(newPos);
        return true;
      case EExecutorStartMenu.DiaryInvalidMes:
        this._createMessageCommand(newPos);
        this._pushMessageCloseWaitCommand();
        return true;
    }
    return false;
  }

  /**
   * 追加で閉じるメニュー
   * @param pos
   */
  protected _getExtraCloseMenu(pos: number) {
    switch (pos) {
      case EExecutorStartMenu.SuspendConfirm:
      case EExecutorStartMenu.DiaryRemoveConfirm:
      case EExecutorStartMenu.DiaryInvalidMes:
        return gameTemp.getMessageMenuId();
    }
    return 0;
  }

  /**
   * 実行
   * @param pos
   */
  protected _executePos(pos: number): boolean {
    switch (pos) {
      case EExecutorStartMenu.JudgeData:
        return this._executeJudgeData();
      case EExecutorStartMenu.WaitResult:
        return this._executeWaitResult();
      case EExecutorStartMenu.CommandNew:
        return this._executeCommandNew();
      case EExecutorStartMenu.CommandSelect:
        return this._executeCommandSelect();
      case EExecutorStartMenu.CommandFull:
        return this._executeCommandFull();
      case EExecutorStartMenu.DiaryMake:
        return this._executeDiaryMake();
      case EExecutorStartMenu.DiaryConfirm:
        return this._executeDiaryConfirm();
      case EExecutorStartMenu.DiaryInvalidMes:
        return this._executeDiaryInvalidMes();
      case EExecutorStartMenu.SuspendConfirm:
        return this._executeSuspendConfirm();
      case EExecutorStartMenu.DiaryCopy:
        return this._executeDiaryCopy();
      case EExecutorStartMenu.DiaryMove:
        return this._executeDiaryRemove();
      case EExecutorStartMenu.DiaryCopyDest:
        return this._executeDiaryCopyDest();
      case EExecutorStartMenu.DiaryRemoveConfirm:
        return this._executeDiaryRemoveConfirm();
      case EExecutorStartMenu.InputName:
        return this._executeInputName();
      case EExecutorStartMenu.SaveResult:
        return this._executeSaveResult();
    }
    throw new Error(Utils.programErrorText + pos);
  }

  /**
   * データ判定時
   */
  private _executeJudgeData() {
    // セーブファイルリスト取得
    GameUtils.getSaveFileList()
      .then(
        (fileList: SaveFileInfo[]) => {
          gameTemp.setDiaryList(fileList);
          return GameUtils.getSuspendFileList(false);
        },
        (errorName: string) => {
          Utils.pushError(new Error(errorName));
        }
      )
      .then(
        (suspendList) => {
          if (suspendList) {
            const saveList = gameTemp.diaryList;
            this._unionSuspendList(saveList, suspendList);
          }
          return GameUtils.getSuspendFileList(true);
        },
        (errorName: string) => {
          GameLog.error(errorName);
          return GameUtils.getSuspendFileList(true);
        }
      )
      .then(
        (suspendList) => {
          if (suspendList) {
            const saveList = gameTemp.diaryList;
            this._unionSuspendList(saveList, suspendList);
          }
          this._checkSaveFileList();
        },
        (errorName: string) => {
          GameLog.error(errorName);
          this._checkSaveFileList();
        }
      );
    this._create(EExecutorStartMenu.WaitResult);
    return true;
  }

  /**
   * セーブリストに中断リストを統合する
   * @param saveList
   * @param suspendList
   */
  private _unionSuspendList(
    saveList: SaveFileInfo[],
    suspendList: SuspendFileInfo[]
  ) {
    const length = Math.min(saveList.length, suspendList.length);
    for (let i = 0; i < length; i++) {
      const save = saveList[i];
      const suspend = suspendList[i];
      if (save.exist && !save.invalid && !save.suspendExist) {
        save.suspendExist = suspend.suspendExist;
        save.suspendHeader = suspend.suspendHeader;
      }
    }
  }

  /**
   * セーブファイルリストを確認する
   */
  private _checkSaveFileList() {
    const diaryList = gameTemp.diaryList;
    if (diaryList.every((save) => save.exist)) {
      // 全部使用
      this._jump({ pos: EExecutorStartMenu.CommandFull }, -1);
    } else if (diaryList.some((save) => save.exist)) {
      // 1つ以上存在
      this._jump({ pos: EExecutorStartMenu.CommandSelect }, -1);
    } else {
      // セーブデータなし
      this._jump({ pos: EExecutorStartMenu.CommandNew }, -1);
    }
  }

  /**
   * 結果待ち
   * 何もせずフレームを進める
   */
  private _executeWaitResult() {
    return false;
  }

  /**
   * コマンド選択時新規
   */
  private _executeCommandNew() {
    return this._executeCommand(ExecutorStartMenu.StartNewIndex);
  }

  /**
   * コマンド選択時データあり
   */
  private _executeCommandSelect() {
    return this._executeCommand(ExecutorStartMenu.StartSelectIndex);
  }

  /**
   * コマンド選択時全データあり
   */
  private _executeCommandFull() {
    return this._executeCommand(ExecutorStartMenu.StartFullIndex);
  }

  /**
   * コマンド選択時
   * @param table
   * @returns
   */
  private _executeCommand(table: number[]) {
    const result = this._getResult();
    const index = table[result?.index] ?? -1;

    if (this._selectCancel(index)) {
      return true;
    }
    return this._selectCommand(index);
  }

  /**
   * コマンド選択決定
   * @param index
   */
  private _selectCommand(index: number) {
    switch (index) {
      case EStartCommand.OPEN:
        return this._selectCommandDiaryOpen();
      case EStartCommand.MAKE:
        return this._selectCommandDiaryMake();
      case EStartCommand.COPY:
        return this._selectCommandDiaryCopy();
      case EStartCommand.REMOVE:
        return this._selectCommandDiaryRemove();
    }

    return false;
  }

  /**
   * 日記を開く選択時
   * @returns
   */
  private _selectCommandDiaryOpen() {
    this._setSelectListExistDiaries();
    this._create(EExecutorStartMenu.DiaryConfirm);
    return true;
  }

  /**
   * 壊れているファイルの場合
   * @param id
   * @returns
   */
  private _diaryDestroyText(id: number) {
    const head = Utils.convertFull(id, EDefine.FSpace, 2) + EDefine.FColon;
    return `${head}こわれています`;
  }

  /**
   * 日記を作る選択時
   * @returns
   */
  private _selectCommandDiaryMake() {
    this._setSelectListEmptyDiaries();
    this._create(EExecutorStartMenu.DiaryMake);
    return true;
  }

  /**
   * 日記を写す選択時
   * @returns
   */
  private _selectCommandDiaryCopy() {
    this._setSelectListExistDiaries();
    this._create(EExecutorStartMenu.DiaryCopy);
    return true;
  }

  /**
   * 日記を消す選択時
   * @returns
   */
  private _selectCommandDiaryRemove() {
    this._setSelectListExistDiaries();
    this._create(EExecutorStartMenu.DiaryMove);
    return true;
  }

  /**
   * 存在する日記の選択リストを設定する
   */
  private _setSelectListExistDiaries() {
    const existList = this._filterExistSaveFileList();
    setSystemSlot('extraCount', existList.length * 2);
    const start = getSlotId('extraStart');
    existList.forEach((diary, index) => {
      const name = diary.invalid
        ? this._diaryDestroyText(diary.id)
        : this._saveLineText(diary.id, diary.header);
      setSlot(start + index * 2, name);
      const resume = diary.suspendExist
        ? this._resumeLineText(diary.suspendHeader)
        : '';
      setSlot(start + index * 2 + 1, resume);
    });
  }

  /**
   * セーブ情報を作成する
   * @param id
   * @param header
   * @returns
   */
  private _saveLineText(id: number, header: SaveHeader) {
    const head = Utils.convertFull(id, EDefine.FSpace, 2) + EDefine.FColon;
    const name = header.name.padEnd(5, EDefine.FSpace);
    return `${head}${name}${this._diaryLineText(header, 10)}`;
  }

  /**
   * 中断情報を作成する
   * @returns
   */
  private _resumeLineText(header: SuspendHeader) {
    return this._diaryLineText(header, 14);
  }

  /**
   * 一行情報を作成する
   * @param header
   * @returns
   */
  private _diaryLineText(header: SaveHeader | SuspendHeader, padding: number) {
    const lv = 'Lv' + Utils.convertFull(header.lv, EDefine.FSpace, 2);
    const locate = header.locate.padEnd(padding, EDefine.FSpace);
    const totalMin = Math.floor(header.count / 60 / 60);
    const hour = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    const time = `${Utils.convertFull(hour, '０', 2)}${
      EDefine.FColon
    }${Utils.convertFull(min, '０', 2)}`;
    return `${lv}${EDefine.FSpace}${locate}${time}`;
  }

  /**
   * 存在しない日記の選択リストを設定する
   */
  private _setSelectListEmptyDiaries() {
    const emptyList = this._filterEmptySaveFileList();
    setSystemSlot('extraCount', emptyList.length);
    const start = getSlotId('extraStart');
    emptyList.forEach((diary, index) => {
      const name = this._emptyDiaryName(diary.id, 2);
      setSlot(start + index, name);
    });
  }

  /**
   * 空いている日記名を作成する
   * @param id
   * @returns
   */
  private _emptyDiaryName(id: number, pad = 0) {
    const no = Utils.convertFull(id, EDefine.FSpace, pad);
    return system.saveInfo.file + no;
  }

  /**
   * セーブファイル未作成のリストをフィルターする
   * @returns
   */
  private _filterEmptySaveFileList() {
    return gameTemp.diaryList.filter((info) => {
      return !info.exist;
    });
  }

  /**
   * セーブファイル作成のリストをフィルターする
   * @returns
   */
  private _filterExistSaveFileList() {
    return gameTemp.diaryList.filter((info) => {
      return info.exist;
    });
  }

  /**
   * 作る日記選択時
   */
  private _executeDiaryMake() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectDiaryMake(result?.index);
  }

  /**
   * 日記作成
   * 名前入力に移動
   */
  private _selectDiaryMake(index: number) {
    GameUtils.setSlotActorName('');
    const list = this._filterEmptySaveFileList();
    this._setSelectDiaryId(list[index].id);
    this._create(EExecutorStartMenu.InputName);
    return true;
  }

  /**
   * 開く日記選択時
   */
  private _executeDiaryConfirm() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectDiaryConfirm(result?.index);
  }

  /**
   * 選択した日記を確認する
   * @param index
   * @returns
   */
  private _selectDiaryConfirm(index: number) {
    const diary = this._filterExistSaveFileList()[index];
    this._setSelectDiaryId(diary.id);
    if (diary.invalid) {
      // 壊れているので開始できない
      this._create(EExecutorStartMenu.DiaryInvalidMes);
      return true;
    }
    if (diary.suspendExist) {
      // 中断データから開始か確認する
      this._create(EExecutorStartMenu.SuspendConfirm);
      return true;
    }
    // 普通に開く
    this._endSelectOpenDiary(false);
    return true;
  }

  /**
   * 日記が壊れているメッセージ時
   */
  private _executeDiaryInvalidMes() {
    this._popPos();
    return true;
  }

  /**
   * 中断データから開始か結果
   */
  private _executeSuspendConfirm() {
    const result = this._getResult();

    if (result?.index !== 0) {
      // 日記から開始
      this._endSelectOpenDiary(false);
      return true;
    }
    return this._selectSuspendConfirmOk();
  }

  /**
   * 中断データから確認開始OK
   */
  private _selectSuspendConfirmOk() {
    // 中断データから開始する
    this._endSelectOpenDiary(true);
    return true;
  }

  /**
   * 写す日記選択時
   */
  private _executeDiaryCopy() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectDiaryCopy(result?.index);
  }

  /**
   * 写す日記を選択した
   */
  private _selectDiaryCopy(index: number) {
    const list = this._filterExistSaveFileList();
    this._setSelectDiaryId(list[index].id);
    this._setSelectListEmptyDiaries();
    this._create(EExecutorStartMenu.DiaryCopyDest);
    return true;
  }

  /**
   * 消す日記選択時
   */
  private _executeDiaryRemove() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectDiaryRemove(result?.index);
  }

  /**
   * 消す日記を選択した
   */
  private _selectDiaryRemove(index: number) {
    const list = this._filterExistSaveFileList();
    this._setSelectDiaryId(list[index].id);
    const name = this._emptyDiaryName(this._selectDiaryId);
    GameUtils.setSlotItemName(name);
    this._create(EExecutorStartMenu.DiaryRemoveConfirm);
    return true;
  }

  /**
   * 写し先選択時
   */
  private _executeDiaryCopyDest() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      // 再構築されるのでスロットを設定しなおす
      this._setSelectListExistDiaries();
      return true;
    }
    return this._selectDiaryCopyDest(result?.index);
  }

  /**
   * 写し先を選択した
   */
  private _selectDiaryCopyDest(index: number) {
    const list = this._filterEmptySaveFileList();
    const destId = list[index].id;
    const srcId = this._selectDiaryId;
    GameUtils.copyFile(srcId, destId).then(
      () => {
        // 最初に戻る
        this._jump({ pos: EExecutorStartMenu.JudgeData }, -1);
      },
      () => {
        Utils.pushError(new Error(EErrorMessage.CopyFailed));
      }
    );
    // 待機する
    this._create(EExecutorStartMenu.WaitResult);
    return true;
  }

  /**
   * 消す日記確認結果
   */
  private _executeDiaryRemoveConfirm() {
    const result = this._getResult();

    if (result?.index !== 0) {
      return super._selectCancel(-1);
    }
    return this._selectDiaryRemoveOk();
  }

  /**
   * 消す選択確認OK
   * 中断ファイルもセットで消す
   */
  private _selectDiaryRemoveOk() {
    const id = this._selectDiaryId;
    Promise.all([
      GameUtils.removeSuspendFile(id, false),
      GameUtils.removeSuspendFile(id, true),
      GameUtils.removeSaveFile(id),
    ]).then(
      () => {
        // 最初に戻る
        this._jump({ pos: EExecutorStartMenu.JudgeData }, -1);
      },
      () => {
        Utils.pushError(new Error(EErrorMessage.RemoveFailed));
      }
    );
    // 待機する
    this._create(EExecutorStartMenu.WaitResult);
    return true;
  }

  /**
   * 名前入力選択時
   */
  private _executeInputName() {
    const result = this._getResult();

    if (this._selectCancel(result?.index)) {
      return true;
    }
    return this._selectInputName();
  }

  /**
   * 名前入力決定
   * セーブコマンドを発行する
   * @returns
   */
  private _selectInputName() {
    const variableId: number = system.startMemberId;
    const name = GameUtils.getSlotActorName();
    this._pushNameChange(variableId, name);
    this._pushSaveCommand(this._selectDiaryId);
    this._create(EExecutorStartMenu.SaveResult);
    return true;
  }

  /**
   * セーブ結果
   * 成功したらタイトル終了
   * 失敗したら例外を投げる
   */
  private _executeSaveResult() {
    const result = this._getResult();
    if (result?.index !== 0) {
      throw new Error(EErrorMessage.SaveFailed);
    }
    this._endSelectOpenDiary(false);

    return true;
  }

  /**
   * 開く日記選択終了
   */
  private _endSelectOpenDiary(resume: boolean) {
    gameTemp.setDiaryId(this._selectDiaryId);
    gameTemp.setResume(resume);
    this._popAll();
  }

  /**
   * キャンセル
   * オールキャンセルがあるのでオーバーライド
   * @param index
   * @param pos
   * @param cancelIndex
   */
  protected _selectCancel(index: number, pos?: number, cancelIndex?: number) {
    if (index === -2) {
      this._allCancel();
      return true;
    }
    return super._selectCancel(index, pos, cancelIndex);
  }

  /**
   * オールキャンセル
   * 最後まで戻る
   */
  private _allCancel() {
    this._popAll();
  }
}
