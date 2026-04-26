require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios'); // 🚀 ሓዱሽ ማጂክ: ምስ ባንኪ ንምዝርራብ
// 🚀 ሓዱሽ ማጂክ: ዲጂታላዊ ዘብዐኛ (Timekeeper)
const cron = require('node-cron'); 
// 🚀 ሓዱሽ ማጂክ: ፓስዋርድ ዝሓብእ ሓያል ማጂክ
const bcrypt = require('bcrypt');
// 🚀 ሓዱሽ ማጂክ: መከላኸሊ ቦትን መጥቃዕቲ DDoS (Rate Limiter)
const rateLimit = require('express-rate-limit');

// 🚀 ሓዱሽ ማጂክ: JWT (JSON Web Token) ን ዘይስረቕ ዲጂታላዊ መንነት
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'meyda_super_secret_key_2024';

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
app.set('trust proxy', 1);

// =====================================================================
// 1. መኽዘን ስእልታት (Cloudinary Setup & Fallback)
// =====================================================================
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static('uploads'));

// 2. 🚀 እቲ ሓዱሽ ናይ ደበና መኽዘን (Cloudinary Storage)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'meyda_uploads',
        resource_type: 'auto',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'mp4', 'mov']
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fieldSize: 50 * 1024 * 1024 } 
});

