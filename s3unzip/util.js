"use strict";

var AWS = require("aws-sdk");
var s3 = new AWS.S3();
var AdmZip = require("adm-zip");
var fs = require("fs");
var dateTime = require("date-time");
var md5 = require("md5");
var mime = require("mime-types");

var decompress = function(/*String*/ command, /*Function*/ cb) {
  if (!command.bucket || !command.file) {
    //bucket and file are required
    if (cb)
      cb(new Error("Error: missing either bucket name or full filename!"));
    else console.error("Error: missing either bucket name or full filename!");
    return;
  }

  var filenamePartsArray = command.file.split(".");
  var foldername = filenamePartsArray[0];

  s3.getObject(
    {
      Bucket: command.bucket,
      Key: command.file
    },
    function(err, data) {
      if (err) {
        if (cb) cb(new Error("File Error: " + err.message));
        else console.error("File Error: " + err.message);
        return;
      } else {
        if (command.verbose)
          console.log("Zip file '" + command.file + "' found in S3 bucket!");

        //write the zip file locally in a tmp dir
        var tmpZipFilename = md5(dateTime({ showMilliseconds: true }));
        fs.writeFileSync("/tmp/" + tmpZipFilename + ".zip", data.Body);

        //check that file in that location is a zip content type, otherwise throw error and exit
        if (
          mime.lookup("/tmp/" + tmpZipFilename + ".zip") !== "application/zip"
        ) {
          if (cb)
            cb(
              new Error(
                "Error: file is not of type zip. Please select a valid file (filename.zip)."
              )
            );
          else
            console.error(
              "Error: file is not of type zip. Please select a valid file (filename.zip)."
            );
          fs.unlinkSync("/tmp/" + tmpZipFilename + ".zip");
          return;
        }

        //find all files in the zip and the count of them
        var zip = new AdmZip("/tmp/" + tmpZipFilename + ".zip");
        var zipEntries = zip.getEntries();
        var zipEntryCount = Object.keys(zipEntries).length;

        //if no files found in the zip
        if (zipEntryCount === 0) {
          if (cb) cb(new Error("Error: the zip file was empty!"));
          else console.error("Error: the zip file was empty!");
          fs.unlinkSync("/tmp/" + tmpZipFilename + ".zip");
          return;
        }

        //for each file in the zip, decompress and upload it to S3; once all are uploaded, delete the tmp zip and zip on S3
        var counter = 0;
        zipEntries.forEach(function(zipEntry) {
          s3.upload(
            {
              Bucket: command.bucket,
              Key: command.foldername + "/" + zipEntry.entryName,
              Body: zipEntry.getData()
            },
            function(err, data) {
              counter++;

              if (err) {
                if (cb) cb(new Error("Upload Error: " + err.message));
                else console.error("Upload Error: " + err.message);
                fs.unlinkSync("/tmp/" + tmpZipFilename + ".zip");
                return;
              }

              if (command.verbose)
                console.log("File decompressed to S3: " + data.Location);

              //if all files are unzipped...
              if (zipEntryCount === counter) {
                //delete the tmp (local) zip file
                fs.unlinkSync("/tmp/" + tmpZipFilename + ".zip");

                if (command.verbose)
                  console.log("Local temp zip file deleted.");

                //delete the zip file up on S3
                if (command.deleteOnSuccess) {
                  s3.deleteObject(
                    { Bucket: command.bucket, Key: command.file },
                    function(err, data) {
                      if (err) {
                        if (cb) cb(new Error("Delete Error: " + err.message));
                        else console.error("Delete Error: " + err.message);
                        return;
                      }

                      if (command.verbose)
                        console.log("S3 file '" + command.file + "' deleted.");

                      //WE GOT TO THE END
                      cb(null, "Success!");
                    }
                  );
                } else {
                  //WE GOT TO THE END
                  cb(null, "Success!");
                }
              }
            }
          );
        });
      }
    }
  );
};

module.exports = {
  decompress: decompress
};
