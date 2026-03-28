@echo off

set files=25

set files=%files% messages
set files=%files% moveRoutes
set files=%files% charsets
set files=%files% musics
set files=%files% sounds
set files=%files% flags
set files=%files% variables
set files=%files% slots
set files=%files% members
set files=%files% enemies
set files=%files% items
set files=%files% skills
set files=%files% windowsets
set files=%files% mapList
set files=%files% positions
set files=%files% warpPlaces
set files=%files% states
set files=%files% animations
set files=%files% terrains
set files=%files% troops
set files=%files% encounters
set files=%files% fonts
set files=%files% pictures
set files=%files% vehicles
set files=%files% actionConditions

set files=%files% .\\data\\messages.csv
set files=%files% .\\data\\moveRoutes.csv
set files=%files% .\\data\\charsets.csv
set files=%files% .\\data\\musics.csv
set files=%files% .\\data\\sounds.csv
set files=%files% .\\data\\flags.csv
set files=%files% .\\data\\variables.csv
set files=%files% .\\data\\slots.csv
set files=%files% .\\data\\members.csv
set files=%files% .\\data\\enemies.csv
set files=%files% .\\data\\items.csv
set files=%files% .\\data\\skills.csv
set files=%files% .\\data\\windowsets.csv
set files=%files% .\\data\\mapList.csv
set files=%files% .\\data\\positions.csv
set files=%files% .\\data\\warpPlaces.csv
set files=%files% .\\data\\states.csv
set files=%files% .\\data\\animations.csv
set files=%files% .\\data\\terrains.csv
set files=%files% .\\data\\troops.csv
set files=%files% .\\data\\encounters.csv
set files=%files% .\\data\\fonts.csv
set files=%files% .\\data\\pictures.csv
set files=%files% .\\data\\vehicles.csv
set files=%files% .\\data\\actionConditions.csv

node csvtojsonSystem.js .\\data\\system.csv dataset %files%

pause