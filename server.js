const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// =====================================================================
// 1. መኽዘን ስእልታት (Uploads Folder Setup)
// =====================================================================
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, 'uploads/'); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

// =====================================================================
// 2. ሴቲንግስ (Middleware Setup)
// =====================================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// =====================================================================
// 3. ምስ ዳታቤዝ ምትእስሳር (Database Connection)
// =====================================================================
const DB_URI = 'mongodb://127.0.0.1:27017/meyda_database';
mongoose.connect(DB_URI)
  .then(() => console.log('✅ ብዓወት ምስ Local MongoDB ተራኺቡ ኣሎ!'))
  .catch((err) => console.log('❌ ምስ ዳታቤዝ ክራኸብ ኣይከኣለን: ', err));

// =====================================================================
// 4. መዋቕር ዳታቤዝ ን ኣቕሑት (Product Schema)
// =====================================================================
const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    phone: { type: String, default: "" }, // ሓዱሽ: ስልኪ ናይቲ ኣቕሓ (ን ደውል / Call)
    images: [{ type: String }],
    icon: { type: String, default: 'fa-box' },
    createdAt: { type: Date, default: Date.now },
    sellerId: { type: String, required: true }
});
const Product = mongoose.model('Product', productSchema);

// =====================================================================
// 4.1 መዋቕር ዳታቤዝ ን ተጠቀምቲ (User Schema)
// =====================================================================
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '+251900000000' }, // ሓዱሽ: ቁጽሪ ስልኪ ተጠቃሚ
    password: { type: String, required: true },
    bio: { type: String, default: 'እንቋዕ ናብ Meyda Market ብደሓን መጻእኩም።' },
    profilePic: { type: String, default: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200' },
    bannerPic: { type: String, default: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=800' },
    followers: [{ type: String }], 
    following: [{ type: String }], 
    savedProducts: [{ type: String }], 
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// =====================================================================
// 4.2 መዋቕር ዳታቤዝ ን መልእኽትታት (Message Schema) - ን Inbox
// =====================================================================
const messageSchema = new mongoose.Schema({
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    receiverId: { type: String, required: true },
    productId: { type: String }, 
    productTitle: { type: String },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: { type: String, default: 'message' }, 
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// =====================================================================
// 5. API መራኸቢ: ኣቕሑት ካብ ዳታቤዝ ንምምጻእ (GET Products - ን home.html)
// =====================================================================
app.get('/api/products', async (req, res) => {
    try { 
        const products = await Product.find().sort({ createdAt: -1 }); 
        res.status(200).json(products); 
    } catch (error) { 
        res.status(500).json({ message: "ኣቕሑት ክመጹ ኣይከኣሉን።" }); 
    }
});

// =====================================================================
// 6. API መራኸቢ: ሓዱሽ ንብረት ንምምዝጋብ (POST Product - ካብ sell.html)
// =====================================================================
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        const { title, price, category, condition, location, description, sellerId, icon, phone } = req.body; 
        const imagePaths = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
        
        const newProduct = new Product({ 
            title, price, category, condition, location, description, sellerId, icon, phone, images: imagePaths 
        });
        
        await newProduct.save(); 
        res.status(201).json({ message: "ንብረትኩም ብዓወት ንዕዳጋ ቀሪቡ ኣሎ!" });
    } catch (error) { 
        res.status(500).json({ message: "ንብረት ምምዝጋብ ኣይተኻእለን።" }); 
    }
});

// =====================================================================
// 7. API መራኸቢ: ሓዱሽ ተጠቃሚ ንምምዝጋብ (Sign Up)
// =====================================================================
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "እዚ ኢሜይል ድሮ ተመዝጊቡ ኣሎ።" });
        
        const newUser = new User({ name, email, password, phone: phone || '+251900000000' });
        await newUser.save(); 
        res.status(201).json({ message: "ብዓወት ተመዝጊብኩም ኣለኹም!", userId: newUser._id });
    } catch (error) { 
        res.status(500).json({ message: "ምዝገባ ኣይተኻእለን።" }); 
    }
});

// =====================================================================
// 8. API መራኸቢ: ሎግ-ኢን (Log In)
// =====================================================================
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: "እዚ ኢሜይል ኣይተመዝገበን።" });
        if (user.password !== password) return res.status(400).json({ message: "ፓስዎርድ ጌጋ እዩ።" });
        
        res.status(200).json({ 
            message: "ብዓወት ሎግ-ኢን ጌርኩም!", 
            user: { id: user._id, name: user.name, email: user.email, profilePic: user.profilePic, phone: user.phone } 
        });
    } catch (error) { 
        res.status(500).json({ message: "ሎግ-ኢን ምግባር ኣይተኻእለን።" }); 
    }
});

