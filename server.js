require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
// 🚀 ሓዱሽ ማጂክ: ዲጂታላዊ ዘብዐኛ (Timekeeper)
const cron = require('node-cron'); 

// =====================================================================
// ☁️ ሓዱሽ ማጂክ: CLOUDINARY (ዘይድምሰስ ናይ ደበና መኽዘን)
// =====================================================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. ምስ Cloudinary ንምትእስሳር ዝሕግዙ ምስጢራዊ ኮዳት (ካብ .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();

// =====================================================================
// 1. መኽዘን ስእልታት (Cloudinary Setup & Fallback)
// =====================================================================
// እዚ ናይ ቀደም ፎልደር እዩ (ንኣረገውቲ ስእልታት ምእንቲ ክሰርሕ ኣይነጥፍኦን ኢና)
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static('uploads'));

// 2. 🚀 እቲ ሓዱሽ ናይ ደበና መኽዘን (Cloudinary Storage)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'meyda_uploads', // ኣብ Cloudinary ዝፍጠር ፎልደር
        resource_type: 'auto',   // ስእልን ቪድዮን ንኽቕበል
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'mp4', 'mov'] // ዝፍቀዱ ፋይላት
    }
});

const upload = multer({ 
    storage: storage, // ሕጂ ስእልታት ብቐጥታ ናብ Cloudinary እዮም ዝኸዱ!
    limits: { fieldSize: 50 * 1024 * 1024 } 
});

// =====================================================================
// 2. ሴቲንግስ (Middleware Setup)
// =====================================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ====== 🚀 GOOGLE LOGIN SETUP (PASSPORT) ======
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(session({ secret: 'meyda-secret-key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://meyda-app.onrender.com/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. እዚ ተጠቃሚ ቅድሚ ሕጂ ብጉግል ኣትዩ ዶ ይፈልጥ?
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            // 2. ሓዱሽ እንተኾይኑ፡ ሓዱሽ ፕሮፋይል ንክፈተሉ
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: "Google_Auth_No_Password", // ፓስዋርድ ኣየድልዮን
                profilePic: profile.photos[0].value,
                role: 'user'
            });
            await user.save();
        }
        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
  }
));
// ==============================================

// 3. ምስ ኦንላይን ዳታቤዝ ምትእስሳር (Online Database Connection)
const DB_URI = process.env.MONGODB_URI; 

mongoose.connect(DB_URI)
  .then(() => console.log('🚀 Meyda ኦንላይን ዳታቤዝ (MongoDB Atlas) ብዓወት ተኣሳሲሩ ኣሎ!'))
  .catch((err) => console.log('❌ ምስ ኦንላይን ዳታቤዝ ክራኸብ ኣይከኣለን: ', err));

// =====================================================================
// 4. መዋቕር ዳታቤዝ (Database Schemas)
// =====================================================================

// 4.1 መዋቕር ን ኣቕሑት (Product Schema)
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
    isPro: { type: Boolean, default: false },
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
    role: { type: String, enum: ['user', 'admin', 'owner'], default: 'user' }, 
    createdAt: { type: Date, default: Date.now },
    
    // 🚀 ሓዱሽ ማጂክ: ናይ ፓኬጅ ሓበሬታ (Subscription Data)
    isSubscribed: { type: Boolean, default: false },
    packageType: { type: String, default: 'none' },
    expireDate: { type: Date, default: null }
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
    productImage: { type: String, default: "" },
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

// 4.5 መዋቕር ን ማስተር ስዊች (Global Settings Schema)
const settingsSchema = new mongoose.Schema({
    allowPublicPosting: { type: Boolean, default: true },
    requireSubscription: { type: Boolean, default: false },
    lastUpdatedBy: String
});
const Settings = mongoose.model('Settings', settingsSchema);

