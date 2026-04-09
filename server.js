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
    destination: function (req, file, cb) { 
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) { 
        cb(null, Date.now() + '-' + file.originalname); 
    }
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
// 4. መዋቕር ዳታቤዝ (Database Schemas)
// =====================================================================

// =====================================================================
// 4.1 መዋቕር ን ኣቕሑት (Product Schema)
// =====================================================================
const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    phone: { type: String, default: "" }, 
    images: [{ type: String }],
    icon: { type: String, default: 'fa-box' },
    isPro: { type: Boolean, default: false }, // <--- ሓዱሽ: PRO Banner ድዩ?
    createdAt: { type: Date, default: Date.now },
    sellerId: { type: String, required: true }
});
const Product = mongoose.model('Product', productSchema);
// 4.2 መዋቕር ን ተጠቀምቲ (User Schema)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: '+251900000000' }, 
    password: { type: String, required: true },
    bio: { type: String, default: 'እንቋዕ ናብ Meyda Market ብደሓን መጻእኩም።' },
    profilePic: { type: String, default: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200' },
    bannerPic: { type: String, default: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=800' },
    followers: [{ type: String }], 
    following: [{ type: String }], 
    savedProducts: [{ type: String }], 
    isAdmin: { type: Boolean, default: false }, // ሓዱሽ: ኣድሚን ድዩ ኣይኮነን?
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// 4.3 መዋቕር ን መልእኽትታት (Message Schema)
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

// 4.4 መዋቕር ን ዜናን ሓበሬታን (News/Post Schema)
const newsSchema = new mongoose.Schema({
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorPic: { type: String },
    title: { type: String, default: "" },
    description: { type: String, required: true },
    category: { type: String, default: "ወግዓዊ" }, 
    mediaUrl: { type: String, default: "" }, 
    mediaType: { type: String, default: "" }, 
    isPinned: { type: Boolean, default: false }, 
    likes: [{ type: String }], 
    comments: [{
        userId: String,
        userName: String,
        userPic: String,
        text: String,
        likes: [{ type: String }],
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
const News = mongoose.model('News', newsSchema);


// =====================================================================
// 5. API: ኣቕሑት ካብ ዳታቤዝ ንምምጻእ (GET Products)
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
// 6. API: ሓዱሽ ንብረት ንምምዝጋብ (POST Product)
// =====================================================================
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        // <--- ሓዱሽ: isPro ንቕበል ኣለና
        const { title, price, category, condition, location, description, sellerId, icon, phone, isPro } = req.body; 
        const imagePaths = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];
        
        const newProduct = new Product({ 
            title, price, category, condition, location, description, sellerId, icon, phone, 
            isPro: isPro === 'true', // string ናብ boolean ንቕይሮ
            images: imagePaths 
        });
        
        await newProduct.save(); 
        res.status(201).json({ message: "ንብረትኩም ብዓወት ንዕዳጋ ቀሪቡ ኣሎ!" });
    } catch (error) { 
        res.status(500).json({ message: "ንብረት ምምዝጋብ ኣይተኻእለን።" }); 
    }
});

// =====================================================================
// 7. API: ሓዱሽ ተጠቃሚ ንምምዝጋብ (Sign Up)
// =====================================================================
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "እዚ ኢሜይል ድሮ ተመዝጊቡ ኣሎ።" });
        }
        
        const newUser = new User({ 
            name, email, password, phone: phone || '+251900000000' 
        });
        
        await newUser.save(); 
        res.status(201).json({ message: "ብዓወት ተመዝጊብኩም ኣለኹም!", userId: newUser._id });
    } catch (error) { 
        res.status(500).json({ message: "ምዝገባ ኣይተኻእለን።" }); 
    }
});

