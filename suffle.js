const fs = require("fs");
const data = require("./phones_data_v3.json");

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

data.phones = shuffleArray(data.phones);

fs.writeFileSync("shuffled_phones.json", JSON.stringify(data, null, 2));

console.log("✅ Shuffled and saved!");