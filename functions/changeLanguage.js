const axios = require('axios');

async function changeLanguage(functionArgs) {
  let lang = functionArgs.language;
  return 'change current language to ' + lang;
  
}

module.exports = changeLanguage;