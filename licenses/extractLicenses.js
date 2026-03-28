// 指定したJSON形式のライセンス情報からライセンス内容を抽出する

const fs = require('fs');
const path = require('path');

const licensesFile = process.argv[2];
if (!licensesFile) {
  console.error('licenses.json を指定してください。');
  return -1;
}

let data;
try {
  data = JSON.parse(fs.readFileSync(licensesFile, 'utf8'));
} catch (e) {
  console.error(e);
  return -1;
}

const results = [];

for (const packageName in data) {
  const { licenses, repository, licenseFile, publisher } = data[packageName];
  if (publisher === 'hashsoft') {
    continue;
  }
  const result = {
    packageName,
    licenses,
    repository: repository || 'No repository specified',
    licenseContent: '',
  };

  if (licenseFile && fs.existsSync(licenseFile)) {
    try {
      result.licenseContent = fs.readFileSync(licenseFile, 'utf8');
    } catch (err) {
      console.error(`Error reading license file: ${err.message}`);
      console.error('中断します！！');
      return -1;
    }
  } else {
    result.licenseContent = 'No license file';
  }

  results.push(result);
}

console.log('ライセンス表記');
console.log('');
for (const { packageName, licenses, repository, licenseContent } of results) {
  console.log('-----------------------------------');
  console.log(`Package: ${packageName}`);
  console.log(`Licenses: ${licenses}`);
  console.log(`Repository: ${repository}`);
  console.log('License Content:');
  console.log(licenseContent);
  console.log('-----------------------------------');
  console.log('');
}

return 0;
