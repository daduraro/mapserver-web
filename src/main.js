import {main} from './start.js';
import '../favicon.svg'

fetch('data.json', {
    headers: {
      'Accept': 'application/json'
    },
  })
  .then((response) => response.json())
  .then((data) => main(data))
