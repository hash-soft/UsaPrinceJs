/**
 * タブ切り替えクラス
 */

export class TabSwitcher {
  /**
   * 現在の選択タブのインデックス
   */
  private _currentIndex = 0;
  /**
   * タブのテキスト要素
   */
  private _tabTexts!: NodeListOf<HTMLElement>;
  /**
   * タブのコンテンツ要素
   */
  private _tabContents!: NodeListOf<HTMLElement>;

  /**
   * 現在選択中のタブのインデックス
   * @returns インデックス
   */
  get currentIndex(): number {
    return this._currentIndex;
  }

  /**
   * コンストラクタ
   * @param _prefixName
   */
  constructor(private _prefixName: string) {}

  /**
   * 使用準備
   */
  setup() {
    this._tabTexts = document.getElementsByName(this._prefixName + "-text");
    this._tabTexts.forEach((tab, index) => {
      tab.addEventListener("click", (event) => {
        this._onTabSwitch.bind(this)(event, index);
      });
    });
    this._tabContents = document.getElementsByName(
      this._prefixName + "-content"
    );
  }

  /**
   * タブコンテンツ要素を取得
   * @param index
   * @returns
   */
  getTabContent(index: number) {
    return this._tabContents[index];
  }

  /**
   * タブ切替時の処理
   * @param _e
   * @param index
   */
  private _onTabSwitch(_e: Event, index: number) {
    this._tabTexts[this._currentIndex].classList.remove(
      "text-blue-500",
      "border-b-2",
      "font-medium",
      "border-blue-500"
    );
    this._tabTexts[index].classList.add(
      "text-blue-500",
      "border-b-2",
      "font-medium",
      "border-blue-500"
    );
    this._tabContents[this._currentIndex].classList.replace("block", "hidden");
    this._tabContents[index].classList.replace("hidden", "block");
    this._currentIndex = index;
  }
}
