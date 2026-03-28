@echo off

set files=8

set files=%files% actions
set files=%files% types
set files=%files% strikes
set files=%files% figures
set files=%files% effects
set files=%files% extras
set files=%files% patternLists
set files=%files% conditions

set files=%files% .\\data\\actions.csv
set files=%files% .\\data\\actionTypes.csv
set files=%files% .\\data\\actionStrikes.csv
set files=%files% .\\data\\actionFigures.csv
set files=%files% .\\data\\actionEffects.csv
set files=%files% .\\data\\actionExtras.csv
set files=%files% .\\data\\actionPatternLists.csv
set files=%files% .\\data\\actionConditions.csv

node csvtojsonSystem.js .\\data\\actionParts.csv actionParts %files% ..\assets\data

pause