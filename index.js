const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(
  "sk_test_51PNrFQB02S9bUZUJSnsFJbIenuOqczyzTAZc6BbpMxIe2gnE6bkknkVXmkuEtZGQDCmUwWo6wF55IsGn1suBhdzr00B0MEK7Cp"
);
const app = express();
const port = process.env.PORT || 5000;

// middleweare
app.use(cors());
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://assignment-12-novahomes-proj.web.app",
      "https://assignment-12-novahomes-proj.firebaseapp.com",
    ],
  })
);

app.get("/", async (req, res) => {
  res.send("Nova Homes Server Site Activate!");
});

// meddleware for verify token
const verifyToken = (req, res, next) => {
  console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access!" });
  }

  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.Access_Secret_token, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// Mongodb database start from here

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASS}@cluster0.vuymtad.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // All Collections are here
    const userCollection = client.db("novaHomesDB").collection("users");
    const reviewCollection = client.db("novaHomesDB").collection("reviews");
    const wishlistCollection = client.db("novaHomesDB").collection("wishlists");
    const propertyCollection = client
      .db("novaHomesDB")
      .collection("properties");
    const OfferedPropertyCollection = client
      .db("novaHomesDB")
      .collection("Offeredproperties");
    const paymentCollection = client.db("novaHomesDB").collection("payments");

    // jwt area
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.Access_Secret_token, {
        expiresIn: "10d",
      });
      res.send({ token });
    });

    // middleweare for verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbiden acess" });
      }
      next();
    };
    // middleweare for verify agent
    const verifyAgent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAgent = user?.role === "agent";
      if (!isAgent) {
        return res.status(403).send({ message: "forbiden acess" });
      }
      next();
    };

    // users collection
    app.post("/allUsers", async (req, res) => {
      const userInfo = req.body;
      console.log(userInfo);
      const email = userInfo.email;
      const query = { email: email };
      const isEmailExist = await userCollection.findOne(query);
      if (isEmailExist) {
        return res.send({ message: "Email Already Exist!" });
      }
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    app.get("/allUsers", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // make user admin route
    app.patch(
      "/allUsers/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // make user agent route
    app.patch(
      "/allUsers/agent/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "agent",
          },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );
    // make user fraud route
    app.patch(
      "/allUsers/fraud/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "fraud",
          },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // handle user delete route
    app.delete("/allUsers/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // handle user role route
    app.get("/allUsers/userRole/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbiden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);

      let userRole = "";
      if (user) {
        userRole = user?.role;
      }

      res.send({ userRole });
    });

    // Property Collection
    app.get("/allProperties", async (req, res) => {
      const result = await propertyCollection.find().toArray();
      res.send(result);
    });

    app.post("/allProperties", verifyToken, verifyAgent, async (req, res) => {
      const propertyItem = req.body;
      const result = await propertyCollection.insertOne(propertyItem);
      res.send(result);
    });

    app.get(
      "/allProperties/:email",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "Forbiden access" });
        }
        const query = { agentEmail: email };
        const result = await propertyCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get("/propertiesById/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await propertyCollection.findOne(query);
      res.send(result);
    });

    app.patch(
      "/allProperties/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const body = req.body;
        const query = { _id: new ObjectId(id) };
        const existingProperty = await propertyCollection.findOne(query);
        const updatedProperty = {
          $set: {
            ...existingProperty,
            ...body,
          },
        };
        const result = await propertyCollection.updateOne(
          query,
          updatedProperty
        );
        res.send(result);
      }
    );

    app.delete(
      "/allProperties/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const result = await propertyCollection.deleteOne(query);

        res.send(result);
      }
    );

    app.patch(
      "/allProperties/verified/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            verificationStatus: "Verified",
          },
        };

        const result = await propertyCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.patch(
      "/allProperties/reject/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            verificationStatus: "Rejected",
          },
        };

        const result = await propertyCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.get("/allAdminVerifiedProperites", async (req, res) => {
      const query = { verificationStatus: "Verified" };
      const result = await propertyCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/allAdminVerifiedProperitesBySearch", async (req, res) => {
      const search = req.query.search;
      let query = { verificationStatus: "Verified" };
      if (search) {
        query = {
          propertyLocation: {
            $regex: search,
            $options: "i",
          },
          verificationStatus: "Verified",
        };
      }
      const result = await propertyCollection.find(query).toArray();
      res.send(result);
    });

    // wishlist collection from here
    app.post("/allWishlist", async (req, res) => {
      const wishlistInfo = req.body;
      const propertyId = wishlistInfo.propertyId;
      const userEmail = wishlistInfo.wishlistUserEmail;
      const query = {
        propertyId: propertyId,
        wishlistUserEmail: userEmail,
      };
      const isWishlistExist = await wishlistCollection.findOne(query);

      if (isWishlistExist) {
        return res
          .status(409)
          .send({ message: "Property Already Exist in the Wishlist!" });
      }
      const result = await wishlistCollection.insertOne(wishlistInfo);
      res.status(201).send(result);
    });

    app.get("/allWishlist/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbiden access" });
      }
      const query = { wishlistUserEmail: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/makeAnOfferWishlistItem/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await propertyCollection.findOne(query);
      res.send(result);
    });

    app.delete("/allWishlist", verifyToken, async (req, res) => {
      const id = req.query.id;
      const email = req.query.email;
      const query = { propertyId: id, wishlistUserEmail: email };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // review colleciton start from here
    app.get("/allReviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.post("/allReviews", verifyToken, async (req, res) => {
      const reviewData = req.body;
      const result = await reviewCollection.insertOne(reviewData);
      res.send(result);
    });

    app.get("/allReviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { propertyId: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/allReviewsByEmail/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbiden access" });
      }
      const query = { reviewerEmail: email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/allReviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await reviewCollection.deleteOne(query);

      res.send(result);
    });

    app.delete("/allMyReviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await reviewCollection.deleteOne(query);

      res.send(result);
    });

    //  Offered property Collection from here
    app.post("/allOfferedProperties", verifyToken, async (req, res) => {
      const offeredData = req.body;
      const result = await OfferedPropertyCollection.insertOne(offeredData);
      res.send(result);
    });

    app.get("/allOfferedProperties/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Forbiden access" });
      }
      const query = { buyerEmail: email };
      const result = await OfferedPropertyCollection.find(query).toArray();
      res.send(result);
    });

    app.get(
      "/allOfferedPropertiesForAgent/:email",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const email = req.params.email;
        const query = { agentEmail: email };
        const result = await OfferedPropertyCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get("/offeredPropertyById/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { propertyId: id };
      const result = await OfferedPropertyCollection.findOne(query);
      res.send(result);
    });

    app.get("/allOfferedProperties", verifyToken, async (req, res) => {
      const result = await OfferedPropertyCollection.find().toArray();
      res.send(result);
    });

    // handle acceptence in offer properties collection
    app.patch(
      "/allOfferedProperties/accepted/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            offerPropertyVerificationStatus: "Accepted",
          },
        };

        const result = await OfferedPropertyCollection.updateOne(
          filter,
          updateDoc
        );
        if (result.modifiedCount > 0) {
          const acceptedOffer = await OfferedPropertyCollection.findOne(filter);
          const propertyTitle = acceptedOffer.propertyTitle;

          const rejectFilter = {
            propertyTitle: propertyTitle,
            _id: { $ne: new ObjectId(id) },
          };
          const rejectUpdateDoc = {
            $set: {
              offerPropertyVerificationStatus: "Rejected",
            },
          };

          await OfferedPropertyCollection.updateMany(
            rejectFilter,
            rejectUpdateDoc
          );
        }
        res.send(result);
      }
    );

    // handle rejection in offer properties collection
    app.patch(
      "/allOfferedProperties/rejected/:id",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            offerPropertyVerificationStatus: "Rejected",
          },
        };

        const result = await OfferedPropertyCollection.updateOne(
          filter,
          updateDoc
        );
        res.send(result);
      }
    );

    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(price, amount);
      if (amount) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });

    app.post("/allPayments", async (req, res) => {
      const payments = req.body;
      console.log("payment info :", payments);
      const updateDataId = payments.offeredPropertyById;
      const query = { _id: new ObjectId(updateDataId) };
      const updateProp = await OfferedPropertyCollection.findOne(query);
      console.log("searching info", updateProp);
      const updateDoc = {
        $set: {
          offerPropertyVerificationStatus: "Bought",
          transactionId: payments.transactionId,
        },
      };

      const updateResult = await OfferedPropertyCollection.updateOne(
        query,
        updateDoc
      );

      const paymentResult = await paymentCollection.insertOne(payments);

      res.send({ paymentResult, updateResult });
    });

    app.get(
      "/allPayments/:email",
      verifyToken,
      verifyAgent,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "Forbiden access" });
        }
        const query = { agentEmail: email };
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      }
    );
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Server is running on port : ", port);
});
