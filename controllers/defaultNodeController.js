// controllers/defaultNodeController.js
const CryptoJS = require("crypto-js");
const {
  connectToMongoDB,
  NodeSchemaFordiffLevels,
  level3Addresses,
} = require("../setupMongoDB");
const Web3 = require("web3");
const contractAbi = require("../ContractABI.json");
const contractAddress = process.env.CONTRACT_ADDRESS;
const parentNodeAddress = process.env.NODE1_ADDRESS;
const secretKey = process.env.SECRET_KEY;

async function addNodesforDiffLevels(req, res) {
  try {
    const { address, nodeUrl, nodeId, level } = req.body;
    const web3 = new Web3("http://localhost:8501");
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const addingNode = await contract.methods
      .addDiffLevelNode(nodeId, address, true, level)
      .send({ from: parentNodeAddress });
    console.log(addingNode);
    console.log(`Level 2 ${address} added by Parent node in the blockchain!`);

    await connectToMongoDB();

    // Encrypt the address before storing it
    const encryptedAddress = CryptoJS.AES.encrypt(
      address,
      secretKey
    ).toString();

    // Create a new DefaultNode instance with the encrypted address
    const newNode = new NodeSchemaFordiffLevels({
      nodeId: nodeId,
      nodelevel: level,
      address: encryptedAddress,
      nodeUrl: nodeUrl,
    });

    // Save the default node to MongoDB
    const savedNode = await newNode.save({ maxTimeMS: 60000 }); // 60 seconds timeout

    console.log("Node data successfully added to Mongodb");
    res.status(201).json(savedNode);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function addNodesAtlevle3(req, res) {
  try {
    const { level2NodeId, nodeId, address, level2NodeAddress, level2nodeUrl } =
      req.body;
    const web3 = new Web3(level2nodeUrl);
    const contract = new web3.eth.Contract(contractAbi, contractAddress);
    const isAuthorized = await contract.methods
      .level2Nodes(level2NodeId, level2NodeAddress)
      .call();
    if (!isAuthorized.canPropose || !isAuthorized.isActive) {
      console.log("The address is not authorized to add level 3 nodes.");
      return res
        .status(403)
        .json({ error: "The address is not authorized to add items." });
    }

    if (isAuthorized.canPropose && isAuthorized.isActive) {
      await contract.methods
        .authorizeLevel3Node(level2NodeId, nodeId, address)
        .send({ from: level2NodeAddress });
      console.log(`Node ${nodeId} successfullly added by parent node`);

      // res.status(200).json({ message: "Items added successfully" });
      const encryptedAddress = CryptoJS.AES.encrypt(
        address,
        secretKey
      ).toString();

      await connectToMongoDB();

      const newNode = new level3Addresses({
        nodeId: nodeId,
        nodelevel: 3,
        address: encryptedAddress,
      });

      // Save the default node to MongoDB
      const savedNode = await newNode.save({ maxTimeMS: 60000 }); // 60 seconds timeout

      console.log("Node at level 3 data successfully added to Mongodb");
      res.status(201).json(savedNode);
    } else {
      console.log("There was an error");
      res.status(500).json({ error: "error in adding items" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  addNodesforDiffLevels,
  addNodesAtlevle3,
};
