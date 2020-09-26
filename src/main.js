import {main} from './start.js';

fetch('data.json', {
    headers: {
      'Accept': 'application/json'
    },
  })
  .then((response) => response.json())
  .then((data) => main(data))
