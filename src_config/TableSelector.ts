/**
 * テーブル選択クラス
 * キーボードとゲームパッドテーブルのベースとなる
 */

import { KeyMap } from './UsaConfig';

type RemovePoint = {
  rowIndex: number;
  keyCode: string;
};

export class TableSelector {
  /**
   * 現在の選択行
   */
  private _currentIndex = 0;
  /**
   * 行の要素
   */
  private _tableRows!: NodeListOf<HTMLElement>;
  /**
   * キーデータ
   */
  private _data!: KeyMap;

  get data(): Readonly<KeyMap> {
    return this._data;
  }

  /**
   * コンストラクタ
   * @param _prefixName
   */
  constructor(
    private _prefixName: string,
    private _style = {
      bg: 'bg-yellow-300',
      hover: 'hover:bg-yellow-100',
      activeHover: 'hover:bg-yellow-300',
    }
  ) {}

  /**
   * 使用準備
   */
  setup(data: Readonly<KeyMap>) {
    this.setKeyMap(data);
    this._tableRows = document.getElementsByName(this._prefixName + '-row');
    this._tableRows.forEach((row, index) => {
      row.addEventListener('click', (event) => {
        this._onTableRowClick(event, index);
      });
      const tdTags = row.getElementsByTagName('td');
      const removeBtn =
        tdTags[tdTags.length - 1].getElementsByTagName('button')[0];
      removeBtn.addEventListener('click', (event) => {
        this._onClickRowRemove(event, index);
      });
    });
    this.resetTable();
  }

  /**
   * キーの設定を全て削除
   */
  deleteKeyMap() {
    for (let i = 0; i < this._data.length; i++) {
      this._data[i] = [];
    }
  }

  /**
   * キーマップを設定
   * @param data キーマップのデータ
   */
  setKeyMap(data: Readonly<KeyMap>) {
    this._data = data.map((value) => [...value]);
  }

  /**
   * テーブルをリセット
   */
  resetTable() {
    this._tableRows.forEach((row, index) => {
      const ulTag = row.getElementsByTagName('ul')[0];
      this._resetRowKey(ulTag, index);
    });
  }

  /**
   * 行のキーをリセット
   * @param ulTag
   * @param index
   */
  protected _resetRowKey(ulTag: HTMLElement, index: number) {
    while (ulTag.firstChild) {
      ulTag.removeChild(ulTag.firstChild);
    }
    if (!this._data[index]) {
      return;
    }
    for (const key of this._data[index]) {
      this._pushRowKey(ulTag, key, index);
    }
  }

  /**
   * 行のキーを追加
   * @param ulTag
   * @param key
   * @param rowIndex
   */
  protected _pushRowKey(ulTag: HTMLElement, key: string, rowIndex: number) {
    const liTag = document.createElement('li');
    liTag.classList.add(
      'flex',
      'w-full',
      'items-center',
      'px-2',
      'bg-white',
      'border-b',
      'last:border-none',
      'border-gray-200'
    );
    const divKey = document.createElement('div');
    divKey.classList.add('w-full', 'items-center', 'flex');
    divKey.textContent = key;
    liTag.appendChild(divKey);

    const btnRemove = document.createElement('button');
    btnRemove.classList.add(
      'w-6',
      'flex',
      'flex-col',
      'items-center',
      'hover:bg-red-200'
    );
    const trashSvg = document.getElementById('trash-svg') as HTMLImageElement;
    const removeImg = document.createElement('img');
    removeImg.src = trashSvg.src;
    removeImg.classList.add('fill-current');
    removeImg.alt = 'icon';
    btnRemove.appendChild(removeImg);
    btnRemove.addEventListener('click', (event) => {
      this._onClickKeyRemove.bind(this)(event, { rowIndex, keyCode: key });
    });
    liTag.appendChild(btnRemove);
    ulTag.appendChild(liTag);
  }

  /**
   * データを追加
   * @param key
   * @returns
   */
  protected _pushData(key: string) {
    // 全行からkeyを検索
    // 現在の行にデータがあればなにもしない
    // 別の行にあればデータを削除
    // 現在の行にkeyを追加
    // 変化のあった行に_resetRowKeyを実行
    const removePoints = this._data.map((row) => row.indexOf(key));
    if (removePoints[this._currentIndex] !== -1) {
      return;
    }
    removePoints[this._currentIndex] = -1;
    removePoints.forEach((point, index) => {
      if (point !== -1) {
        this._data[index]?.splice(point, 1);
      }
    });
    this._data[this._currentIndex].push(key);
    this._pushRowKey(
      this._tableRows[this._currentIndex].getElementsByTagName('ul')[0],
      key,
      this._currentIndex
    );
    removePoints.forEach((point, index) => {
      if (point !== -1) {
        this._resetRowKey(
          this._tableRows[index].getElementsByTagName('ul')[0],
          index
        );
      }
    });
  }

  /**
   * 行クリック時の処理
   * @param _e
   * @param index
   */
  private _onTableRowClick(_e: Event, index: number) {
    this._changeTableRowIndex(index);
  }

  /**
   * テーブル行のインデックスを変更する
   *
   * 現在の行のスタイルを初期化し、新しい行にスタイルを適用する。
   *
   * @param index 新しい行のインデックス
   */
  protected _changeTableRowIndex(index: number) {
    // observer誤判定防止のためremove ⇒ add の順に実行する
    if (this._currentIndex >= 0) {
      this._unselectRow(this._tableRows[this._currentIndex]);
    }
    if (index >= 0) {
      this._selectRow(this._tableRows[index]);
    }
    this._currentIndex = index;
  }

  /**
   * 選択行のスタイルを適用する
   * @param element 選択行のHTMLElement
   */
  protected _selectRow(element: HTMLElement) {
    element.classList.add(this._style.bg, this._style.activeHover);
  }

  /**
   * 非選択行のスタイルを適用する
   * @param element 非選択行のHTMLElement
   */
  protected _unselectRow(element: HTMLElement) {
    element.classList.remove(this._style.bg, this._style.activeHover);
    element.classList.add(this._style.hover);
  }

  /**
   * キー削除クリック時の処理
   * @param _e
   * @param point
   */
  private _onClickKeyRemove(_e: Event, point: RemovePoint) {
    // データを検索
    // なければなにもしない
    // あればデータから削除して_resetRowKeyを実行
    const index = this._data[point.rowIndex].indexOf(point.keyCode);
    if (index !== -1) {
      this._data[point.rowIndex].splice(index, 1);
      const ulTag =
        this._tableRows[point.rowIndex].getElementsByTagName('ul')[0];
      this._resetRowKey(ulTag, point.rowIndex);
    }
  }

  /**
   * キー全削除クリック時の処理
   * @param _e
   * @param index
   */
  private _onClickRowRemove(_e: Event, index: number) {
    // index行を全て削除して_resetTableを実行
    this._data[index]?.splice(0);
    this._resetRowKey(
      this._tableRows[index].getElementsByTagName('ul')[0],
      index
    );
  }
}
