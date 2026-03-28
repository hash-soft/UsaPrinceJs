@echo off

set files=2

set files=%files% weapons
set files=%files% armors

set files=%files% .\\data\\weapons.csv
set files=%files% .\\data\\armors.csv

node csvtojsonSystem.js .\\data\\itemParts.csv itemParts %files% ..\assets\data

pause