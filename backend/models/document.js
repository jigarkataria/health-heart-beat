const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the metadata schema
const MetadataSchema = new Schema({
  description: { type: String, required: false },
  tags: [{ type: String, required: false }],
  other_details: { type: String, required: false }
}, { _id: false });

// Define the main file schema
const FileSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  file_name: { type: String, required: true },
  file_type: { type: String, required: true },
  file_size: { type: Number, required: true },
  upload_date: { type: Date, required: true },
  storage_type: { type: String, enum: ['local', 's3'], required: true },
  storage_path: { type: String, required: true },
  s3_url: { type: String, required: function() { return this.storage_type === 's3'; } },
  metadata: MetadataSchema
});

// Create and export the model
const File = mongoose.model('File', FileSchema);
module.exports = File;