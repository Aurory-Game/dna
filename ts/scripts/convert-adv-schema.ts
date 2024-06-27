import * as fs from 'fs';
import * as path from 'path';

function getCurrentDateFormatted() {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// Define the input and output file paths
const inputFilePath = './src/deps/schemas/adventures/v0.0.6.json';
function run() {
  const advSchema = JSON.parse(fs.readFileSync(inputFilePath, 'utf8').toString());
  const nefties = advSchema.nefties;
  const version = '4.0.0';
  const date = getCurrentDateFormatted();
  const newSchema = {
    version,
    date,
    nefties,
  };
  console.log(advSchema);
}

run();
