@echo off

chcp 65001

set out=..\assets\eventsets

set files=3 objects moveRoutes areas .\data\events\obj世界.csv .\data\events\routes世界.csv .\data\events\areas世界.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev世界 %files% %out%

set files=2 objects moveRoutes .\data\events\objラプリエール城1F.csv .\data\events\routesラプリエール城1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城1F %files% %out%

set files=2 objects moveRoutes .\data\events\objラプリエール城2F.csv .\data\events\routesラプリエール城2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城2F %files% %out%

set files=1 objects .\data\events\objラプリエール城3F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城3F %files% %out%

set files=1 objects .\data\events\objラプリエール城下町.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城下町 %files% %out%

set files=1 objects .\data\events\objラプリエール東の家.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール東の家 %files% %out%

set files=2 objects moveRoutes .\data\events\objアルビエ.csv .\data\events\routesアルビエ.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evアルビエ %files% %out%

set files=2 objects moveRoutes .\data\events\objアルビエ2F.csv .\data\events\routesアルビエ2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evアルビエ2F %files% %out%

set files=1 objects .\data\events\objいやしの家.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evいやしの家 %files% %out%

set files=1 objects .\data\events\objいやしの家2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evいやしの家2F %files% %out%

set files=1 objects .\data\events\obj北の洞窟B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev北の洞窟B1 %files% %out%

set files=1 objects .\data\events\obj北の洞窟B2.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev北の洞窟B2 %files% %out%

set files=2 objects moveRoutes .\data\events\objポートムード.csv .\data\events\routesポートムード.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evポートムード %files% %out%

set files=1 objects .\data\events\objポートムード2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evポートムード2F %files% %out%

set files=2 objects moveRoutes .\data\events\objイルデリ港.csv .\data\events\routesイルデリ港.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evイルデリ港 %files% %out%

set files=1 objects .\data\events\obj魔女の塔1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev魔女の塔1F %files% %out%

set files=1 objects .\data\events\obj魔女の塔2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev魔女の塔2F %files% %out%

set files=1 objects .\data\events\obj魔女の塔3F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev魔女の塔3F %files% %out%

set files=1 objects .\data\events\obj魔女の塔4F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev魔女の塔4F %files% %out%

set files=2 objects moveRoutes .\data\events\objピクサル山道.csv .\data\events\routesピクサル山道.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evピクサル山道 %files% %out%

set files=2 objects moveRoutes .\data\events\objピクサル洞窟A.csv .\data\events\routesピクサル洞窟A.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evピクサル洞窟A %files% %out%

set files=1 objects .\data\events\objピクサル洞窟1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evピクサル洞窟1 %files% %out%

set files=1 objects .\data\events\objピクサル洞窟2.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evピクサル洞窟2 %files% %out%

set files=1 objects .\data\events\objピクサル洞窟3.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evピクサル洞窟3 %files% %out%

set files=1 objects .\data\events\objブラス城1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evブラス城1F %files% %out%

set files=2 objects moveRoutes .\data\events\objブラス城2F.csv .\data\events\routesブラス城2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evブラス城2F %files% %out%

set files=1 objects .\data\events\objブラス城3F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evブラス城3F %files% %out%

set files=1 objects .\data\events\objブラス城B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evブラス城B1 %files% %out%

set files=3 objects moveRoutes areas .\data\events\objモングロ洞窟.csv .\data\events\routesモングロ洞窟.csv .\data\events\areasモングロ洞窟.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evモングロ洞窟 %files% %out%

set files=2 objects moveRoutes .\data\events\objモングロ山頂.csv .\data\events\routesモングロ山頂.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evモングロ山頂 %files% %out%

rem:以降ジャンプルム大陸

set files=2 objects moveRoutes .\data\events\obj停泊所.csv .\data\events\routes停泊所.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev停泊所 %files% %out%

set files=1 objects .\data\events\objイリシア.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evイリシア %files% %out%

set files=1 objects .\data\events\objイリシアB1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evイリシアB1 %files% %out%

set files=1 objects .\data\events\objペドロウム.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evペドロウム %files% %out%

set files=1 objects .\data\events\obj南の遺跡B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev南の遺跡B1 %files% %out%

set files=1 objects .\data\events\obj南の遺跡B2.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev南の遺跡B2 %files% %out%

set files=1 objects .\data\events\obj南の遺跡B3.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev南の遺跡B3 %files% %out%

set files=1 objects .\data\events\obj南の遺跡B4.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev南の遺跡B4 %files% %out%

set files=1 objects .\data\events\obj南の遺跡B5.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev南の遺跡B5 %files% %out%

set files=2 objects moveRoutes .\data\events\obj南の遺跡B6.csv .\data\events\routes南の遺跡B6.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev南の遺跡B6 %files% %out%