// =====================================================================
// 9. API መራኸቢ: ናይ ሓደ ተጠቃሚ ምሉእ ሓበሬታ ንምምጻእ (Get User)
// =====================================================================
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን" });
        res.status(200).json(user);
    } catch (error) { 
        res.status(500).json({ message: "ጌጋ ተፈጢሩ" }); 
    }
});

// =====================================================================
// 10. API መራኸቢ: ፕሮፋይል ተጠቃሚ ንምምሕያሽ (Edit Profile)
// =====================================================================
app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, bio, profilePic, bannerPic, phone } = req.body;
        const updatedUser = await User.findByIdAndUpdate( 
            req.params.id, 
            { name, bio, profilePic, bannerPic, phone }, 
            { new: true } 
        );
        
        if (!updatedUser) return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን" });
        res.status(200).json({ message: "ፕሮፋይል ተመሓይሹ!", user: updatedUser });
    } catch (error) { 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

// =====================================================================
// 11. API መራኸቢ: ናይ ሓደ ሸያጢ ኣቕሑት ንምምጻእ (Get User's Ads - ን profile.html)
// =====================================================================
app.get('/api/products/user/:sellerId', async (req, res) => {
    try {
        const userProducts = await Product.find({ sellerId: req.params.sellerId }).sort({ createdAt: -1 });
        res.status(200).json(userProducts);
    } catch (error) { 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

// =====================================================================
// 12. API መራኸቢ: ንብረት ንምምሕያሽ (Edit Product)
// =====================================================================
app.put('/api/products/:id', async (req, res) => {
    try {
        const { title, price } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate( req.params.id, { title, price }, { new: true } );
        if (!updatedProduct) return res.status(404).json({ message: "ንብረት ኣይተረኽበን" });
        res.status(200).json({ message: "ንብረት ብዓወት ተመሓይሹ!" });
    } catch (error) { 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

// =====================================================================
// 13. API መራኸቢ: ንብረት ንምድምሳስ (Delete Product)
// =====================================================================
app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ message: "ንብረት ኣይተረኽበን" });
        res.status(200).json({ message: "ንብረት ብዓወት ተደምሲሱ ኣሎ!" });
    } catch (error) { 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

// =====================================================================
// 14. API መራኸቢ: ንብረት ሴቭ (Save) ወይ ኣንሴቭ ንምግባር (ን Heart Icon)
// =====================================================================
app.post('/api/users/:userId/save', async (req, res) => {
    try {
        const { productId, action } = req.body;
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን" });
        
        if (action === 'add' && !user.savedProducts.includes(productId)) {
            user.savedProducts.push(productId);
        } else if (action === 'remove') {
            user.savedProducts = user.savedProducts.filter(id => id !== productId);
        }
        
        await user.save(); 
        res.status(200).json({ message: "ብዓወት ተዓቂቡ!", savedProducts: user.savedProducts });
    } catch (error) { 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

// =====================================================================
// 15. API መራኸቢ: መልእኽቲ ንምልኣኽ (Send Message)
// =====================================================================
app.post('/api/messages', async (req, res) => {
    try {
        const { senderId, senderName, receiverId, productId, productTitle, text, type } = req.body;
        const newMessage = new Message({ senderId, senderName, receiverId, productId, productTitle, text, type });
        await newMessage.save();
        res.status(201).json({ message: "መልእኽቲ ብዓወት ተላኢኹ ኣሎ!" });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: "መልእኽቲ ኣይተላእከን።" });
    }
});

// =====================================================================
// 16. API መራኸቢ: መልእኽትታት ናይ ሓደ ሰብ ንምምጻእ (Get User's Inbox)
// =====================================================================
app.get('/api/messages/:userId', async (req, res) => {
    try {
        const messages = await Message.find({ receiverId: req.params.userId }).sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: "መልእኽትታት ክመጹ ኣይከኣሉን።" });
    }
});

// =====================================================================
// 17. ሰርቨር ምጅማር (Start Server)
// =====================================================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Meyda ሰርቨር ኣብ ፖርት ${PORT} ይሰርሕ ኣሎ...`);
});