// =====================================================================
// 🤖 ዲጂታላዊ ዘብዐኛ (The Timekeeper - Cron Job)
// =====================================================================
cron.schedule('0 0 * * *', async () => {
    console.log('⏰ ዲጂታላዊ ዘብዐኛ: ግዜኦም ዝሓለፉ ፓኬጃት ይፍትሽ ኣሎ...');
    try {
        const now = new Date();
        const expiredUsers = await User.updateMany(
            { isSubscribed: true, expireDate: { $lt: now } },
            { $set: { isSubscribed: false, packageType: 'none' } }
        );
        console.log(`✅ ዲጂታላዊ ዘብዐኛ: ${expiredUsers.modifiedCount} ተጠቀምቲ ፓኬጆም ወዲቑ ኣሎ (Expired).`);
    } catch (error) {
        console.error('❌ ዲጂታላዊ ዘብዐኛ ጌጋ ኣጋጢሙዎ:', error);
    }
});


// =====================================================================
// 5. API: ኣቕሑት ካብ ዳታቤዝ ንምምጻእ (GET Products)
// =====================================================================
app.get('/api/products', async (req, res) => {
    try { 
        const products = await Product.find().sort({ createdAt: -1 }); 
        res.status(200).json(products); 
    } catch (error) { 
        res.status(500).json({ message: "ኣቕሑት ክመጹ ኣይከኣሉን。" }); 
    }
});

// =====================================================================
// 6. API: ሓዱሽ ንብረት ንምምዝጋብ (POST Product) - ☁️ CLOUDINARY UPDATED
// =====================================================================
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        const { title, price, category, condition, location, description, sellerId, icon, phone, isPro } = req.body; 
        
        // ⚠️ ሓዱሽ ለውጢ: ሕጂ `file.path` እዩ ዝውሰድ (እዚ ማለት እታ ናይ Cloudinary ናይ ደበና ሊንክ እዩ)
        // ናይ ቀደም '/uploads/' ዝብል የለን ምኽንያቱ ስእሊ ኣብ ደበና እዩ ዘሎ
        const imagePaths = req.files ? req.files.map(file => file.path) : [];
        
        const newProduct = new Product({ 
            title, price, category, condition, location, description, sellerId, icon, phone, 
            isPro: isPro === 'true',
            images: imagePaths 
        });
        
        await newProduct.save(); 
        res.status(201).json({ message: "ንብረትኩም ብዓወት ንዕዳጋ ቀሪቡ ኣሎ!" });
    } catch (error) { 
        console.error("Product Upload Error:", error);
        res.status(500).json({ message: "ንብረት ምምዝጋብ ኣይተኻእለን。" }); 
    }
});

// =====================================================================
// 7. API: ሓዱሽ ተጠቃሚ ንምምዝጋብ (Sign Up)
// =====================================================================
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        let finalEmail = email;
        let finalPhone = phone || '';
        
        if (finalPhone && !finalEmail.includes('@')) {
            const cleanPhone = finalPhone.replace('+', '');
            finalEmail = `${cleanPhone}@meydamarket.com`;
        }
        
        const existingUser = await User.findOne({ 
            $or: [{ email: finalEmail }, { phone: finalPhone }] 
        });
        
        if (existingUser) {
            if (existingUser.phone === finalPhone && finalPhone !== '') {
                return res.status(400).json({ message: "እዚ ስልኪ ቁጽሪ ድሮ ተመዝጊቡ ኣሎ። ካልእ ቁጽሪ ተጠቐሙ።" });
            }
            return res.status(400).json({ message: "እዚ ኢሜይል/ሓበሬታ ድሮ ተመዝጊቡ ኣሎ。" });
        }

        const MASTER_PHONE = '+251933383333'; 
        const MASTER_EMAIL = 'admin@meydamarket.com'; 

        let userRole = 'user';
        if (finalPhone === MASTER_PHONE || finalEmail === MASTER_EMAIL) {
            userRole = 'owner';
        }
        
        const newUser = new User({ 
            name, 
            email: finalEmail, 
            password, 
            phone: finalPhone || '+251900000000',
            role: userRole 
        });
        
        await newUser.save(); 
        res.status(201).json({ message: "ብዓወት ተመዝጊብኩም ኣለኹም!", userId: newUser._id });
    } catch (error) { 
        console.error("Register Error:", error);
        res.status(500).json({ message: "ምዝገባ ኣይተኻእለን。" }); 
    }
});

