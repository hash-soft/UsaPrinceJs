// systemデータのcsvからjsonに変換する node.js モジュール
// 通常と違いトップが配列でなくオブジェクトとなる
// ためヘッダが縦になる

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

  const filename = (str) => {
    const base = str.substring(str.lastIndexOf('\\') + 1);
    if (base.lastIndexOf('.') !== -1) {
      return base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  };

  const getJsonFilename = (csvFilename) => {
    const base = baseName(csvFilename);
    return base + '.json';
  };

  const getSaveFilename = (csvFilename, name, outPath) => {
    const path =
      outPath ??
      csvFilename.substring(0, csvFilename.lastIndexOf('\\')) + '\\json';
    return path + '\\' + name + '.json';
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

  const getAddValue = (item, index, id, existId) => {
    // indexの最初はid
    if (index === 0 && existId) {
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

  const convert = (csvTexts, nameList) => {
    // 改行ごとに分けてヘッダとデータの配列に変換する
    const aryCsv = csvTexts[0]
      .toString()
      .split(/\r\n|\n/)
      .filter((csv) => !csv.startsWith('comment'));
    // 配列を作成
    const aryHeader = [];
    const aryData = [];

    aryCsv.forEach((csv) => {
      const ary = csv.split(',');
      if (ary[1] === undefined) {
        return;
      }
      // 1列目はコメントなので使用しない
      aryHeader.push(ary[1]);
      aryData.push(ary[2]);
    });

    const jsonData = aryData.reduce((object, item, index) => {
      // ダブルクォーテーション除去
      item = item.replace(/^"(.*)"$/, '$1');
      // ヘッダ項目が特殊
      const regex = /\*(\w+)\*/gi;
      if (aryHeader[index].search(regex) >= 0) {
        const name = aryHeader[index].replace(regex, '$1');
        if (item === '[') {
          nameStack.push({ name, type: 'ary' });
          object[name] = [];
        } else if (item === '{') {
          nameStack.push({ name, type: 'obj' });
          object[name] = {};
        } else {
          nameStack.pop();
        }
        return object;
      }
      // 特殊中
      if (nameStack.length > 0) {
        const addItem = getAddValue(item);
        if (addItem == null) {
          return object;
        }

        const leaf = nameStack.reduce((dest, value) => {
          return dest[value.name];
        }, object);

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
              leaf[number][words[1]] = addItem;
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
      const addItem = getAddValue(item);
      if (addItem != null) {
        object[aryHeader[index]] = addItem;
      }
      return object;
    }, {});

    // 配列要素を追加していく
    nameList.forEach((name, index) => {
      jsonData[name] = toArray(csvTexts[1 + index]);
    });

    return toJsonText(jsonData);
  };

  const toArray = (csvText) => {
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
      return csvData.map((value) => {
        const item = value.split(',')[0].replace(/^"(.*)"$/, '$1');
        return getAddValue(item);
      });
    }

    const existId = aryHeader[0] === 'id';
    const jsonData = csvData.map((value, id) => {
      const aryData = value.split(',');
      // idにnullが入力されていればその項目はnullにする
      if (aryData[0] === 'null') {
        return null;
      }
      return aryData.reduce((object, item, index) => {
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
          const addItem = getAddValue(item, index, id, existId);
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
        const addItem = getAddValue(item, index, id, existId);
        if (addItem != null) {
          object[aryHeader[index]] = addItem;
        }
        return object;
      }, {});
    });

    return jsonData;
  };

  const toJsonText = (jsonData) => {
    let jsonText = '';
    for (const prop in jsonData) {
      if (jsonText) {
        jsonText += ',\r\n';
      }
      jsonText += `"${prop}":`;
      const obj = jsonData[prop];
      if (Array.isArray(obj) && obj.length > 0) {
        const texts = obj.map((data) => {
          return JSON.stringify(data, replacer);
        });
        const arrayText = texts.reduce((accume, current) => {
          return (accume += ',\r\n' + current);
        });
        jsonText += '[\r\n' + arrayText + '\r\n]';
      } else {
        jsonText += JSON.stringify(obj, replacer);
      }
    }
    return '{\r\n' + jsonText + '\r\n}';
  };

  const replacer = (_key, value) => {
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      } else if (value.toLowerCase() === 'false') {
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

    const nameEnd = 5 + Number.parseInt(argv[4]);
    const nameList = argv.slice(5, nameEnd);

    const fileEnd = nameEnd + Number.parseInt(argv[4]);
    const linesList = argv.slice(nameEnd, fileEnd).map((value) => {
      return loadCsv(value);
    });

    const jsonText = convert([].concat(lines, linesList), nameList);
    const jsonFilename = getSaveFilename(argv[2], argv[3], argv[fileEnd]);
    saveJson(jsonFilename, jsonText);

    return true;
  };

  return execute();
};

console.log('systemcsv変換開始');

const result = CsvToJson(process.argv);

console.log(result);
