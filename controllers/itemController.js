// controllers/itemController.js
const { connectToMongoDB, nodetoitem } = require("../setupMongoDB");
const axios = require("axios");
const Web3 = require("web3");
const CryptoJS = require("crypto-js");
const contractAbi = require("../ProposalTimeABI.json");
const contractAddress = process.env.CONTRACT_ADDRESS;
const secretKey = process.env.SECRET_KEY;
async function addItems(req, res) {
  const { itemId, quantity, address, nodeurl } = req.body;

  try {
    const web3 = new Web3(nodeurl);
    const contract = new web3.eth.Contract(contractAbi, contractAddress);

    // Check if the sealer is authorized to add
    const isAuthorized = await contract.methods.nodes(address).call();
    if (!isAuthorized.canPropose || !isAuthorized.isActive) {
      console.log("The address is not authorized to add items.");
      return res.status(403).json({ error: "The address is not authorized to add items." });
    }

    if (isAuthorized.canPropose && isAuthorized.isActive) {
    
        await contract.methods
          .addItem(itemId, quantity)
          .send({ from: address });
        console.log(
          `Added items to the blockchain ${address}`
        );
        // res.status(200).json({ message: "Items added successfully" });
        const encryptedSealerAddress = CryptoJS.AES.encrypt(address, secretKey).toString();
     
        await connectToMongoDB();
        // const nodestoitem = db.collection('nodestoitem');
        const existingNode = await nodetoitem.findOne({ encryptedSealerAddress });

        if (existingNode) {
          // Node exists, add the item to the existing node
          existingNode.items.push({ itemId, quantity });
          const updatedNode = await existingNode.save();
          console.log("Item added to existing node:", updatedNode);
          res.status(200).json({ message:"Added items to existing node" });
        } else {
            const newNode = new nodetoitem({
                address: encryptedSealerAddress, 
                items: [
                  { itemId,quantity }
                ],
              });
          
              const savedNode = await newNode.save();
              console.log("Node with items saved:", savedNode);
              res.status(200).json({ message: "added Items in new node" });
        }
     
    } else {
      console.log("There was an error");
      res.status(500).json({ error: "error in adding items" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function readItemById(req, res) {
  const itemId = req.params.itemId;
  const nodeUrl=req.body.nodeUrl
  const  address= req.body.address; 
  const web3 = new Web3(nodeUrl);
  const contract = new web3.eth.Contract(contractAbi, contractAddress);

  // Check if the sealer is authorized to add
  const isAuthorized = await contract.methods.nodes(address).call();
  if (!isAuthorized.canPropose || !isAuthorized.isActive) {
    console.log("The address is not authorized to read items.");
    return res.status(403).json({ error: "The address is not authorized to read items." });
  }

  if (isAuthorized.canPropose && isAuthorized.isActive) {
  
  try {
    const itemData = await contract.methods.readItem(itemId).call({ from: address });
    res.json(itemData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}}
module.exports = {
  addItems,
  readItemById
};
