@echo off

set files=24

set files=%files% terms
set files=%files% messages
set files=%files% battleEvents
set files=%files% battleConditions
set files=%files% moveRoutes
set files=%files% positions
set files=%files% warpPlaces
set files=%files% charsets
set files=%files% slipDamages
set files=%files% damageCuts
set files=%files% paramEffects
set files=%files% elements
set files=%files% corrects
set files=%files% vehicles
set files=%files% rates
set files=%files% numberLists
set files=%files% numberMaps
set files=%files% musics
set files=%files% sounds
set files=%files% pictures
set files=%files% fonts
set files=%files% flags
set files=%files% variables
set files=%files% slots

set files=%files% .\\data\\terms.csv
set files=%files% .\\data\\messages.csv
set files=%files% .\\data\\battleEvents.csv
set files=%files% .\\data\\battleConditions.csv
set files=%files% .\\data\\moveRoutes.csv
set files=%files% .\\data\\positions.csv
set files=%files% .\\data\\warpPlaces.csv
set files=%files% .\\data\\charsets.csv
set files=%files% .\\data\\slipDamages.csv
set files=%files% .\\data\\damageCuts.csv
set files=%files% .\\data\\paramEffects.csv
set files=%files% .\\data\\elements.csv
set files=%files% .\\data\\corrects.csv
set files=%files% .\\data\\vehicles.csv
set files=%files% .\\data\\rates.csv
set files=%files% .\\data\\numberLists.csv
set files=%files% .\\data\\numberMaps.csv
set files=%files% .\\data\\musics.csv
set files=%files% .\\data\\sounds.csv
set files=%files% .\\data\\pictures.csv
set files=%files% .\\data\\fonts.csv
set files=%files% .\\data\\flags.csv
set files=%files% .\\data\\variables.csv
set files=%files% .\\data\\slots.csv


node csvtojsonSystem.js .\\data\\system.csv system %files% ..\assets\data

pause