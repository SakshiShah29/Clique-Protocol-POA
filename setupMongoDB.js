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

// Default Node Schema
const NodeSchema = new mongoose.Schema({
  nodeId: {
    type: Number,
    required: true,
  },
  nodelevel: {
    type: Number,
    required: true,
  },
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

const NodeSchemaFordiffLevels = mongoose.model("nodesAtDiffLevels", NodeSchema);

//level 3 addresses schema:
const level3address = new mongoose.Schema({
  nodeId: {
    type: Number,
    required: true,
  },
  nodelevel: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
    unique: true,
  },
});

const level3Addresses = mongoose.model("Level3Addresses", level3address);

// Define a schema for items (remains the same)
const itemSchema = new mongoose.Schema({
  itemId: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

// Define a schema for nodes to store items (remains the same)
const nodeToItemSchema = new mongoose.Schema({
  nodeId: {
    type: Number,
    required: true,
    unique: true,
  },
  items: [itemSchema], // Embed the item schema as an array within the node schema
});

const NodeToItem = mongoose.model("NodeToItem", nodeToItemSchema);

module.exports = {
  connectToMongoDB,
  NodeSchemaFordiffLevels,
  NodeToItem,
  level3Addresses,
};
