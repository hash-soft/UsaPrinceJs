@echo off

set files=5

set files=%files% skillLists
set files=%files% parameters
set files=%files% exps
set files=%files% learnings
set files=%files% intelligences

set files=%files% .\\data\\skillLists.csv
set files=%files% .\\data\\parameters.csv
set files=%files% .\\data\\exps.csv
set files=%files% .\\data\\learnings.csv
set files=%files% .\\data\\intelligences.csv

node csvtojsonSystem.js .\\data\\memberParts.csv memberParts %files% ..\assets\data

pause