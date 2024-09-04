const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the location schema
const LocationSchema = new Schema({
  latitude: { type: Number, required: false },
  longitude: { type: Number, required: false }
}, { _id: false }); // Avoid creating an _id field for this subdocument

// Define the handset info schema
const HandsetInfoSchema = new Schema({
  category: { type: String, required: false }
}, { _id: false }); // Avoid creating an _id field for this subdocument

// Define the main user schema
const UserSchema = new Schema({
  username: { 
    type: String, 
    // required: true, 
    trim: true, 
    unique: true, 
    minlength: 3, // Example validation
    maxlength: 50 // Example validation
  },
  email: { 
    type: String, 
    required: false, 
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
    required: false,
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
  }, 
  illness : {
    type: Array,
    index: true,
    required: false
  },
  age: {
    type: Number,
    required: false
  }, 
  weight : {
    type: Number,
    required: false
  },
  mobile_number: {
    type: String,
    unique: true
  },
  height: {
    feet: {
      type: Number,
      required: false,
      min: 0,   // Minimum valid feet (e.g., 0 feet)
      max: 8,   // Maximum valid feet (reasonable upper limit, e.g., 8 feet)
      validate: {
        validator: function(v) {
          return v >= 0 && v <= 8;
        },
        message: props => `${props.value} is not a valid value for feet!`
      }
    },
    inches: {
      type: Number,
      required: false,
      min: 0,   // Minimum valid inches (e.g., 0 inches)
      max: 11,  // Maximum valid inches (cannot exceed 11 inches)
      validate: {
        validator: function(v) {
          return v >= 0 && v <= 11;
        },
        message: props => `${props.value} is not a valid value for inches!`
      }
    }
  },
  marital_status: {
    type: String,
    // required: true,
    enum: ['single', 'married', 'divorced', 'widowed'] // Only allowed values
  },
  sex: {
    type: String,
    // required: true,
    enum: ['male', 'female', 'other'] // Only allowed values for sex
  },
  ipAddress: {
    type: String,
    // required: true,
    validate: {
      validator: function(v) {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v);
      },
      message: props => `${props.value} is not a valid IP address!`
    }
  },
  dob: {
    type: Date,
    validate: {
      validator: function(v) {
        return v <= new Date(); // Ensure date of birth is not in the future
      },
      message: props => `${props.value} is not a valid date of birth!`
    }
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