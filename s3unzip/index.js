"use strict";

var Utils = require("./util");

function s3Unzip(command, cb) {
  if (cb === undefined) {
    cb = function(err, success) {};
  }
  var vBucket, vFile;
  if (command.args && command.args.length >= 2) {
    vBucket = command.args[0];
    vFile = command.args[1];
  }
  if (command.bucket) {
    vBucket = command.bucket;
  }
  if (command.file) {
    vFile = command.file;
  }
  Utils.decompress(
    {
      bucket: vBucket,
      file: vFile,
      deleteOnSuccess: command.deleteOnSuccess,
      foldername: command.foldername,
      verbose: command.verbose
    },
    cb
  );
}

module.exports = s3Unzip;