// =====================================================================
// 8. API: ሎግ-ኢን (Log In)
// =====================================================================
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        let searchEmail = email;
        const isPhoneNumber = /^[0-9+]+$/.test(email); 
        
        if (isPhoneNumber && !email.includes('@')) {
            const cleanSearchPhone = email.replace('+', '');
            searchEmail = `${cleanSearchPhone}@meydamarket.com`;
        }

        const user = await User.findOne({ 
            $or: [{ email: searchEmail }, { phone: email }, { email: email }] 
        });
        
        if (!user) return res.status(400).json({ message: "እዚ ሓበሬታ (ስልኪ/ኢሜይል) ኣይተረኽበን ወይ ፓስዋርድ ጌጋ እዩ。" });
        if (user.password !== password) return res.status(400).json({ message: "ፓስዋርድ ጌጋ እዩ。" });
        
        res.status(200).json({ 
            message: "ብዓወት ሎግ-ኢን ጌርኩም!", 
            user: { 
                id: user._id, name: user.name, email: user.email, 
                profilePic: user.profilePic, phone: user.phone, 
                role: user.role || 'user', 
                isAdmin: user.role === 'admin' || user.role === 'owner',
                isSubscribed: user.isSubscribed || false,
                packageType: user.packageType || 'none',
                expireDate: user.expireDate || null
            } 
        });
    } catch (error) { 
        console.error("Login Error:", error);
        res.status(500).json({ message: "ሎግ-ኢን ምግባር ኣይተኻእለን (Server Error)።" }); 
    }
});

// =====================================================================
// 8.5 API: GOOGLE LOGIN ROUTES
// =====================================================================
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'https://meyda-app.vercel.app/login.html' }),
  (req, res) => {
    res.redirect(`https://meyda-app.vercel.app/home.html?token=${req.user._id}`);
  }
);

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
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
    }
});

// =====================================================================
// 10.5 🚀 API: ክፍሊት ምስ ፈጸመ ፓኬጅ ምሃብ (Subscribe User)
// =====================================================================
app.post('/api/users/:id/subscribe', async (req, res) => {
    try {
        const { packageType } = req.body;
        let daysToAdd = 0;

        if (packageType === '1_week') daysToAdd = 7;
        else if (packageType === '1_month') daysToAdd = 30;
        else if (packageType === '3_months') daysToAdd = 90;
        else if (packageType === '6_months') daysToAdd = 180;
        else if (packageType === '1_year') daysToAdd = 365;
        else return res.status(400).json({ message: "ዘይፍለጥ ፓኬጅ" });

        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + daysToAdd);

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { 
                isSubscribed: true, 
                packageType: packageType, 
                expireDate: expireDate 
            },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን" });

        res.status(200).json({ 
            message: "ብዓወት ክፍሊትኩም ተቐቢልና፡ ፓኬጅኩም ተኸፊቱ ኣሎ!", 
            user: {
                id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, 
                profilePic: updatedUser.profilePic, phone: updatedUser.phone, 
                role: updatedUser.role || 'user', 
                isAdmin: updatedUser.role === 'admin' || updatedUser.role === 'owner',
                isSubscribed: updatedUser.isSubscribed,
                packageType: updatedUser.packageType,
                expireDate: updatedUser.expireDate
            }
        });
    } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({ message: "ፓኬጅ ምሃብ ኣይተኻእለን。" });
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
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
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
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
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
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
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
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
    }
});

// =====================================================================
// 15. API: መልእኽቲ ንምስዳድ (Send Message)
// =====================================================================
app.post('/api/messages', async (req, res) => {
    try {
        const { senderId, senderName, receiverId, productId, productTitle, productImage, text, type } = req.body; 
        
        const newMessage = new Message({
            senderId, senderName, receiverId, productId, productTitle, productImage, text, type
        });
        
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) { 
        console.error("Error saving message:", error);
        res.status(500).json({ message: "መልእኽቲ ምልኣኽ ኣይተኻእለን" }); 
    }
});

