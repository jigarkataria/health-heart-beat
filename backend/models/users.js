const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the location schema
const LocationSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
}, { _id: false }); // Avoid creating an _id field for this subdocument

// Define the handset info schema
const HandsetInfoSchema = new Schema({
  category: { type: String, required: false }
}, { _id: false }); // Avoid creating an _id field for this subdocument

// Define the main user schema
const UserSchema = new Schema({
  username: { 
    type: String, 
    required: true, 
    trim: true, 
    unique: true, 
    minlength: 3, // Example validation
    maxlength: 50 // Example validation
  },
  email: { 
    type: String, 
    required: true, 
    trim: true, 
    unique: true, 
    lowercase: true, 
    validate: {
      validator: function(v) {
        // Simple email validation regex
        return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6 // Example validation
  },
  location: { 
    type: LocationSchema, 
    required: false 
  },
  network_throughput: { 
    type: Number, 
    required: false,
    min: 0 // Example validation
  },
  signal_conditions: { 
    type: String, 
    required: false,
    trim: true 
  },
  last_updated: { 
    type: Date, 
    default: Date.now
  },
  handset_info: { 
    type: HandsetInfoSchema, 
    required: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now
  },
  updated_at: { 
    type: Date, 
    default: Date.now
  }
});

// Middleware to update the `updated_at` field before saving
UserSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Indexes
UserSchema.index({ username: 1 }); // Index for fast lookups by username
UserSchema.index({ email: 1 });    // Index for fast lookups by email

// Create and export the model
const User = mongoose.model('User', UserSchema);
module.exports = User;