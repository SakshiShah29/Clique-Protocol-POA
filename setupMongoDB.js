const mongoose = require("mongoose");
require("dotenv").config();

const mongoURI = process.env.MONGO_URI;

async function connectToMongoDB() {
  try {
    await mongoose.connect(mongoURI);
    console.log("connected to mongo db");
  } catch (error) {
    console.error("error connecting to mongodb atlas", error);
    throw error;
  }
}

//Schema
const sealerSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
});

const Sealer = mongoose.model("Sealer", sealerSchema);

// Default Node Schema
const defaultNodeSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
  nodeUrl: {
    type: String,
    required: true,
  },
});

const DefaultNode = mongoose.model("DefaultNode", defaultNodeSchema);

module.exports = {
  connectToMongoDB,
  Sealer,
  DefaultNode,
};
