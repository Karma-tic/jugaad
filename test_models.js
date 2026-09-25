const THREE = require('three');
const fs = require('fs');

// We need to polyfill THREE into global to require models.js
global.THREE = THREE;

// evaluate models.js
const code = fs.readFileSync('src/models.js', 'utf8');
// remove export statement if present
const cleanCode = code.replace(/export default \w+;/, '');
eval(cleanCode);

const house = AssetFactory.createHouseInterior();
console.log("House created successfully! Children:", house.children.length);
