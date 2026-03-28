// csvからjsonに変換する node.js モジュール
// 基本仕様
// ・データが空白の場合は要素を定義しない
// ・先頭に$+数字でジャンプ
// 特殊仕様
// ・オブジェクトを入れ込む
//   開始：オブジェクト名の後ろに . をつける
//   終了：単体の .
// ・配列を入れ込む
//   開始：オブジェクト名のうしろに [ をつける
//   終了：]
// オブジェクトや配列の中の入れ子も可能

const fs = require('fs');

const CsvToJson = (argv) => {
  const nameStack = [];

  const checkArgs = () => {
    if (argv[2] !== undefined) {
      return true;
    } else {
      return false;
    }
  };

  const baseName = (str) => {
    if (str.lastIndexOf('.') !== -1) {
      return str.substring(0, str.lastIndexOf('.'));
    }
    return str;
  };

  const getJsonFilename = (csvFilename, outPath) => {
    const base = baseName(csvFilename) + '.json';
    const point = base.lastIndexOf('\\');
    const inPath = base.substring(0, point);
    const file = base.substring(point);
    const path = outPath ?? inPath + 'json';

    return path + file;
  };

  const loadCsv = (filename) => {
    try {
      const text = fs.readFileSync(filename, 'utf8');
      return text;
    } catch (e) {
      console.log(e);
      return null;
    }
  };

  const saveJson = (filename, text) => {
    fs.writeFileSync(filename, text);
    return true;
  };

  const getAddValue = (item, index, id) => {
    // indexの最初はid
    if (index === 0) {
      return id;
    }
    if (!item) {
      // 値が設定されていなければ無視する
      return null;
    }
    // 数値なら変換して格納
    // スペースが入っている場合は数値とみなさない
    const num = Number(item);
    if (!isNaN(num) && !/[\x20\u3000]/.test(item)) {
      return num;
    } else {
      return item;
    }
  };

  const convert = (csvText) => {
    // 改行ごとに分けてコメント行をのけてさらに最終行が空白なら除く
    const aryCsv = csvText
      .toString()
      .split(/\r\n|\n/)
      .filter((csv) => !csv.startsWith('comment'))
      .filter((csv, index, ary) => {
        if (index >= ary.length - 1 && !csv) {
          return false;
        } else {
          return true;
        }
      });

    // オブジェクトを作成
    const csvHeader = aryCsv[0];
    const csvData = aryCsv.slice(1);

    const aryHeader = csvHeader.split(',');

    // ヘッダがない場合は単なる配列にする
    if (!aryHeader[0]) {
      const aryJsonData = csvData.map((value) => {
        const item = value.split(',')[0].replace(/^"(.*)"$/, '$1');
        return getAddValue(item);
      });
      return toJsonText(aryJsonData);
    }

    const jsonData = csvData.map((value, id) => {
      const aryData = value.split(',');
      return aryData.reduce((object, item, index) => {
        // ダブルクォーテーション除去
        item = item.replace(/^"(.*)"$/, '$1');
        // ヘッダ名が空だったら追加しない
        if (!aryHeader[index]) {
          return object;
        }
        // 追加する場所
        const leaf = nameStack.reduce((dest, value) => {
          return dest[value.name];
        }, object);

        // ヘッダ項目が特殊
        const regex = /\*(\w+)\*/gi;
        if (aryHeader[index].search(regex) >= 0) {
          const name = aryHeader[index].replace(regex, '$1');
          if (item === '[') {
            nameStack.push({ name, type: 'ary' });
            leaf[name] = [];
          } else if (item === '{') {
            nameStack.push({ name, type: 'obj' });
            leaf[name] = {};
          } else {
            nameStack.pop();
          }
          return object;
        }
        // 特殊中
        if (nameStack.length > 0) {
          const addItem = getAddValue(item, index, id);
          if (addItem == null) {
            return object;
          }

          const type = nameStack[nameStack.length - 1].type;
          if (type === 'ary') {
            const words = aryHeader[index].split('.');
            const number = Number(words[0]);
            if (words[1]) {
              // オブジェクト
              if (!isNaN(number)) {
                if (!leaf[number]) {
                  leaf[number] = {};
                }
                if (words[2] != null) {
                  if (leaf[number][words[1]] == null) {
                    leaf[number][words[1]] = [];
                  }
                  leaf[number][words[1]][words[2]] = addItem;
                } else {
                  leaf[number][words[1]] = addItem;
                }
              } else {
                leaf[aryHeader[index]] = addItem;
              }
            } else {
              leaf[number] = addItem;
            }
          } else if (type === 'obj') {
            leaf[aryHeader[index]] = addItem;
          }

          return object;
        }
        const addItem = getAddValue(item, index, id);
        if (addItem != null) {
          object[aryHeader[index]] = addItem;
        }
        return object;
      }, {});
    });

    return toJsonText(jsonData);
  };

  const toJsonText = (jsonData) => {
    const texts = jsonData.map((data, index) => {
      if (index === 0) {
        return JSON.stringify(null, replacer);
      }
      return JSON.stringify(data, replacer);
    });
    const jsonText = texts.reduce((accume, current) => {
      return (accume += ',\r\n' + current);
    });

    return '[\r\n' + jsonText + '\r\n]';
  };

  const replacer = (_key, value) => {
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      } else if (value === 'false') {
        return false;
      }
      // ""だけの場合空文字とする
      const dqText = value.match(/\"/g);
      if (dqText !== null && dqText.length === value.length) {
        return '';
      }
      const regex = /\*\[(.*)\]\*/gi;
      if (value.search(regex) < 0) {
        return value;
      }
      const name = value.replace(regex, '$1');
      // 数値の場合は数値変換する
      return name ? name.split(';').map((value) => getAddValue(value)) : [];
    }
    return value;
  };

  const execute = () => {
    if (!checkArgs()) {
      return false;
    }

    const lines = loadCsv(argv[2]);
    if (lines === null) {
      return false;
    }

    const jsonText = convert(lines);
    const jsonFilename = getJsonFilename(argv[2], argv[3]);
    saveJson(jsonFilename, jsonText);

    return true;
  };

  return execute();
};

const result = CsvToJson(process.argv);

console.log(result);
