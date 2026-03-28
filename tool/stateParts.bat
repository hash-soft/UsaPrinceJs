@echo off

set files=3

set files=%files% states
set files=%files% types
set files=%files% overs

set files=%files% .\\data\\states.csv
set files=%files% .\\data\\stateTypes.csv
set files=%files% .\\data\\stateOvers.csv

node csvtojsonSystem.js .\\data\\stateParts.csv stateParts %files% ..\assets\data

pause