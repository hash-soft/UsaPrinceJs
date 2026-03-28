// reviverのテスト

const fs = require('fs');

const ParseTest = argv => {

  const checkArgs = () => {
    if(argv[2] !== undefined) {
      return true;
    } else {
      return false;
    }
  }

  const loadJson = (filename) => {
    try {
      const  text = fs.readFileSync(filename, 'utf8');
      return text;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  const toJson = (text) => {
    const reviver = function(key, value) {
      if(key === 'properties' && Array.isArray(value) ) {
        value.forEach(item => {
          this[item.name] = item.value;
        });
        return undefined;
      }
      return value;
    }
    return JSON.parse(text, reviver);
  }

  const execute = () => {
    if(!checkArgs()) {
      return false;
    }

    const text = loadJson(argv[2]);
    if(text === null) {
      return false;
    }

    const obj = toJson(text);
    console.log(obj);
    
    return true;
  }

  return execute();
}


const result = ParseTest(process.argv);

console.log(result);