// =====================================================================
// 2. ሴቲንግስ (Middleware Setup)
// =====================================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
//======================================================================
// 👈 💡 
// =====================================================================
app.get('/privacy-policy', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Meyda</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
            h1, h2 { color: #029eff; }
            a { color: #029eff; }
        </style>
    </head>
    <body>
        <h1>Privacy Policy for Meyda App</h1>
        <p><strong>Effective Date:</strong> April 2026</p>

        <h2>1. Information We Collect</h2>
        <p>When you use Meyda, we may collect the following information:</p>
        <ul>
            <li><strong>Personal Information:</strong> Name, Email address, and Phone number (+251).</li>
            <li><strong>App Data:</strong> Images you upload for your products, item descriptions, and location (Region/City) to connect you with buyers.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your data to provide and improve the Meyda marketplace, facilitate communication between buyers and sellers, and ensure a safe trading environment.</p>

        <h2>3. Data Sharing</h2>
        <p>We do not sell your personal data to third parties. Your data is securely stored on our servers and only shared with service providers (like cloud hosting and image storage) strictly to operate the app.</p>

        <h2>4. Data Deletion & User Rights</h2>
        <p>You have the right to request the deletion of your account and all associated data at any time. To request data deletion, you can use the "Delete Account" option within the app or email us directly.</p>

        <h2>5. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at: <strong>mebrahtomhagos16@gmail.com</strong></p>
    </body>
    </html>
  `;
  res.send(html);
});



// =====================================================================
// 2.5 🚀 ሓዱሽ ማጂክ: ሓላው-ኣፍደገ (Rate Limiting & DDoS Protection)
// =====================================================================
// ሓፈሻዊ መከላኸሊ (Global Limiter)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 ደቒቕ
    max: 200, // ሓደ IP ኣድራሻ ኣብ 15 ደቒቕ ካብ 200 ግዜ ንላዕሊ ትእዛዝ ክሰድድ ኣይክእልን
    message: { message: "⚠️ ብዙሕ ትእዛዛት ብሓንሳብ መጺኡ! በጃኹም ቁሩብ ጸኒሕኩም ፈትኑ።" }
});
app.use('/api', globalLimiter); // ኣብ ኩሉ API ይትግበር

// ተሪር መከላኸሊ ን ሎግ-ኢንን ምዝገባን (Auth Limiter - Brute force protection)
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ሰዓት
    max: 10, // ኣብ 1 ሰዓት 10 ግዜ ጥራሕ ጌጋ ፓስዋርድ ክንፈትን ወይ ኣካውንት ክንከፍት ንኽእል
    message: { message: "🚨 ብዙሕ ግዜ ብጌጋ ፈቲንኩም! በጃኹም ድሕሪ 1 ሰዓት ተመለሱ።" }
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forgot-password', authLimiter);
// ======= 🚀 ሓዱሽ: ናይ ሞባይል (React Native) Google Login API =======

app.post('/api/users/google-login', async (req, res) => {
    try {
        const { email, name, profilePic, googleId } = req.body;

        // 1. እዚ ኢሜይል ኣብ ዳታቤዝና (Meyda) ድሮ ኣሎ ዶ ንፈትሽ?
        let user = await User.findOne({ email });

        // 2. እንተዘየለ ሓዱሽ ኣካውንት ንፈጥረሉ
        if (!user) {
            user = new User({
                name,
                email,
                password: "Google_Auth_No_Password_" + Date.now(), // ፓስዎርድ ኣየድልዮን
                profilePic,
                role: 'user'
            });
            await user.save();
        }

        // 3. ንሞባይል ዝኸውን መእተዊ መፍትሕ (Token) ንሰርሕ
        // (እታ 'meyda-secret-key' ምስቲ ናይ ኖርማል ሎግ-ኢንካ ትመሳሰል ክትከውን ኣለዋ)
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'meyda-secret-key', 
            { expiresIn: '30d' }
        );

        // 4. ንሞባይል ብዓወት ሎግ-ኢን ጌርካ ኢልና ሓበሬታ ንሰዶ
        res.status(200).json({
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePic: user.profilePic,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Mobile Google Login Error:", error);
        res.status(500).json({ message: "ሰርቨር ጸገም ኣጋጢሙዎ ኣሎ" });
    }
});
// ==========================================================

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
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                password: "Google_Auth_No_Password",
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
    adType: { type: String, default: 'market' },
    // 🚀 ሓዱሽ: ክንደይ ሰብ ከም ዝፈተዎ (Save ዝገበሮ) ይሕዝ
    savedBy: [{ type: String }],
    
    // 🚀 ሓዱሽ ማጂክ: መዋቕር ን ኮሜንትን ሪፖርትን
    reports: [{ type: String }], // መን መን ሪፖርት ከም ዝገበሮ ዝሕዝ (User IDs)
    comments: [{
        userId: String,
        userName: String,
        userPic: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
        replies: [{ // 🚀 ሓዱሽ: ን ኮሜንት ሪፕላይ (Reply) መግበሪ
            userId: String,
            userName: String,
            userPic: String,
            text: String,
            createdAt: { type: Date, default: Date.now }
        }]
    }],

    createdAt: { type: Date, default: Date.now },
    sellerId: { type: String, required: true },
    expiresAt: { type: Date, required: true } 
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
    
    isSubscribed: { type: Boolean, default: false },
    packageType: { type: String, default: 'none' },
    expireDate: { type: Date, default: null },

    // 🚀 ሓዱሽ ማጂክ: መቐመጢ ናይ 4 ቁጽሪ OTP ን ግዜኡን (Security)
    resetOTP: { type: String, default: null },
    resetOTPExpire: { type: Date, default: null }
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
    createdAt: { type: Date, default: Date.now } // ንዜና እዚኣ እያ መለለዪት ክትኮነና
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
// 🤖 ዲጂታላዊ ዘብዐኛ (The Timekeeper - Cron Job) - 🚀 ሓዱሽ: ዜና እውን ይጸርግ!
// =====================================================================
cron.schedule('0 0 * * *', async () => {
    console.log('⏰ ዲጂታላዊ ዘብዐኛ: ግዜኦም ዝሓለፉ ፓኬጃት፣ ኣቕሑትን ዜናታትን ይፍትሽ ኣሎ...');
    try {
        const now = new Date();
        
        // 1. ፓኬጅ ዝወደቑ ተጠቀምቲ የጻሪ
        const expiredUsers = await User.updateMany(
            { isSubscribed: true, expireDate: { $lt: now } },
            { $set: { isSubscribed: false, packageType: 'none' } }
        );
        
        // 2. ግዜኦም ዝሓለፉ ኣቕሑት የጥፍእ
        const deletedProducts = await Product.deleteMany({ expiresAt: { $lt: now } });
        
        // 🚀 3. ሓዱሽ: 6 ወርሒ ዝገበሩ ዜናታት ካብ ዳታቤዝ የጥፍእ!
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6); // ካብ ሎሚ ናብ 6 ወርሒ ንድሕሪት!
        
        const deletedNews = await News.deleteMany({ createdAt: { $lt: sixMonthsAgo } });
        
        console.log(`✅ ዲጂታላዊ ዘብዐኛ: ${expiredUsers.modifiedCount} ተጠቀምቲ ፓኬጆም ወዲቑ ኣሎ.`);
        console.log(`🛍️ ዲጂታላዊ ዘብዐኛ: ${deletedProducts.deletedCount} ዝኣረጉ ኣቕሑት ብዓወት ተደምሲሶም.`);
        console.log(`📰 ዲጂታላዊ ዘብዐኛ: ${deletedNews.deletedCount} ዝኣረጉ ዜናታት (6 ወርሒ ዝገበሩ) ብዓወት ተደምሲሶም.`);
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
// 6. API: ሓዱሽ ንብረት ንምምዝጋብ (POST Product)
// =====================================================================
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        // 🚀 ሓዱሽ ማጂክ: adType ተወሲኻ ኣላ 
        const { title, price, category, condition, location, description, sellerId, icon, phone, isPro, adType } = req.body; 
        
        const imagePaths = req.files ? req.files.map(file => file.path) : [];
        
        const seller = await User.findById(sellerId);
        let daysToLive = 7; // ብዲፎልት 7 መዓልቲ
        
        // 🚀 ሓዱሽ ማጂክ: Advert እንተኾይኑ ዋላ ካብ 30 መዓልቲ ንላዕሊ ክጸንሕ ፍቐደሉ
        const isAdvert = adType === 'advert';

        if (seller && seller.packageType) {
            if (isAdvert) {
                // Advert Packages
                if (seller.packageType === '1_month') daysToLive = 30;
                else if (seller.packageType === '3_months') daysToLive = 90;
                else if (seller.packageType === '6_months') daysToLive = 180;
                else if (seller.packageType === '1_year') daysToLive = 365;
            } else {
                // Normal Market Packages
                if (seller.packageType === '1_week') {
                    daysToLive = 7; 
                } else if (seller.packageType !== 'none') {
                    daysToLive = 30; 
                }
            }
        }

        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + daysToLive);

        const newProduct = new Product({ 
            title, price, category, condition, location, description, sellerId, icon, phone, 
            isPro: isPro === 'true',
            adType: adType || 'market', // Advert ድዩ ወይስ Market ኣብ ዳታቤዝ ይምዝገብ
            images: imagePaths,
            expiresAt: expireDate 
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
        
        // 🚀 ሓዱሽ ማጂክ: ፓስዋርድ ናብ ዘይፍታሕ ምስጢር (Hash) ምቕያር
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ 
            name, 
            email: finalEmail, 
            password: hashedPassword, // ሓዱሽ ምስጢራዊ ፓስዋርድ
            phone: finalPhone || '+251900000000',
            role: userRole 
        });
        
        await newUser.save(); 
       // 🚀 ሓዱሽ ማጂክ: JWT ቶከን ምፍጣር
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ message: "ብዓወት ተመዝጊብኩም ኣለኹም!", userId: newUser._id, token: token });
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
        
        // 👈 💡 ማጂክ: ኢሜልን ፓስዎርድን ኣብ ሰርቨር እውን ከነጽርዮም (Trim) ኣለና ን Windows!
        let cleanEmail = email ? email.trim().toLowerCase() : '';
        let cleanPassword = password ? password.trim() : '';

        let searchEmail = cleanEmail;
        const isPhoneNumber = /^[0-9+]+$/.test(cleanEmail); 
        
        if (isPhoneNumber && !cleanEmail.includes('@')) {
            const cleanSearchPhone = cleanEmail.replace('+', '');
            searchEmail = `${cleanSearchPhone}@meydamarket.com`;
        }

        const user = await User.findOne({ 
            $or: [{ email: searchEmail }, { phone: cleanEmail }, { email: cleanEmail }] 
        });
        
        // (እታ ክልተ ግዜ ዝነበረት ኣጥፊኤያ ኣለኹ)
        if (!user) return res.status(400).json({ message: "እዚ ሓበሬታ (ስልኪ/ኢሜይል) ኣይተረኽበን ወይ ፓስዎርድ ጌጋ እዩ。" });
        
        // 🚀 ሓዱሽ ማጂክ: ነቲ ጽፉፍ ፓስዎርድ ነነጻጽሮ
        const isMatch = await bcrypt.compare(cleanPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "ፓስዎርድ ጌጋ እዩ。" });
        
        // 🚀 ሓዱሽ ማጂክ: JWT ቶከን ምፍጣር
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({ 
            message: "ብዓወት ሎግ-ኢን ጌርኩም!", 
            token: token, 
            user: { 
                id: user._id, name: user.name, email: user.email,
                profilePic: user.profilePic, phone: user.phone, 
                role: user.role || 'user', 
                isAdmin: user.role === 'admin' || user.role === 'owner',
                isSubscribed: user.isSubscribed || false,
                packageType: user.packageType || 'none',
                expireDate: user.expireDate || null,
                savedProducts: user.savedProducts || [] 
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
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'https://meyda-app.vercel.app/index.html' }),
  (req, res) => {
    // 1. 🚀 ነታ ቶከን ክንሰርሓ ኣለና (ምስ ውሑስ ፓስዋርድ)
    const jwtSecretKey = process.env.JWT_SECRET || 'meyda_super_secret_key_2024';
    const token = jwt.sign({ id: req.user._id, role: req.user.role || 'user' }, jwtSecretKey, { expiresIn: '30d' });

    // 2. 🛡️ ውሑስ ዝኾነ ናይ ዩዘር ሓበሬታ
    const safeName = req.user.name || 'User';
    const safeEmail = req.user.email || '';

    // 3. 🚀 ኩሉ ሒዙ ናብ ዌብሳይትና (Vercel) ይምለስ
    res.redirect(`https://meyda-app.vercel.app/home.html?token=${token}&userId=${req.user._id}&name=${encodeURIComponent(safeName)}&email=${encodeURIComponent(safeEmail)}`);
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
app.post('/api/upload/profile', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "ስእሊ ኣይተረኽበን" });
        }
        res.status(200).json({ imageUrl: req.file.path });
    } catch (error) {
        console.error("Profile Image Upload Error:", error);
        res.status(500).json({ message: "ስእሊ ምጽዓን ኣይተኻእለን" });
    }
});

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
// 10.6 🚀 API: ሓቀኛ ክፍሊት (Real Payment Gateway - Sandbox/Chapa)
// =====================================================================

