const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for food items
const FoodItemSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  prices: {
    normal: {
      type: Number,
      default: null, // Allow for null or missing prices
    },
    special: {
      type: Number,
      default: null,
    },
  },
}, { _id: false }); // Disable automatic _id for food items

// Schema for opening hours of specific days
const DayOpeningHoursSchema = new Schema({
  start_time: {
    type: String,
    required: true,
  },
  end_time: {
    type: String,
    required: true,
  },
}, { _id: false });

// Schema for opening hours with frequency and days
const OpeningHoursSchema = new Schema({
  frequency: {
    type: String,
    required: true,
  },
  days: {
    ทุกวัน: DayOpeningHoursSchema,
    จันทร์: DayOpeningHoursSchema,
    อังคาร: DayOpeningHoursSchema,
    พุธ: DayOpeningHoursSchema,
    พฤหัสบดี: DayOpeningHoursSchema,
    ศุกร์: DayOpeningHoursSchema,
    เสาร์: DayOpeningHoursSchema,
    อาทิตย์: DayOpeningHoursSchema,
  },
}, { _id: false });

// Schema for stores
const StoreSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  opening_hours: OpeningHoursSchema,
  food_items: [FoodItemSchema], // Can be an empty array
}, { _id: false });

// Schema for busy hours
const BusyHoursSchema = new Schema({
  start_time: {
    type: String,
    required: true,
  },
  end_time: {
    type: String,
    required: true,
  },
}, { _id: false });

// Schema for canteens
const CanteenSchema = new Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  canteen_name: {
    type: String,
    required: true,
  },
  busy_hours: BusyHoursSchema,
  with_airconditioning: {
    type: Boolean,
    required: true,
  },
  stores: [StoreSchema], // Can be an empty array
});

// Create the Canteen model
const Canteen = mongoose.model('Canteen', CanteenSchema);

module.exports = Canteen;