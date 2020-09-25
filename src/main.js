import {main} from './start.js';

fetch('data.json')
  .then((response) => response.json())
  .then((data) => main(data))