// 1. መበገሲ ክፍሊት (Initialize Payment)
app.post('/api/payment/init', async (req, res) => {
    try {
        const { userId, email, name, amount, packageType } = req.body;
        
        // 💡 እዚ ናይ Chapa Sandbox Secret Key እዩ (Test)
        // ጽባሕ ናይ ሓቂ ኣካውንት ምስ ከፈትካ ነዛ ፊደል ጥራሕ ኢኻ ትቕይራ!
        const CHAPA_SECRET = process.env.CHAPA_SECRET || "CHASECK_TEST_xKxG0b3v4V3h7X8P9Y1Z2A3B4C5D6E7F"; 
        
        // 💡 ፍሉይ መለለዪ ናይዚ ክፍሊት (ID) - ነቲ ፓኬጅ ምስቲ ሰብ ንምትእስሳር
        const tx_ref = `meyda-${packageType}-${Date.now()}-${userId}`; 

        // 🚀 ናብ ባንኪ (Chapa) ትእዛዝ ንሰድድ
        const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: amount,
            currency: "ETB",
            email: email || "test@meydamarket.com",
            first_name: name || "User",
            tx_ref: tx_ref,
            callback_url: `https://meyda-app.vercel.app/home.html`, // ምስ ከፈለ ናበይ ይመለስ (ንዌብሳይት)
            return_url: `meydamobile://home`, // 🚀 ንሞባይል ኣፕሊኬሽንካ መምለሲ ማጂክ
            customization: {
                title: "Meyda Premium",
                description: `Payment for ${packageType} package`
            }
        }, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET}` }
        });

        // 🚀 ባንኪ "ሕራይ ሊንክ ሒዘ ኣለኹ" ምስ በለና፡ ነታ ሊንክ ናብ ሞባይልካ ንሰዳ
        if (response.data && response.data.status === 'success') {
            res.status(200).json({ 
                paymentUrl: response.data.data.checkout_url, 
                tx_ref: tx_ref 
            });
        } else {
            res.status(400).json({ message: "ምስ ባንኪ ክንራኸብ ኣይከኣልናን" });
        }
    } catch (error) {
        console.error("Payment Init Error:", error);
        res.status(500).json({ message: "ክፍሊት ምጅማር ኣይተኻእለን" });
    }
});

// 2. መረጋገጺ ካብ ባንኪ (The Webhook - ባንኪ ብድሕሪ መጋረጃ ዝሰዶ)
app.post('/api/payment/webhook', async (req, res) => {
    try {
        // ባንኪ ነዚ ሓበሬታ ይሰደልና (tx_ref, status)
        const { tx_ref, status } = req.body;

        if (status === 'success') {
            // ካብቲ tx_ref ነቲ ሓበሬታ ንፈልዮ (meyda-packageType-timestamp-userId)
            const parts = tx_ref.split('-');
            const packageType = parts[1];
            const userId = parts[3];

            let daysToAdd = 0;
            if (packageType === '1_week') daysToAdd = 7;
            else if (packageType === '1_month') daysToAdd = 30;
            else if (packageType === '3_months') daysToAdd = 90;
            else if (packageType === '6_months') daysToAdd = 180;
            else if (packageType === '1_year') daysToAdd = 365;

            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + daysToAdd);

            // 🚀 ሓዱሽ ማጂክ: ሰርቨር ባዕሉ ነቲ ተጠቃሚ "ከፊሉ እዩ" ኢሉ ይመዝግቦ! (ሞባይል ኣይኮነትን ትመዝግብ)
            await User.findByIdAndUpdate(userId, {
                isSubscribed: true,
                packageType: packageType,
                expireDate: expireDate
            });

            console.log(`✅ [WEBHOOK SUCCESS] ተጠቃሚ ${userId} ን ${packageType} ክፍሊቱ ብዓወት ፈጺሙ!`);
        }
        
        // 🚀 ንባንኪ "መልእኽትኻ በጺሑኒ ኣሎ" ኢልና 200 OK ንመልሰሉ
        res.status(200).send('OK');
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send('Error');
    }
});
// =====================================================================
// 10.8 🚀 API: ፓስዋርድ ምሕዳስን (Forgot Password) ኣካውንት ምድምሳስን (Delete Account)
// =====================================================================

// 1. OTP መሕተቲ (Request OTP)
app.post('/api/users/forgot-password', async (req, res) => {
    try {
        const { identifier } = req.body; // email or phone
        const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }, { email: `${identifier.replace('+', '')}@meydamarket.com` }] });
        
        if (!user) return res.status(404).json({ message: "እዚ ሓበሬታ ዘለዎ ኣካውንት ኣይተረኽበን።" });

        // 4 ቁጽሪ OTP ምፍጣር
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        user.resetOTP = otp;
        user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // ን 10 ደቒቕ ጥራሕ ዝጸንሕ
        await user.save();

        // ⚠️ ንግዚኡ ኣብ Console ይወጽእ (ድሒሩ ምስ ሓቀኛ SMS API ይተኣሳሰር)
        console.log(`\n🔔 [SMS SIMULATION] ን ${user.name} ዝተላእከ OTP: ${otp}\n`);

        res.status(200).json({ message: "OTP ብዓወት ተላኢኹ ኣሎ! (ንግዚኡ ኣብ Console ናይ ሰርቨር ርኣይዎ)" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "OTP ምስዳድ ኣይተኻእለን。" });
    }
});

// 2. OTP ኣረጋጊጽካ ፓስዋርድ ምቕያር (Verify OTP & Reset Password)
app.post('/api/users/reset-password', async (req, res) => {
    try {
        const { identifier, otp, newPassword } = req.body;
        const user = await User.findOne({ 
            $or: [{ email: identifier }, { phone: identifier }, { email: `${identifier.replace('+', '')}@meydamarket.com` }],
            resetOTP: otp,
            resetOTPExpire: { $gt: Date.now() } // ግዚኡ ዘይሓለፈ
        });

      if (!user) return res.status(400).json({ message: "OTP ጌጋ እዩ ወይ ግዚኡ ሓሊፉ ኣሎ。" });

        // 🚀 ሓዱሽ ማጂክ: ነቲ ሓዱሽ ዝፈጠሮ ፓስዋርድ እውን ንሓብኦ
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        user.resetOTP = null; // OTP ነጽርዮ
        user.resetOTPExpire = null;
        await user.save();

        res.status(200).json({ message: "ፓስዋርድኩም ብዓወት ተቐይሩ ኣሎ! ሕጂ ሎግ-ኢን ግበሩ።" });
    } catch (error) {
        res.status(500).json({ message: "ፓስዋርድ ምቕያር ኣይተኻእለን。" });
    }
});

// 3. ኣካውንት ብምሉኡ ምድምሳስ (Delete Account - App Store requirement)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // 1. ነቲ ተጠቃሚ ደምስሶ
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን" });

        // 2. ኩሉ ኣቕሑቱ ደምስስ
        await Product.deleteMany({ sellerId: userId });

        // 3. ኩሉ ዜናታቱ ደምስስ
        await News.deleteMany({ authorId: userId });

        // 4. ዝለኣኾ ወይ ዝተቐበሎ መልእኽትታት ደምስስ
        await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });

        res.status(200).json({ message: "ኣካውንትኩምን ኩሉ ሓበሬታኹምን ብዓወት ተደምሲሱ ኣሎ!" });
    } catch (error) {
        res.status(500).json({ message: "ኣካውንት ምድምሳስ ኣይተኻእለን。" });
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

// ==========================================================
// 12. API: ንብረት ንምምሕያሽ (Edit Product)
// ==========================================================
app.put('/api/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const { title, price, description, existingImages, images } = req.body;

        let finalImages = [];

        // 1. ናይ ቀደም ስእልታት ምድላው (Handle Existing Images)
        if (images && Array.isArray(images)) {
            finalImages = images; // ካብ JSON እንተመጺኡ
        } else if (existingImages) {
            try {
                finalImages = JSON.parse(existingImages); // ካብ FormData እንተመጺኡ
            } catch (e) {
                finalImages = Array.isArray(existingImages) ? existingImages : [existingImages];
            }
        }

        // 2. ሓደስቲ ስእልታት ምውሳኽ (Cloudinary ወይ Local ምዃኑ ይፈልዮ)
        if (req.files && req.files.length > 0) {
            const newImagePaths = req.files.map(file => {
                return file.path ? file.path : `/uploads/${file.filename}`; 
            });
            finalImages = [...finalImages, ...newImagePaths];
        }

        // 3. ዳታቤዝ ምምሕያሽ
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id, 
            { 
                title: title,
                name: title,
                price: Number(price),
                description: description,
                images: finalImages
            }, 
            { new: true } 
        );

        if (!updatedProduct) return res.status(404).json({ message: "ንብረት ኣይተረኽበን" });

        res.status(200).json({ message: "ንብረት ብዓወት ተመሓይሹ!" });

    } catch (error) {
        console.log("Edit Product Error:", error);
        res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" });
    }
});
// =====================================================================
// 12.5 🚀 ሓዱሽ ማጂክ: API ን ሪፖርት (Report Product)
// =====================================================================
app.post('/api/products/:id/report', async (req, res) => {
    try {
        const { userId } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "ንብረት ኣይተረኽበን" });

        // 🛡️ Bulletproof: ኣረጊት ንብረት እንተኾይኑ ሳጹን ሪፖርት ባዕሉ ይፍጠር
        if (!product.reports) product.reports = [];

        if (!product.reports.includes(userId)) {
            product.reports.push(userId);
            await product.save();
        }
        res.status(200).json({ message: "ሪፖርትኩም ተቐቢልናዮ ኣለና። የቐንየልና!", reportsCount: product.reports.length });
    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ message: "ሪፖርት ምግባር ኣይተኻእለን。" });
    }
});

// =====================================================================
// 12.6 🚀 ሓዱሽ ማጂክ: API ን ኮሜንት ኣብ ኣቕሑት (Comment on Product)
// =====================================================================
app.post('/api/products/:id/comment', async (req, res) => {
    try {
        const { userId, userName, userPic, text } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "ንብረት ኣይተረኽበን" });

        // 🛡️ Bulletproof: ኣረጊት ንብረት እንተኾይኑ ሳጹን ኮሜንት ባዕሉ ይፍጠር
        if (!product.comments) product.comments = [];

        const newComment = { userId, userName, userPic, text };
        product.comments.push(newComment);
        await product.save();

        res.status(201).json({ message: "ኮሜንትኩም ተለጢፉ ኣሎ!", comments: product.comments });
    } catch (error) {
        console.error("Comment Error:", error);
        res.status(500).json({ message: "ኮሜንት ምጽሓፍ ኣይተኻእለን。" });
    }
});

// =====================================================================
// 12.7 🚀 ሓዱሽ ማጂክ: API ን ሪፕላይ ኣብ ኮሜንት (Reply to Comment)
// =====================================================================
app.post('/api/products/:id/comment/:commentId/reply', async (req, res) => {
    try {
        const { userId, userName, userPic, text } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "ንብረት ኣይተረኽበን" });

        const comment = product.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: "ኮሜንት ኣይተረኽበን" });

        // 🛡️ Bulletproof: ኣረጊት ኮሜንት እንተኾይኑ ሳጹን ሪፕላይ ባዕሉ ይፍጠር
        if (!comment.replies) comment.replies = [];

        const newReply = { userId, userName, userPic, text };
        comment.replies.push(newReply);
        await product.save();

        res.status(201).json({ message: "ሪፕላይ ተለጢፉ ኣሎ!", comments: product.comments });
    } catch (error) {
        console.error("Reply Error:", error);
        res.status(500).json({ message: "ሪፕላይ ምጽሓፍ ኣይተኻእለን。" });
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
        const product = await Product.findById(productId); // 🚀 ሓዱሽ: ንብረት እውን ንደልዮ

        if (!user || !product) return res.status(404).json({ message: "ኣይተረኽበን" });
        if (!product.savedBy) product.savedBy = []; // Bulletproof

        if (action === 'add' && !user.savedProducts.includes(productId)) {
            user.savedProducts.push(productId);
            if (!product.savedBy.includes(user._id.toString())) product.savedBy.push(user._id.toString());
        } else if (action === 'remove') {
            user.savedProducts = user.savedProducts.filter(id => id !== productId);
            product.savedBy = product.savedBy.filter(id => id !== user._id.toString());
        }
        
        await user.save(); 
        await product.save();
        res.status(200).json({ message: "ብዓወት ተዓቂቡ!", savedProducts: user.savedProducts, savesCount: product.savedBy.length });
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
// ==========================================================
// 💡 16.1 ሓዱሽ ማጂክ: ካብ ሓደ ፍሉይ ሰብ ዝመጹ መልእኽትታት ዘንብብ
// ==========================================================
app.put('/api/messages/mark-read', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    
    // እቲ ዓሚል (sender) ዝሰደደለይ፣ ኣነ (receiver) ድማ ዝተቐበልኩዎ... ኩሉ ዘይተነበበ (isRead: false)
    // ናብ "ተነቢቡ (isRead: true)" ቀይሮ!
    await Message.updateMany(
      { senderId: senderId, receiverId: receiverId, isRead: false },
      { isRead: true } 
    );
    
    res.status(200).json({ message: "መልእኽትታት ብዓወት ተነቢቦም ኣለዉ!" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "ጌጋ ኣጋጢሙ።" });
  }
});

// =====================================================================
// 17. APIs ን ዜና (News / Posts)
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Meyda ሰርቨር ኣብ ፖርት ${PORT} ይሰርሕ ኣሎ...`);
});