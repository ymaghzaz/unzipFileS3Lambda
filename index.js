var s3Unzip = require("./s3unzip");

const unzipFile = ({ bucket, file, foldername }) =>
  new Promise((resolve, reject) => {
    new s3Unzip(
      {
        bucket,
        file,
        deleteOnSuccess: false,
        verbose: true,
        foldername
      },
      function(err, success) {
        if (err) {
          resolve(err);
        } else {
          resolve(success);
        }
      }
    );
  });
