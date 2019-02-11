#!/usr/bin/env node

const fs = require('fs');
const rimraf = require('rimraf');

const buildDir = `${__dirname}/../build`;
const tempDir = `${__dirname}/../temp`;

if (process.argv.includes('pre')) {
  if (fs.existsSync(tempDir)) {
    rimraf.sync(tempDir);
  }
  fs.mkdirSync(tempDir);

  fs.copyFileSync(`${buildDir}/CNAME`, `${tempDir}/CNAME`);
  fs.copyFileSync(`${buildDir}/.git`, `${tempDir}/.git`);
}
else if (process.argv.includes('post')) {
  fs.renameSync(`${tempDir}/CNAME`, `${buildDir}/CNAME`);
  fs.renameSync(`${tempDir}/.git`, `${buildDir}/.git`);
  fs.rmdirSync(tempDir);
}
