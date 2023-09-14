// controllers/itemController.js
const { connectToMongoDB, nodestoitem } = require("../setupMongoDB");
const axios = require("axios");
const Web3 = require("web3");

const contractAbi = require("../ProposalTimeABI.json");
const contractAddress = "0x36aDeb899aaCb4d58079e3aFf34C33b50897eC9E";

async function addItems(req, res) {
  const { itemid, quantity, address, nodeurl } = req.body;

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
    
        // await contract.methods
        //   .addItem(itemid, quantity)
        //   .send({ from: address });
        // console.log(
        //   `Added items to the blockchain ${address}`
        // );
        // res.status(200).json({ message: "Items added successfully" });
     
        await connectToMongoDB();
        // const nodestoitem = db.collection('nodestoitem');
        const existingNode = await nodestoitem.findOne({ address });

        if (existingNode) {
          // Node exists, add the item to the existing node
          existingNode.items.push({ itemid, quantity });
          const updatedNode = await existingNode.save();
          console.log("Item added to existing node:", updatedNode);
        } else {
            const newNode = new nodestoitem({
                address: address, 
                items: [
                  { itemid,quantity }
                ],
              });
          
              const savedNode = await newNode.save();
              console.log("Node with items saved:", savedNode);
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

module.exports = {
  addItems,
};
