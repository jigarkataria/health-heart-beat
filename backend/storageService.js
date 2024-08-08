const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configuration
const config = {
  storage: {
    type: 'local', // Change to 'local' for local storage
    local: {
      path: path.join(__dirname, 'uploads')
    },
    s3: {
      bucketName: process.env.AWS_S3_BUCKET_NAME,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    }
  }
};

// Initialize S3
const s3 = new AWS.S3({
  accessKeyId: config.storage.s3.accessKeyId,
  secretAccessKey: config.storage.s3.secretAccessKey,
  region: config.storage.s3.region
});

/**
 * Uploads a file to the specified storage (local or S3).
 * @param {Object} file - The file object (from multer or any other source).
 * @returns {Promise<Object>} - The file metadata including storage info.
 */
async function uploadFile(file,name) {
  if (config.storage.type === 's3') {
    return uploadToS3(file,name);
  } else {
    return uploadToLocal(file,name);
  }
}

/**
 * Uploads a file to the local filesystem.
 * @param {Object} file - The file object.
 * @returns {Promise<Object>} - The file metadata.
 */
function uploadToLocal(file,name) {
  return new Promise((resolve, reject) => {
    const uploadPath = path.join(config.storage.local.path, name);
    fs.writeFile(uploadPath, file.buffer, (err) => {
      if (err) {
        return reject(err);
      }
      resolve({
        storageType: 'local',
        path: uploadPath
      });
    });
  });
}

/**
 * Uploads a file to AWS S3.
 * @param {Object} file - The file object.
 * @returns {Promise<Object>} - The file metadata including S3 URL.
 */
function uploadToS3(file) {
  const params = {
    Bucket: config.storage.s3.bucketName,
    Key: `uploads/${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  return s3.upload(params).promise().then(data => ({
    storageType: 's3',
    path: params.Key,
    url: data.Location
  }));
}

/**
 * Retrieves the file URL or local path based on storage type.
 * @param {string} fileName - The name of the file.
 * @returns {Promise<string>} - The file URL or local path.
 */
function getFileUrl(fileName) {
  if (config.storage.type === 's3') {
    return getS3FileUrl(fileName);
  } else {
    return Promise.resolve(getLocalFilePath(fileName));
  }
}

/**
 * Retrieves the local file path.
 * @param {string} fileName - The name of the file.
 * @returns {string} - The local file path.
 */
function getLocalFilePath(fileName) {
  return path.join(config.storage.local.path, fileName);
}

/**
 * Retrieves the S3 file URL.
 * @param {string} fileName - The name of the file.
 * @returns {Promise<string>} - The S3 file URL.
 */
function getS3FileUrl(fileName) {
  const params = {
    Bucket: config.storage.s3.bucketName,
    Key: `uploads/${fileName}`,
    Expires: 60 * 60 // 1 hour expiration
  };

  return s3.getSignedUrlPromise('getObject', params);
}

module.exports = {
  uploadFile,
  getFileUrl
};