// =====================================================================
// 8. API: ሎግ-ኢን (Log In)
// =====================================================================
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: "እዚ ኢሜይል ኣይተመዝገበን።" });
        if (user.password !== password) return res.status(400).json({ message: "ፓስዎርድ ጌጋ እዩ።" });
        
        res.status(200).json({ 
            message: "ብዓወት ሎግ-ኢን ጌርኩም!", 
            user: { 
                id: user._id, name: user.name, email: user.email, 
                profilePic: user.profilePic, phone: user.phone, isAdmin: user.isAdmin 
            } 
        });
    } catch (error) { 
        res.status(500).json({ message: "ሎግ-ኢን ምግባር ኣይተኻእለን።" }); 
    }
});

// =====================================================================
// 9. API: ናይ ሓደ ተጠቃሚ ምሉእ ሓበሬታ ንምምጻእ (Get User)
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
// 10. API: ፕሮፋይል ተጠቃሚ ንምምሕያሽ (Edit Profile)
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
// 11. API: ናይ ሓደ ሸያጢ ኣቕሑት ንምምጻእ (Get User's Ads)
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
// 12. API: ንብረት ንምምሕያሽ (Edit Product)
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
// 13. API: ንብረት ንምድምሳስ (Delete Product)
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
// 14. API: ንብረት ሴቭ (Save) ወይ ኣንሴቭ (Unsave) ንምግባር
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
// 15. API: መልእኽቲ ንምልኣኽ (Send Message)
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
// 16. API: መልእኽትታት ናይ ሓደ ሰብ ንምምጻእ (Get User's Inbox)
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

app.put('/api/messages/:id/read', async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ message: "መልእኽቲ ተነቢቡ!" });
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

app.put('/api/messages/user/:userId/readAll', async (req, res) => {
    try {
        await Message.updateMany({ receiverId: req.params.userId, isRead: false }, { isRead: true });
        res.status(200).json({ message: "ኩሉ ተነቢቡ!" });
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" }); 
    }
});

// =====================================================================
// 17. ሓደስቲ APIs ን ዜና (News / Posts)
// =====================================================================

// 17.1 Profanity Filter Function (ዘይእዱብ ቃል መጻረዪ ማጂክ)
function filterBadWords(text) {
    const badWords = ['ሕማቕ', 'ጽያፍ', 'ዓሻ', 'ድሕሪት', 'ሌባ', 'badword1', 'badword2'];
    let filteredText = text;
    
    badWords.forEach(word => {
        // 'gi' ማለት ንዓቢን ንእሽቶን ፊደል ማዕረ ይርእዮ
        const regex = new RegExp(word, 'gi');
        // ብኮኾብ ይትክኦ (ንኣብነት "ዓሻ" ናብ "***" ይቕየር)
        filteredText = filteredText.replace(regex, '***');
    });
    
    return filteredText;
}

// 17.2 ኩሉ ዜና ምምጻእ (Get all news) - ፒን ዝኾነ ቅድም ይስራዕ
app.get('/api/news', async (req, res) => {
    try {
        const newsList = await News.find().sort({ isPinned: -1, createdAt: -1 });
        res.status(200).json(newsList);
    } catch (error) {
        res.status(500).json({ message: "ዜና ክመጽእ ኣይከኣለን።" });
    }
});

// 17.3 ሓዱሽ ዜና ምልጣፍ (Create News - Admin Only)
app.post('/api/news', upload.single('media'), async (req, res) => {
    try {
        const { authorId, authorName, authorPic, title, description, category, isPinned } = req.body;
        
        let mediaUrl = "";
        let mediaType = "";
        
        if (req.file) {
            mediaUrl = '/uploads/' + req.file.filename;
            // ቪድዮ ድዩ ወይስ ስእሊ ቼክ ንግበር
            if (req.file.mimetype.startsWith('video/')) {
                mediaType = 'video';
            } else {
                mediaType = 'image';
            }
        }

        const newPost = new News({
            authorId, authorName, authorPic, title, category, mediaUrl, mediaType,
            description: filterBadWords(description), // ፊልተር ይግበረሉ ኣሎ
            isPinned: isPinned === 'true'
        });

        await newPost.save();
        res.status(201).json({ message: "ፖስት ብዓወት ተለጢፉ ኣሎ!", post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ፖስት ምልጣፍ ኣይተኻእለን።" });
    }
});

// 17.4 ፖስት ምድምሳስ (Delete News - Admin or Post Owner)
app.delete('/api/news/:id', async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "ፖስት ብዓወት ተደምሲሱ ኣሎ!" });
    } catch (error) {
        res.status(500).json({ message: "ምድምሳስ ኣይተኻእለን።" });
    }
});