// =====================================================================
// 16. API: መልእኽትታት ናይ ሓደ ሰብ ንምምጻእ (Get User's Inbox)
// =====================================================================
app.get('/api/messages/:userId', async (req, res) => {
    try {
        const messages = await Message.find({ 
            $or: [{ receiverId: req.params.userId }, { senderId: req.params.userId }]
        }).sort({ createdAt: -1 });
        res.status(200).json(messages);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "መልእኽትታት ክመጹ ኣይከኣሉን。" }); 
    }
});

app.put('/api/messages/:id/read', async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ message: "መልእኽቲ ተነቢቡ!" });
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
    }
});

app.put('/api/messages/user/:userId/readAll', async (req, res) => {
    try {
        await Message.updateMany({ receiverId: req.params.userId, isRead: false }, { isRead: true });
        res.status(200).json({ message: "ኩሉ ተነቢቡ!" });
    } catch (error) { 
        console.error(error); 
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ。" }); 
    }
});

// =====================================================================
// 17. APIs ን ዜና (News / Posts) - ☁️ CLOUDINARY UPDATED
// =====================================================================

function filterBadWords(text) {
    const badWords = ['ሕማቕ', 'ጽያፍ', 'ዓሻ', 'ድሕሪት', 'ሌባ', 'badword1', 'badword2'];
    let filteredText = text;
    
    badWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filteredText = filteredText.replace(regex, '***');
    });
    return filteredText;
}

app.get('/api/news', async (req, res) => {
    try {
        const newsList = await News.find().sort({ isPinned: -1, createdAt: -1 });
        res.status(200).json(newsList);
    } catch (error) {
        res.status(500).json({ message: "ዜና ክመጽእ ኣይከኣለን。" });
    }
});

app.post('/api/news', upload.single('media'), async (req, res) => {
    try {
        const { authorId, authorName, authorPic, title, description, category, isPinned } = req.body;
        
        let mediaUrl = ""; let mediaType = "";
        if (req.file) {
            // ⚠️ ሓዱሽ ለውጢ: ንዜና ዝኸውን ስእሊ ወይ ቪድዮ እውን ብቐጥታ ካብ Cloudinary (.path) ይውሰድ
            mediaUrl = req.file.path; 
            if (req.file.mimetype.startsWith('video/')) { mediaType = 'video'; } 
            else { mediaType = 'image'; }
        }

        const newPost = new News({
            authorId, authorName, authorPic, title, category, mediaUrl, mediaType,
            description: filterBadWords(description), 
            isPinned: isPinned === 'true'
        });

        await newPost.save();
        res.status(201).json({ message: "ፖስት ብዓወት ተለጢፉ ኣሎ!", post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "ፖስት ምልጣፍ ኣይተኻእለን。" });
    }
});

app.delete('/api/news/:id', async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "ፖስት ብዓወት ተደምሲሱ ኣሎ!" });
    } catch (error) {
        res.status(500).json({ message: "ምድምሳስ ኣይተኻእለን。" });
    }
});

app.post('/api/news/:id/like', async (req, res) => {
    try {
        const { userId, userName } = req.body; 
        const post = await News.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "ፖስት ኣይተረኽበን。" });

        const likeIndex = post.likes.indexOf(userId);
        if (likeIndex === -1) {
            post.likes.push(userId); // Like

            if (userId !== post.authorId) {
                const newNotif = new Message({
                    senderId: userId, senderName: userName || "ተጠቃሚ",
                    receiverId: post.authorId, productId: post._id, productTitle: post.title || "ዜና",
                    text: "ነቲ ዝለጠፍካዮ ፖስት ላይክ (Like) ገይሩዎ ኣሎ。", type: 'like'
                });
                await newNotif.save();
            }
        } else {
            post.likes.splice(likeIndex, 1); // Unlike
        }

        await post.save();
        res.status(200).json({ likesCount: post.likes.length, isLiked: likeIndex === -1 });
    } catch (error) {
        res.status(500).json({ message: "ላይክ ምግባር ኣይተኻእለን。" });
    }
});

app.post('/api/news/:id/comment', async (req, res) => {
    try {
        const { userId, userName, userPic, text } = req.body;
        const post = await News.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "ፖስት ኣይተረኽበን。" });

        const cleanText = filterBadWords(text); 

        const newComment = { userId, userName, userPic, text: cleanText };
        post.comments.push(newComment);
        
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
        res.status(500).json({ message: "ኮሜንት ምጽሓፍ ኣይተኻእለን。" });
    }
});

