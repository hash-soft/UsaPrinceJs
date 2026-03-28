@echo off

rem 全csvファイルをjsonファイルに変換してgameのassetsフォルダに配置する
rem call一つごとにキー入力しないといけないので面倒ではある、pause入れなければよかった

call actionParts.bat
call animations.bat
call encounters.bat
call enemies.bat
call eventsets.bat
call itemParts.bat
call items.bat
call mapList.bat
call memberParts.bat
call members.bat
call skills.bat
call stateParts.bat
call system.bat
call terrains.bat
call troops.bat
call windowsets.bat