set files=1 objects .\data\events\obj古の神殿.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev古の神殿 %files% %out%

set files=1 objects .\data\events\objシュタージ.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evシュタージ %files% %out%

set files=1 objects .\data\events\objシュタージ2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evシュタージ2F %files% %out%

set files=1 objects .\data\events\obj試練の洞窟B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev試練の洞窟B1 %files% %out%

set files=1 objects .\data\events\obj試練の洞窟B2.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev試練の洞窟B2 %files% %out%

set files=1 objects .\data\events\obj試練の洞窟B3.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev試練の洞窟B3 %files% %out%

set files=1 objects .\data\events\obj試練の洞窟B4.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev試練の洞窟B4 %files% %out%

set files=3 objects areas moveRoutes .\data\events\obj試練の洞窟B5.csv .\data\events\areas試練の洞窟B5.csv .\data\events\routes試練の洞窟B5.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev試練の洞窟B5 %files% %out%

set files=1 objects .\data\events\obj光の塔1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev光の塔1F %files% %out%

set files=1 objects .\data\events\obj光の塔2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev光の塔2F %files% %out%

set files=1 objects .\data\events\obj光の塔3F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev光の塔3F %files% %out%

set files=1 objects .\data\events\obj光の塔4F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev光の塔4F %files% %out%

set files=1 objects .\data\events\obj光の塔5F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev光の塔5F %files% %out%

set files=1 objects .\data\events\objナクリアル城下町.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evナクリアル城下町 %files% %out%

set files=1 objects .\data\events\objナクリアル城1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evナクリアル城1F %files% %out%

set files=1 objects .\data\events\objナクリアル城2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evナクリアル城2F %files% %out%

set files=1 objects .\data\events\obj闇の洞窟B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev闇の洞窟B1 %files% %out%

set files=1 objects .\data\events\obj闇の洞窟B2.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev闇の洞窟B2 %files% %out%

set files=1 objects .\data\events\obj闇の洞窟B3.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev闇の洞窟B3 %files% %out%

set files=1 objects .\data\events\objイトランド城1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evイトランド城1F %files% %out%

set files=1 objects .\data\events\objイトランド城2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evイトランド城2F %files% %out%

set files=1 objects .\data\events\objイトランド城B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evイトランド城B1 %files% %out%

set files=1 objects .\data\events\objレゼ.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evレゼ %files% %out%

set files=1 objects .\data\events\obj通行路地上.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev通行路地上 %files% %out%

set files=1 objects .\data\events\obj通行路洞窟.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev通行路洞窟 %files% %out%

set files=1 objects .\data\events\objドレイス城下町.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evドレイス城下町 %files% %out%

set files=1 objects .\data\events\objドレイス城1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evドレイス城1F %files% %out%

set files=1 objects .\data\events\objドレイス城2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evドレイス城2F %files% %out%

set files=1 objects .\data\events\objドレイス城3F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evドレイス城3F %files% %out%

set files=1 objects .\data\events\objドレイス城B1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evドレイス城B1 %files% %out%

set files=2 objects areas .\data\events\objレイドス城.csv .\data\events\areasレイドス城.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evレイドス城 %files% %out%

set files=2 objects areas .\data\events\objうさぎ山道表.csv .\data\events\areasうさぎ山道表.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ山道表 %files% %out%

set files=2 objects areas .\data\events\objうさぎ山道裏.csv .\data\events\areasうさぎ山道裏.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ山道裏 %files% %out%

set files=1 objects .\data\events\objうさぎ洞窟下.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ洞窟下 %files% %out%

set files=1 objects .\data\events\objうさぎ洞窟上.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ洞窟上 %files% %out%

set files=1 objects .\data\events\objうさぎ王国.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ王国 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道1.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道1 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道2.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道2 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道3.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道3 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道4.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道4 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道5.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道5 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道6.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道6 %files% %out%

set files=1 objects .\data\events\objうさぎ神への道7.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evうさぎ神への道7 %files% %out%

set files=1 objects .\data\events\obj帰還中.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev帰還中 %files% %out%

set files=2 objects moveRoutes .\data\events\objラプリエール城E1F.csv .\data\events\routesラプリエール城1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城E1F %files% %out%

set files=1 objects .\data\events\objラプリエール城E2F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城E2F %files% %out%

set files=1 objects .\data\events\objラプリエール城E3F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城E3F %files% %out%

set files=2 objects moveRoutes .\data\events\obj世界S.csv .\data\events\routes世界S.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv ev世界S %files% %out%

set files=1 objects .\data\events\objラプリエール城EP1F.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evラプリエール城EP1F %files% %out%

set files=1 objects .\data\events\objおしまい.csv
node csvtojsonSystem.js .\data\events\ev空ファイル.csv evおしまい %files% %out%

pause