app.delete('/api/news/:postId/comment/:commentId', async (req, res) => {
    try {
        const post = await News.findById(req.params.postId);
        if (!post) return res.status(404).json({ message: "ፖስት ኣይተረኽበን。" });

        post.comments = post.comments.filter(c => c._id.toString() !== req.params.commentId);
        await post.save();

        res.status(200).json({ message: "ኮሜንት ተደምሲሱ ኣሎ!", comments: post.comments });
    } catch (error) {
        res.status(500).json({ message: "ምድምሳስ ኣይተኻእለን。" });
    }
});

// =====================================================================
// 18. API: ሓደ ሰብ ንምስዓብ (Follow / Unfollow User)
// =====================================================================
app.post('/api/users/:id/follow', async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.id);
        const { currentUserId } = req.body;
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        const index = targetUser.followers.indexOf(currentUserId);
        let isFollowing = false;

        if (index === -1) {
            targetUser.followers.push(currentUserId);
            isFollowing = true;
        } else {
            targetUser.followers.splice(index, 1);
        }

        await targetUser.save();
        res.status(200).json({ followersCount: targetUser.followers.length, isFollowing });
    } catch (error) { 
        res.status(500).json({ message: "Follow error" }); 
    }
});

// =====================================================================
// 19. ADMIN DASHBOARD APIs (ማእከል ቁጽጽር)
// =====================================================================

// 19.1 ዳሽቦርድ ስታቲስቲክስ (Stats)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        const newsCount = await News.countDocuments();
        
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({ allowPublicPosting: true, requireSubscription: false });
            await settings.save();
        }

        res.status(200).json({
            users: userCount,
            products: productCount,
            news: newsCount,
            allowPublicPosting: settings.allowPublicPosting,
            requireSubscription: settings.requireSubscription
        });
    } catch (e) { res.status(500).json({ message: "Error fetching stats" }); }
});

// 19.2 ኩሎም ተጠቀምቲ ምምጻእ (Get All Users)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (e) { res.status(500).json({ message: "Error fetching users" }); }
});

// 19.3 ስልጣን ተጠቃሚ ምቕያር (Update Role)
app.put('/api/admin/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        res.status(200).json(updatedUser);
    } catch (e) { res.status(500).json({ message: "Error updating role" }); }
});

// 19.4 ማስተር ስዊች ምምሕዳር ን ዜና (Toggle Public Posting)
app.post('/api/admin/settings/toggle-posting', async (req, res) => {
    try {
        const { allow } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();
        
        settings.allowPublicPosting = allow;
        await settings.save();
        res.status(200).json({ allowPublicPosting: settings.allowPublicPosting });
    } catch (e) { res.status(500).json({ message: "Error toggling setting" }); }
});

// 19.5 🚀 ማስተር ስዊች ን ክፍሊት ፓኬጅ (Toggle Paywall)
app.post('/api/admin/settings/toggle-subscription', async (req, res) => {
    try {
        const { require } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();
        
        settings.requireSubscription = require;
        await settings.save();
        res.status(200).json({ requireSubscription: settings.requireSubscription });
    } catch (e) { res.status(500).json({ message: "Error toggling subscription requirement" }); }
});

// 19.6 ማስተር ስዊች ን ዜና (Check Status)
app.get('/api/admin/settings/posting-status', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        res.status(200).json({ allow: settings ? settings.allowPublicPosting : true });
    } catch (e) { res.status(200).json({ allow: true }); }
});

// 19.7 🚀 ማስተር ስዊች ን ክፍሊት (Check Status for sell.html)
app.get('/api/admin/settings/subscription-status', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        res.status(200).json({ require: settings ? settings.requireSubscription : false });
    } catch (e) { res.status(200).json({ require: false }); }
});

// =====================================================================
// 20. ሰርቨር ምጅማር (Start Server)
// =====================================================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Meyda ሰርቨር ኣብ ፖርት ${PORT} ይሰርሕ ኣሎ...`);
});