// controllers/itemController.js
const { connectToMongoDB, NodeToItem } = require("../setupMongoDB");
const axios = require("axios");
const Web3 = require("web3");
const CryptoJS = require("crypto-js");
const contractAbi = require("../ContractABI.json");
const contractAddress = process.env.CONTRACT_ADDRESS;
const secretKey = process.env.SECRET_KEY;
//check balance function :
async function checkBalance(nodeurl, address) {
  const ethereumNodeUrl = nodeurl; // Replace with your Ethereum node URL
  const data = {
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [address, "latest"], // 'latest' means checking the latest block
    id: new Date().getTime(),
  };

  try {
    const response = await axios.post(ethereumNodeUrl, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data.result) {
      const balanceInWei = parseInt(response.data.result, 16);
      const balanceInEther = Web3.utils.fromWei(
        balanceInWei.toString(),
        "ether"
      );
      return balanceInEther;
    } else {
      console.error("Error checking balance:", response.data.error.message);
      return null;
    }
  } catch (error) {
    console.error("Error checking balance:", error.message);
    return null;
  }
}

//function to add funds:
async function sendTransaction(parentnodeurl, fromaddr, toaddr) {
  const web3 = new Web3(parentnodeurl);
  const unlockResult = await web3.eth.personal.unlockAccount(
    fromaddr,
    1234,
    600
  ); // Unlock for 10 minutes
  if (unlockResult) {
    console.log("Account unlocked successfully.");
    const valueInWei = "10000000000000000"; // Replace with the amount in Wei (e.g., 0.01 Ether)

    const data = {
      jsonrpc: "2.0",
      method: "eth_sendTransaction",
      params: [
        {
          from: fromaddr,
          to: toaddr,
          value: valueInWei,
        },
      ],
      id: new Date().getTime(),
    };

    // Create an Axios post request to send the JSON-RPC request
    try {
      const response = await axios.post(parentnodeurl, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.result) {
        console.log("Transaction hash:", response.data.result);
        console.log("Parent sent funds sent successfully!");
      } else {
        console.error(
          "Error sending transaction:",
          response.data.error.message
        );
      }
    } catch (error) {
      console.error("Error sending transaction:", error.message);
    }
  } else {
    console.error("Failed to unlock the account.");
    return;
  }
}

async function addItems(req, res) {
  const { itemId, quantity, address, nodeurl, nodeId, parentAddress } =
    req.body;

  try {
    const web3 = new Web3(nodeurl);
    const contract = new web3.eth.Contract(contractAbi, contractAddress);

    const isAuthorized = await contract.methods
      .level3Nodes(nodeId, address)
      .call();
    if (!isAuthorized.canPropose || !isAuthorized.isActive) {
      console.log("The address is not authorized to add items.");
      return res
        .status(403)
        .json({ error: "The address is not authorized to add items." });
    }

    if (isAuthorized.canPropose && isAuthorized.isActive) {
      checkBalance(nodeurl, address)
        .then((balance) => {
          if (balance != 0) {
            console.log(
              `Balance of ${address}: ${balance} Ether.Address can write on the blockchain`
            );
          } else if (balance == 0) {
            console.log(
              "Address does not have enough. Asking parent node to send funds"
            );
            sendTransaction(nodeurl, parentAddress, address);
          }
        })
        .catch((error) => {
          console.error("Error in checking balance:", error);
        });
      const unlockResult = await web3.eth.personal.unlockAccount(
        address,
        "1234",
        600
      );
      if (unlockResult) {
        await contract.methods
          .addItem(itemId, quantity, nodeId)
          .send({ from: address });
        console.log(
          `Added items to the blockchain from level3 node ${address}`
        );
      } else {
        console.log("Accounnt not unlocked successfully");
      }
      // res.status(200).json({ message: "Items added successfully" });
      const encryptedSealerAddress = CryptoJS.AES.encrypt(
        address,
        secretKey
      ).toString();

      await connectToMongoDB();
      // const nodestoitem = db.collection('nodestoitem');
      const existingNode = await NodeToItem.findOne({ encryptedSealerAddress });

      if (existingNode) {
        // Node exists, add the item to the existing node
        existingNode.items.push({ itemId, quantity });
        const updatedNode = await existingNode.save();
        console.log("Item added to existing node:", updatedNode);
        res.status(200).json({ message: "Added items to existing node" });
      } else {
        const newNode = new NodeToItem({
          nodeId: nodeId,
          items: [{ itemId, quantity }],
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
  const nodeUrl = req.body.nodeUrl;
  const address = req.body.address;
  const nodeId = req.body.nodeId;
  const web3 = new Web3(nodeUrl);
  const contract = new web3.eth.Contract(contractAbi, contractAddress);

  // Check if the sealer is authorized to add
  const isAuthorized = await contract.methods
    .level3Nodes(nodeId, address)
    .call();
  if (!isAuthorized.canPropose || !isAuthorized.isActive) {
    console.log("The address is not authorized to read items.");
    return res
      .status(403)
      .json({ error: "The address is not authorized to read items." });
  }

  if (isAuthorized.canPropose && isAuthorized.isActive) {
    const unlockResult = await web3.eth.personal.unlockAccount(
      address,
      "1234",
      600
    );
    if (unlockResult) {
      try {
        const itemData = await contract.methods
          .readItem(itemId, nodeId)
          .call({ from: address });
        res.json(itemData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    } else {
      console.log("Account unloack not successfull");
    }
  }
}
module.exports = {
  addItems,
  readItemById,
};