// 17.5 ፖስት ላይክ ምግባር (Like/Unlike Post) - ኖቲፊኬሽን ሓዊሱ!
app.post('/api/news/:id/like', async (req, res) => {
    try {
        const { userId, userName } = req.body; // ሓዱሽ: userName ንቕበል
        const post = await News.findById(req.params.id);
        
        if (!post) return res.status(404).json({ message: "ፖስት ኣይተረኽበን።" });

        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex === -1) {
            post.likes.push(userId); // Like ገይሩ

            // --- ሓዱሽ ማጂክ: ናብቲ ዋና ፖስት ኖቲፊኬሽን ስደድ (ንባዕሉ እንተዘይኮይኑ) ---
            if (userId !== post.authorId) {
                const newNotif = new Message({
                    senderId: userId, senderName: userName || "ተጠቃሚ",
                    receiverId: post.authorId, productId: post._id, productTitle: post.title || "ዜና",
                    text: "ነቲ ዝለጠፍካዮ ፖስት ላይክ (Like) ገይሩዎ ኣሎ።", type: 'like'
                });
                await newNotif.save();
            }
        } else {
            post.likes.splice(likeIndex, 1); // Unlike ገይሩ
        }

        await post.save();
        res.status(200).json({ likesCount: post.likes.length, isLiked: likeIndex === -1 });
    } catch (error) {
        res.status(500).json({ message: "ላይክ ምግባር ኣይተኻእለን።" });
    }
});

// 17.6 ኮሜንት ምጽሓፍ (Add Comment) - ኖቲፊኬሽን ሓዊሱ!
app.post('/api/news/:id/comment', async (req, res) => {
    try {
        const { userId, userName, userPic, text } = req.body;
        const post = await News.findById(req.params.id);
        
        if (!post) return res.status(404).json({ message: "ፖስት ኣይተረኽበን።" });

        const cleanText = filterBadWords(text); // ማጂክ! ዘይእዱብ ቃል ናብ *** ይቕየር

        const newComment = { userId, userName, userPic, text: cleanText };
        post.comments.push(newComment);
        
        // --- ሓዱሽ ማጂክ: ናብቲ ዋና ፖስት ኖቲፊኬሽን ስደድ (ንባዕሉ እንተዘይኮይኑ) ---
        if (userId !== post.authorId) {
            const newNotif = new Message({
                senderId: userId, senderName: userName,
                receiverId: post.authorId, productId: post._id, productTitle: post.title || "ዜና",
                text: `ኣብ ፖስትካ ርእይቶ ሂቡ ኣሎ:- "${cleanText}"`, type: 'comment'
            });
            await newNotif.save();
        }

        await post.save();
        res.status(201).json({ message: "ኮሜንት ተለጢፉ ኣሎ!", comments: post.comments });
    } catch (error) {
        res.status(500).json({ message: "ኮሜንት ምጽሓፍ ኣይተኻእለን።" });
    }
});

// 17.7 ኮሜንት ምድምሳስ (Delete Comment)
app.delete('/api/news/:postId/comment/:commentId', async (req, res) => {
    try {
        const post = await News.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "ፖስት ኣይተረኽበን።" });

        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();

        res.status(200).json({ message: "ኮሜንት ተደምሲሱ ኣሎ!", comments: post.comments });
    } catch (error) {
        res.status(500).json({ message: "ምድምሳስ ኣይተኻእለን።" });
    }
});

// =====================================================================
// 18. ሰርቨር ምጅማር (Start Server)
// =====================================================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Meyda ሰርቨር ኣብ ፖርት ${PORT} ይሰርሕ ኣሎ...`);
});