// controllers/defaultNodeController.js
const CryptoJS = require("crypto-js");
const { DefaultNode, connectToMongoDB } = require("../setupMongoDB");

// Define a secret key for encryption
const secretKey = "secretkey1"; // Replace with your secret key

async function addDefaultNode(req, res) {
  try {
    const { address, nodeUrl } = req.body;
    await connectToMongoDB()

    // Encrypt the address before storing it
    const encryptedAddress = CryptoJS.AES.encrypt(address, secretKey).toString();

    // Create a new DefaultNode instance with the encrypted address
    const defaultNode = new DefaultNode({
      address: encryptedAddress,
      nodeUrl: nodeUrl,
    });

    // Save the default node to MongoDB
    const savedNode = await defaultNode.save({ maxTimeMS: 60000 }); // 60 seconds timeout


    res.status(201).json(savedNode);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  addDefaultNode,
};
