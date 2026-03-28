import { system } from './DataStore';
import {
  GameMember,
  SaveObjectGameMember,
  SuspendObjectGameMember,
} from './GameMember';

/**
 * メンバーを管理する
 * 作成と削除を行い、作成したメンバーを配列で保持する
 */
export class GameMembers {
  /**
   * メンバーデータ
   */
  private _data: GameMember[];

  /**
   * コンストラクタ
   * @param max
   */
  constructor() {
    this._data = Array.from({ length: system.maxMember }).map(
      () => new GameMember()
    );
  }

  /**
   * データから読み込み
   * @param data
   */
  load(data: SaveObjectGameMember[]) {
    const length = Math.min(data.length, this._data.length);
    for (let i = 0; i < length; i++) {
      const value = data[i];
      // idは保存値を無視し、インデックスに強制する
      this._data[i].load({ id: i, memberId: value.memberId, data: value });
    }
  }

  /**
   * セーブオブジェクトの作成
   * @returns
   */
  createSaveObject(): SaveObjectGameMember[] {
    return this.getAll().map((member) => member.createSaveObject());
  }

  /**
   * 中断から読み込み
   * @param data
   */
  loadSuspend(data: SaveObjectGameMember[]) {
    const length = Math.min(data.length, this._data.length);
    for (let i = 0; i < length; i++) {
      const value = data[i];
      // idは保存値を無視し、インデックスに強制する
      this._data[i].loadSuspend({ id: i, memberId: value.memberId, data: value });
    }
  }

  /**
   * 中断オブジェクトの作成
   * @returns
   */
  createSuspendObject(): SuspendObjectGameMember[] {
    return this.getAll().map((member) => member.createSuspendObject());
  }

  /**
   * 全メンバー取得
   * @returns
   */
  getAll() {
    return this._data.filter((value) => value.id >= 0);
  }

  /**
   * 指定したメンバーIdのメンバーを取得
   * @param memberId
   * @returns
   */
  getMembersFromMemberId(memberId: number) {
    return this._data.filter((value) => {
      return value.memberId === memberId;
    });
  }

  /**
   * 指定インデックスのメンバーを取得
   * @param index
   * @returns
   */
  getMember(index: number) {
    return this._data[index];
  }

  /**
   * メンバーを追加し、配列の参照インデックスを返す
   * @param memberId
   * @returns
   */
  add(memberId: number) {
    const index = this._data.findIndex((value) => value.id < 0);
    if (index < 0) {
      // 見つからなかったので追加失敗
      return -1;
    }
    this._data[index].setup(index, memberId);
    return index;
  }

  /**
   * 指定インデックスのメンバーの削除を行う
   * @param index
   */
  remove(index: number) {
    if (this._data[index]?.id ?? -1 < 0) {
      // 作成されていないので削除失敗
      return false;
    }
    this._data[index].clear();
    return true;
  }
}
