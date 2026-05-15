require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const axios = require('axios'); // 🚀 ሓዱሽ ማጂክ: ምስ ባንኪ ንምዝርራብ
// 🚀 ሓዱሽ ማጂክ: ናብ ኣድሚን ኢሜል ዝሰድድ መልእኽተኛ
const nodemailer = require('nodemailer');
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
// 🗑️ ሓዱሽ: ኣካውንት ንምድምሳስ ዝሕግዝ ናይ መረዳእታ ገጽ (Delete Account Page)
// =====================================================================
app.get('/delete-account', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delete Account - Meyda</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
            h1 { color: #ff4d4d; }
            .container { background: #f9f9f9; padding: 20px; border-radius: 8px; border: 1px solid #ddd; text-align: center; }
            .contact { font-weight: bold; color: #029eff; font-size: 1.2em; }
            .steps { text-align: left; display: inline-block; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Account Deletion Request</h1>
            <p>We are sorry to see you go. To delete your Meyda account and all associated data, please choose one of the following options:</p>
            
            <div class="steps">
                <h3>Option 1: In-App Deletion</h3>
                <p>Open the Meyda App, go to <b>Profile > Settings</b> and select <b>"Delete Account"</b>.</p>

                <h3>Option 2: Email Request</h3>
                <p>Send an email from your registered email address to:</p>
                <p class="contact">mebrahtomhagos16@gmail.com</p>
            </div>
            
            <hr>
            <p><i>Note: Once your account is deleted, all your products, messages, and profile information will be permanently removed from our servers.</i></p>
        </div>
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
    // 🚀 ሓዱሽ ኣልጎሪዝም ማጂክ: ክንደይ ሰብ ርእዩዎ
    views: { type: Number, default: 0 },

    // ==========================================================
    // 🚀 MEYDA REELS (Version 2.0) - ዓለም-ለኻዊ ማጂክ ቪድዮ
    // ==========================================================
    // 1. መኽዘን ቪድዮ (Video URL): ሓደ ነጋዳይ ቪድዮ ምስ ዝጽዕን ኣብ ክላውድ (Cloudinary) ተዓቂቡ እቲ ሊንክ ኣብዚ ይቕመጥ።
    videoUrl: { type: String, default: "" },
    
    // 2. መለለዪ ዓይነት (Media Type): እዚ ኣቕሓ ኖርማል 'ስእሊ' ድዩ ወይስ 'ቪድዮ' (Reel)?
    // እዚ ኣዝዩ ኣገዳሲ እዩ! ጽባሕ ሞባይል "ነቶም ናይ Reels ቪድዮታት ጥራሕ ሃበኒ" ኢላ ክትሓትት ከላ፣
    // ኣልጎሪዝም ነዚ 'video' ዝብል ቃል ርእዩ ልክዕ ከም ቲክቶክ ፈልዩ የውጽኦም።
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    // ==========================================================
    
    

// 🚀 ሓዱሽ ማጂክ: መዋቕር ን ኮሜንትን ሪፖርትን
    reports: [{ type: String }], // መን መን ሪፖርት ከም ዝገበሮ ዝሕዝ (User IDs)
    comments: [{
        userId: String,
        userName: String,
        userPic: String,
        text: String,
        userBadge: { type: String, default: 'none' },
        likes: [{ type: String }], // 👈 💡 ማጂክ: መኽዘን ላይክ ን ዋና ኮሜንት
        createdAt: { type: Date, default: Date.now },
        replies: [{ 
            userId: String,
            userName: String,
            userPic: String,
            text: String,
            userBadge: { type: String, default: 'none' },
            likes: [{ type: String }], // 👈 💡 ማጂክ: መኽዘን ላይክ ን ሪፕለይ
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
    // 👈 💡 ሓዱሽ ማጂክ: ዝተኣገዱ ዓማዊል ዝዕቀቡላ ማህደር
    blockedUsers: [{ type: String }],
    role: { type: String, enum: ['user', 'admin', 'owner'], default: 'user' }, 
    createdAt: { type: Date, default: Date.now },
    
    isSubscribed: { type: Boolean, default: false },
    packageType: { type: String, default: 'none' },
    expireDate: { type: Date, default: null },

    // 🚀 ሓዱሽ ማጂክ: መቐመጢ ናይ 4 ቁጽሪ OTP ን ግዜኡን (Security)
    resetOTP: { type: String, default: null },
    resetOTPExpire: { type: Date, default: null },
    

    // ==========================================================
    // 🚀 ሓዱሽ ማጂክ: መኽዘን ቨሪፊኬሽን (Verification Badge System)
    // ==========================================================
    isVerified: { type: Boolean, default: false },
    badgeType: { type: String, enum: ['none', 'blue', 'gold'], default: 'none' },
    verificationStatus: { type: String, enum: ['idle', 'pending', 'approved', 'rejected'], default: 'idle' },
    verificationData: {
        idType: { type: String }, // 'passport', 'national_id', 'business_license'
        idImage: { type: String }, // ስእሊ መታወቂያ
        selfieImage: { type: String }, // ቀጥታ ሰልፊ (Live Selfie)
        tinNumber: { type: String }, // ን ወርቃዊ ባጅ (TIN)
        businessName: { type: String }, // ስም ትካል
        submittedAt: { type: Date }
    }
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


// 4.5 ማስተር ስዊችን ፓኬጃትን (Global Settings Schema)
const settingsSchema = new mongoose.Schema({
    // 1. እተን 3 ማስተር ስዊችታት
   
    requireSellSub: { type: Boolean, default: false },
    requireProSub: { type: Boolean, default: true },
    requireAdsSub: { type: Boolean, default: true },
    
    // 2. 🚀 ዳይናሚክ ዝርዝር (Array) ናይ ፓኬጃት ን ሰለስቲኦም ታብታት
    packages: {
        sell: [{ name: String, price: Number, days: Number }],
        pro: [{ name: String, price: Number, days: Number }],
        ads: [{ name: String, price: Number, days: Number }]
    },
    
    lastUpdatedBy: String
});
const Settings = mongoose.model('Settings', settingsSchema);
// 4.6 🚀 ሓዱሽ ማጂክ: መዋቕር ን ሪፖርት (Report Schema)
const reportSchema = new mongoose.Schema({
    reporterId: { type: String, required: true }, // ሪፖርት ዝገበረ ሰብ
    reportedUserId: { type: String, required: true }, // ሪፖርት ዝተገብረሉ ነጋዳይ
    productId: { type: String, required: true }, // እቲ ኣቕሓ
    reason: { type: String, required: true }, // ምኽንያት
    type: { type: String, default: 'product' }, // ዓይነት
    status: { type: String, default: 'pending' }, // pending, reviewed, resolved
    createdAt: { type: Date, default: Date.now }
});
const Report = mongoose.model('Report', reportSchema);

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
        
       
        
        console.log(`✅ ዲጂታላዊ ዘብዐኛ: ${expiredUsers.modifiedCount} ተጠቀምቲ ፓኬጆም ወዲቑ ኣሎ.`);
        console.log(`🛍️ ዲጂታላዊ ዘብዐኛ: ${deletedProducts.deletedCount} ዝኣረጉ ኣቕሑት ብዓወት ተደምሲሶም.`);
        
    } catch (error) {
        console.error('❌ ዲጂታላዊ ዘብዐኛ ጌጋ ኣጋጢሙዎ:', error);
    }
});


// =====================================================================
// 5. API: 🚀 MEYDA ALGORITHM (ኣቕሑት ብ ነጥቢ ተሰሪዖም ይመጹ)
// =====================================================================
app.get('/api/products', async (req, res) => {
    try { 
      // 💡 ማጂክ ሸያጢ: ሓበሬታ ኣቕሓ ይመጽእ
      let products = await Product.find().lean();

        // 🚀 ሓዱሽ ማጂክ (Dynamic Badges): ናይ ቀደም ይኹን ናይ ሕጂ ኮሜንታት ብኣውቶማቲክ ራይት ባጅ ክሕዙ!
        // 1. መጀመርታ ናይ ኩሎም ኮሜንት ዝጸሓፉ ሰባት ID ነኻክብ
        const userIds = new Set();
        products.forEach(p => {
            if(p.comments) {
                p.comments.forEach(c => {
                    if (c.userId) userIds.add(c.userId);
                    if (c.replies) {
                        c.replies.forEach(r => {
                            if (r.userId) userIds.add(r.userId);
                        });
                    }
                });
            }
        });

        // 2. ናይዞም ኩሎም ሰባት ራይት ባጅ (badgeType) ብሓንሳብ ካብ ዳታቤዝ ነምጽእ
        const validIds = Array.from(userIds).filter(id => mongoose.Types.ObjectId.isValid(id));
        const usersWithBadges = await User.find({ _id: { $in: validIds } }, 'badgeType');
        
        const badgeMap = {};
        usersWithBadges.forEach(u => {
            badgeMap[u._id.toString()] = u.badgeType || 'none';
        });

        // 3. 🧠 ማጂክ ፎርሙላን: ራይት ባጅ ምትካልን
        products = products.map(p => {
            // 👈 💡 ማጂክ: ነታ ባጅ ኣብ ነፍሲወከፍ ኮሜንትን ሪፕለይን ንሰኽዓያ
            if (p.comments) {
                p.comments = p.comments.map(c => {
                    c.userBadge = badgeMap[c.userId] || 'none';
                    if (c.replies) {
                        c.replies = c.replies.map(r => {
                            r.userBadge = badgeMap[r.userId] || 'none';
                            return r;
                        });
                    }
                    return c;
                });
            }

            // 🧮 ሕሳብ (Algorithm): (Saves*5) + (Comments*3) + (Views*1) + (Images*2) + PRO
            const saves = p.savedBy ? p.savedBy.length : 0;
            const comments = p.comments ? p.comments.length : 0;
            const views = p.views || 0;
            const imgCount = p.images ? p.images.length : 0;
            const isPro = p.isPro ? 100 : 0; 

            let score = (saves * 5) + (comments * 3) + views + (imgCount * 2) + isPro;

            // ሓዱሽ ንብረት ንመጀመርታ 3 መዓልቲ ዕድል ንምሃብ 20 ነጥቢ ቦነስ
            const daysOld = (new Date().getTime() - new Date(p.createdAt).getTime()) / (1000 * 3600 * 24);
            if (daysOld <= 3) score += 20;

            return { ...p, meydaScore: score };
        });

        // 🏆 ውድድር: በቲ ዝዓበየ ነጥቢ (Score) ክስራዕ ንገብሮ
        products.sort((a, b) => b.meydaScore - a.meydaScore);
// 🚀 ማጂክ ሸያጢ (Manual Lookup): ሰርቨር ከይዕንቀፍ ብኣውቶማቲክ ሸየጥቲ የናዲ
      const sellerIds = [...new Set(products.map(p => p.sellerId || p.vendorId || p.userId).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
      
      const sellers = await User.find({ _id: { $in: sellerIds } }, 'badgeType isVerified').lean();
      
      const sellerMap = {};
      sellers.forEach(s => { sellerMap[s._id.toString()] = s; });
      
      products = products.map(p => {
          const sId = p.sellerId || p.vendorId || p.userId;
          const seller = sId ? sellerMap[sId.toString()] : null;
          
          p.vendorBadge = seller ? (seller.badgeType || "none") : "none";
          p.isVerified = seller ? (seller.isVerified || false) : false;
          
          return p;
      });
        res.status(200).json(products); 
    } catch (error) { 
        console.log("Products Fetch Error:", error);
        res.status(500).json({ message: "ኣቕሑት ክመጹ ኣይከኣሉን。" }); 
    }
});

// =====================================================================
// 6. API: ሓዱሽ ንብረት ንምምዝጋብ (POST Product) - 🚀 REELS SUPPORTED
// =====================================================================
// 👈 💡 ማጂክ: ሕጂ 'images' (ክሳብ 5) ከምኡ'ውን 'video' (1 ቪድዮ) ብሓንሳብ ክቕበል ዝኽእል ሓያል ኣፍደገ ጌርናዮ ኣለና!
app.post('/api/products', upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, price, category, condition, location, description, sellerId, icon, phone, isPro, adType } = req.body; 
        
        // 1. ስእልታት እንተመጺኦም ምድላው
        const imagePaths = req.files && req.files['images'] ? req.files['images'].map(file => file.path) : [];
        
        // 2. 🚀 ማጂክ ቪድዮ (Reels): ቪድዮ እንተመጺኡ ፈልዩ የውጽኦ
        let videoPath = "";
        let typeOfMedia = "image"; // መጀመርታ ከም 'ስእሊ' ኢና ንቖጽሮ (Default)
        
        // ዓሚል ቪድዮ እንተሰዲዱ ግን...
        if (req.files && req.files['video'] && req.files['video'].length > 0) {
            videoPath = req.files['video'][0].path; // ሊንክ ናይቲ ቪድዮ ካብ Cloudinary ንወስድ
            typeOfMedia = "video"; // 👈 💡 መለለዪኡ ናብ 'ቪድዮ' (Reel) ይቕየር!
        }
        
        const seller = await User.findById(sellerId);
        let daysToLive = 7; 
        
        // ሰርቨር ባዕሉ ነቲ ናይቲ ሰብ ዝተረፎ መዓልቲ ይርእዮ
        if (seller && seller.isSubscribed && seller.expireDate) {
            const now = new Date();
            const remainingTime = seller.expireDate.getTime() - now.getTime();
            const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
            
            if (remainingDays > 0) {
                daysToLive = remainingDays; 
            }
        }

        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + daysToLive);

        // 3. ኩሉ ጠርኒፍና ናብ ዳታቤዝ ነእትዎ
        const newProduct = new Product({ 
            title, price, category, condition, location, description, sellerId, icon, phone, 
            isPro: isPro === 'true',
            adType: adType || 'market', 
            images: imagePaths,
            videoUrl: videoPath,      // 🚀 ሓዱሽ ማጂክ: ሊንክ ቪድዮ
            mediaType: typeOfMedia,   // 🚀 ሓዱሽ ማጂክ: Reel ድዩ ኖርማል?
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
// 6.5 API: ሓንቲ ፍልይቲ ኣቕሓ ብ ID ንምምጻእ (Get Single Product) - 🚀 ሓዱሽ ማጂክ ን ፐርፎርማንስ
// =====================================================================
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) {
            return res.status(404).json({ message: "እዚ ኣቕሓ ኣይተረኽበን።" });
        }

        // 💡 ማጂክ: ልክዕ ከምቲ ኣብ ኩሎም ኣቕሑት ዝገበርናዮ፣ ኣብዚ እውን ን ኮሜንታት ራይት ባጅ ክንሰኽዓሎም ኢና
        if (product.comments && product.comments.length > 0) {
            const userIds = new Set();
            product.comments.forEach(c => {
                if (c.userId) userIds.add(c.userId);
                if (c.replies) {
                    c.replies.forEach(r => { if (r.userId) userIds.add(r.userId); });
                }
            });

            const validIds = Array.from(userIds).filter(id => mongoose.Types.ObjectId.isValid(id));
            const usersWithBadges = await User.find({ _id: { $in: validIds } }, 'badgeType');
            
            const badgeMap = {};
            usersWithBadges.forEach(u => {
                badgeMap[u._id.toString()] = u.badgeType || 'none';
            });

            product.comments = product.comments.map(c => {
                c.userBadge = badgeMap[c.userId] || 'none';
                if (c.replies) {
                    c.replies = c.replies.map(r => {
                        r.userBadge = badgeMap[r.userId] || 'none';
                        return r;
                    });
                }
                return c;
            });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error("Single Product Fetch Error:", error);
        res.status(500).json({ message: "ኣቕሓ መምጻእ ኣይተኻእለን።" });
    }
});

// =====================================================================
// 6.6 API: ተመሳሰልቲ ኣቕሑት ንምምጻእ (Get Related Products) - 🚀 ሓዱሽ ማጂክ ን ፐርፎርማንስ
// =====================================================================
app.get('/api/products/:id/related', async (req, res) => {
    try {
        const currentProduct = await Product.findById(req.params.id);
        if (!currentProduct) return res.status(404).json({ message: "ኣቕሓ ኣይተረኽበን" });

        // 💡 ማጂክ: ሕደ ካተጎሪ (Category) ዘለዎም 10 ኣቕሑት ጥራሕ ይደሊ (ነቲ ባዕሉ ግን ይገድፎ)
        const related = await Product.find({
            _id: { $ne: currentProduct._id }, // ነዚ ኣቕሓ ኣይተእትዎ
            category: currentProduct.category
        })
        .sort({ meydaScore: -1, createdAt: -1 }) // ብነጥብን ብግዜን የቐድሞም
        .limit(10) // 10 ጥራሕ!
        .lean();

        res.status(200).json(related);
    } catch (error) {
        console.error("Related Products Fetch Error:", error);
        res.status(500).json({ message: "ተመሳሰልቲ ኣቕሑት ክመጹ ኣይከኣሉን።" });
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

        // 💡 ሓዱሽ ማጂክ: ኣብቲ መለለዪ (tx_ref) ነቲ ዝተኸፍለ 'ዋጋ' (amount) ንውስኾ ኣለና!
        // ቅርጹ: meyda-packageType-amount-timestamp-userId
        const tx_ref = `meyda-${packageType}-${amount}-${Date.now()}-${userId}`;

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
            // 1. ካብቲ tx_ref ነቲ ሓበሬታ ንፈልዮ (meyda-packageType-amount-timestamp-userId)
            const parts = tx_ref.split('-');
            const packageType = parts[1]; // "regular", "market_pro", "advert_pro"
            const paidAmount = Number(parts[2]); // 👈 💡 እቲ ዋጋ
            const userId = parts.slice(4).join('-'); // 👈 💡 መለለዪ ተጠቃሚ

            let daysToAdd = 7; // ዲፎልት መዓልቲ

            // 2. 🚀 ሓዱሽ ማጂክ: ካብ ዳታቤዝ (Settings) ነቲ ዝተኸፍለሉ ዋጋ ርኢና መዓልቱ ንደልዮ
            const settings = await Settings.findOne();
            if (settings && settings.packages) {
                let targetArray = [];
                // ኣየናይ ታብ (Tab) ከምዝኾነ ንፈልዮ
                if (packageType === 'regular' || packageType === 'sell') targetArray = settings.packages.sell;
                else if (packageType === 'market_pro' || packageType === 'pro') targetArray = settings.packages.pro;
                else if (packageType === 'advert_pro' || packageType === 'ads') targetArray = settings.packages.ads;

                // 3. ነቲ ዋጋ (paidAmount) ዘመዓራርዮ ፓኬጅ ኣብቲ Array ንደልዮ
                if (targetArray && targetArray.length > 0) {
                    const matchedPkg = targetArray.find(p => Number(p.price) === paidAmount);
                    if (matchedPkg && matchedPkg.days) {
                        daysToAdd = Number(matchedPkg.days); // 👈 💡 ዳይናሚክ መዓልቲ ረኺብናዮ!
                    }
                }
            }

            // 4. ነቲ መዓልቲ ኣብ ልዕሊ ሎሚ ንውስኾ
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

        // 💡 ማጂክ ምትዕርራይ: ናይ 'News' ምድምሳስ ኮድ ኣጥፊእናዮ ኣለና ምኽንያቱ News Schema የለን!

        // 3. ዝለኣኾ ወይ ዝተቐበሎ መልእኽትታት ደምስስ
        await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });

        res.status(200).json({ message: "ኣካውንትኩምን ኩሉ ሓበሬታኹምን ብዓወት ተደምሲሱ ኣሎ!" });
    } catch (error) {
        // 💡 ማጂክ: ጌጋ እንተመጺኡ ኣብ ሰርቨር ምእንቲ ክንሪኦ console.log ወሲኽናሉ ኣለና
        console.error("Delete Account Error:", error);
        res.status(500).json({ message: "ኣካውንት ምድምሳስ ኣይተኻእለን።" });
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
// 🚀 ALGORITHM MAGIC 1: ንብረት ክኽፈት ከሎ View ይውስኽ
// =====================================================================
app.put('/api/products/:id/view', async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.status(200).send('View Counted');
    } catch (error) {
        res.status(500).send('Error');
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
// 12.5 🚀 ሓዱሽ ማጂክ: API ን ሪፖርት (Report API & Email Notification) - PRO VERSION
// =====================================================================
app.post('/api/reports', async (req, res) => {
    try {
        const { reporterId, reportedUserId, productId, reason, type } = req.body;

        // 1. ኣብ ዳታቤዝ ምዕቃብ (Save to MongoDB 'reports' collection)
        const newReport = new Report({
            reporterId, reportedUserId, productId, reason, type
        });
        await newReport.save();

        // 2. ናብ ኣድሚን (ካብቴን ጀንትራ) ብቐጥታ ኢሜል ምስዳድ
        // ማሕንቖ ከይፈጥር (Async) ንገድፎ, እቲ ሪስፖንስ ብቐጥታ ንተጠቃሚ ንመልሰሉ
        sendAdminReportEmail(newReport).catch(console.error);

        res.status(201).json({ message: "ሪፖርትኩም ተቐቢልናዮ ኣለና። የቐንየልና!" });
    } catch (error) {
        console.error("Report Error:", error);
        res.status(500).json({ message: "ሪፖርት ምግባር ኣይተኻእለን。" });
    }
});

// 🚀 ሓጋዚት ማጂክ (Helper Function): ኢሜል ናብ ኣድሚን እትሰድድ
async function sendAdminReportEmail(reportData) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // 💡 ማጂክ ምትዕርራይ: 'meydamarke.com' ዝነበረ ናብ ትኽክለኛ 'meydamarket@gmail.com' ተቐይሩ ኣሎ
            user: process.env.EMAIL_USER || 'meydamarket@gmail.com', 
            pass: process.env.EMAIL_PASS // ⚠️ ኣገዳሲ: ካብ ጎግል 'App Password' ኣውጺእካ ኣብ .env ኣእቱ
        }
    });

    const mailOptions = {
        // 💡 ማጂክ ምትዕርራይ: ኣብዚ እውን ትኽክለኛ ኢሜል ኣእቲና ኣለና
        from: process.env.EMAIL_USER || 'meydamarket@gmail.com',
        to: 'meydamarket@gmail.com', // ናባኻ (Admin) ክመጽእ
        subject: '🚨 ሓዱሽ ሪፖርት ኣሎ: Meyda App',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #FF3B30;">🚩 ሓዱሽ ሪፖርት መጺኡ ኣሎ!</h2>
                <p><strong>ምኽንያት:</strong> <span style="color: #555;">${reportData.reason}</span></p>
                <hr>
                <p><strong>ዓይነት:</strong> ${reportData.type}</p>
                <p><strong>ኣቕሓ ID (Product):</strong> ${reportData.productId}</p>
                <p><strong>ሪፖርት ዝገበረ ሰብ (Reporter ID):</strong> ${reportData.reporterId}</p>
                <p><strong>ሪፖርት ዝተገብረሉ ሰብ (Reported User ID):</strong> ${reportData.reportedUserId}</p>
                <br>
                <p style="background: #f9f9f9; padding: 10px; border-left: 4px solid #029eff;">
                    በጃኹም ኣብ ዳሽቦርድ ኣቲኹም ነዚ ጥርዓን ጻረዩዎ።
                </p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 ናይ ሪፖርት ኢሜል ብዓወት ናብ ኣድሚን ተላኢኹ ኣሎ!");
}
// 🚀 ሓዱሽ: ን ኣድሚን ዳሽቦርድ ኩሉ ሪፖርታት መምጽኢ (GET)
app.get('/api/reports', async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });
        res.status(200).json(reports);
    } catch (error) { 
        res.status(500).json({ message: "ጥርዓናት ክመጹ ኣይከኣሉን。" }); 
    }
});

// 🚀 ሓዱሽ: ን ኣድሚን ዳሽቦርድ ጥርዓን መዕጸዊ ወይ መደምሰሲ (DELETE)
app.delete('/api/reports/:id', async (req, res) => {
    try {
        await Report.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "ጥርዓን ብዓወት ተደምሲሱ!" });
    } catch (error) { 
        res.status(500).json({ message: "ጥርዓን ምድምሳስ ኣይተኻእለን。" }); 
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

        // 👈 💡 ማጂክ: ራይት ባጅ ናይዚ ኮሜንት ዝገብር ዘሎ ሰብ ካብ ዳታቤዝ ነምጽእ
        const commentUser = await User.findById(userId);
        const userBadge = commentUser ? commentUser.badgeType : 'none';

        if (!product.comments) product.comments = [];

        const newComment = { userId, userName, userPic, text, userBadge };
        product.comments.push(newComment);
        await product.save();

        res.status(201).json({ message: "ኮሜንትኩም ተለጢፉ ኣሎ!", comments: product.comments });
    } catch (error) {
        console.error("Comment Error:", error);
        res.status(500).json({ message: "ኮሜንት ምጽሓፍ ኣይተኻእለን።" });
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

        // 👈 💡 ማጂክ: ራይት ባጅ ናይዚ ሪፕለይ ዝገብር ዘሎ ሰብ ካብ ዳታቤዝ ነምጽእ
        const replyUser = await User.findById(userId);
        const userBadge = replyUser ? replyUser.badgeType : 'none';

        if (!comment.replies) comment.replies = [];

        const newReply = { userId, userName, userPic, text, userBadge };
        comment.replies.push(newReply);
        await product.save();

        res.status(201).json({ message: "ሪፕላይ ተለጢፉ ኣሎ!", comments: product.comments });
    } catch (error) {
        console.error("Reply Error:", error);
        res.status(500).json({ message: "ሪፕላይ ምጽሓፍ ኣይተኻእለን።" });
    }
});
// =====================================================================
// 12.8 🚀 ሓዱሽ ማጂክ: ኮሜንት ወይ ሪፕለይ ላይክ መግበሪ (Like Comment/Reply)
// =====================================================================
app.put('/api/products/:id/comment/:commentId/like', async (req, res) => {
    try {
        const { userId, replyId } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "ኣቕሓ ኣይተረኽበን" });

        const comment = product.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: "ኮሜንት ኣይተረኽበን" });

        let target = comment;
        if (replyId) { // ሪፕለይ እንተኾይኑ ነቲ ሪፕለይ ንረኽቦ
            target = comment.replies.id(replyId);
            if (!target) return res.status(404).json({ message: "ሪፕለይ ኣይተረኽበን" });
        }

        // 💡 ማጂክ: ላይክ ጌሩዎ እንተኔሩ የጥፍኦ (Unlike)፣ እንተዘይኮይኑ ይውስኾ (Like)
        const index = target.likes.indexOf(userId);
        if (index === -1) {
            target.likes.push(userId);
        } else {
            target.likes.splice(index, 1);
        }

        await product.save();
        res.status(200).json({ comments: product.comments });
    } catch (error) {
        console.error("Like Error:", error);
        res.status(500).json({ message: "ላይክ ምግባር ኣይተኻእለን።" });
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
// 15. API: መልእኽቲ ንምስዳድ (Send Message) - ምስ መከላኸሊ ብሎክ 🛡️
// =====================================================================
app.post('/api/messages', async (req, res) => {
    try {
        // 💡 ማጂክ ምትዕርራይ: ካብ ሞባይል 'productName' እዩ ዝመጽእ ዘሎ፣ ስለዚ productName እውን ተቐበል ኢልናዮ ኣለና!
        const { senderId, senderName, receiverId, productId, productTitle, productName, productImage, text, type } = req.body; 
        
        // 👈 💡 ማጂክ (The Shield): እቲ ተቐባሊ (receiver) ነዚ ዝልእኽ ዘሎ ሰብ (sender) ኣጊዱዎ ዶ ኣሎ ንመርምር!
        const receiver = await User.findById(receiverId);
        if (receiver && receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
            return res.status(403).json({ message: "ክልኩል: እዚ ተጠቃሚ ኣጊዱኩም ኣሎ። መልእኽቲ ክትሰዱ ኣይትኽእሉን ኢኹም።" });
        }

        // 💡 ማጂክ ምትዕርራይ: productTitle እንተዘይመጺኡ ነቲ productName ከም Title ይጥቀመሉ
        const finalProductTitle = productTitle || productName || "";

        const newMessage = new Message({
            senderId, senderName, receiverId, productId, 
            productTitle: finalProductTitle, // 👈 ኣብዚ እታ ምትዕርራይ ትኣቱ
            productImage, text, type
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

// ==========================================================
// 17. ማጂክ ሼር (Facebook/Telegram Open Graph Preview)
// ==========================================================
app.get('/product/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id); 
    
    if (!product) {
      return res.status(404).send('ኣቕሓ ኣይተረኽበን (Product not found)');
    }

    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0] 
      : product.videoUrl || "https://meyda-app.onrender.com/default-logo.png";

    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `https://meyda-app.onrender.com${imageUrl}`;

    const html = `
      <!DOCTYPE html>
      <html lang="ti">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${product.title} | Meyda Market</title>
        
        <!-- 🔗 Facebook / WhatsApp / Telegram Open Graph -->
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${product.title} - ${product.price} ETB" />
        <meta property="og:description" content="📍 ቦታ: ${product.location} | ${product.description}" />
        <meta property="og:image" content="${fullImageUrl}" />
        <meta property="og:url" content="https://meyda-app.onrender.com/product/${product._id}" />
        <meta property="og:site_name" content="Meyda - ማሕበራዊ ዕዳጋ" />

        <!-- 🐦 Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${product.title} - ${product.price} ETB" />
        <meta name="twitter:description" content="📍 ቦታ: ${product.location}" />
        <meta name="twitter:image" content="${fullImageUrl}" />

        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f8fa; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #029eff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h2>ናብ Meyda ኣፕሊኬሽን ንወስደኩም ኣለና...</h2>
        <div class="loader"></div>
        <p>ኣፕሊኬሽንኩም ብኣውቶማቲክ እንተዘይተኸፊቱ፡ <a href="meyda://product/${product._id}" style="color: #029eff;">ኣብዚ ጠውቑ</a></p>

        <script>
          window.location.href = "meyda://product/${product._id}";
          setTimeout(function() {
             window.location.href = "https://play.google.com/store/apps/details?id=com.jentra.meyda";
          }, 3000);
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
// ==========================================================
// 17.1 🚀 ማጂክ ሼር ን ፕሮፋይል (Facebook/Telegram Open Graph)
// ==========================================================
app.get('/profile/:id', async (req, res) => {
  try {
    const userProfile = await User.findById(req.params.id); 
    
    if (!userProfile) {
      return res.status(404).send('ፕሮፋይል ኣይተረኽበን (Profile not found)');
    }

    // 💡 ስእሊ ናይቲ ሰብ (እንተዘይብሉ ናይ Meyda ሎጎ ይገብር)
    const imageUrl = userProfile.profilePic 
      ? userProfile.profilePic 
      : "https://meyda-app.onrender.com/default-logo.png"; 

    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `https://meyda-app.onrender.com${imageUrl}`;

    const html = `
      <!DOCTYPE html>
      <html lang="ti">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${userProfile.name} | Meyda Market</title>
        
        <!-- 🔗 Facebook / WhatsApp / Telegram Open Graph -->
        <meta property="og:type" content="profile" />
        <meta property="og:title" content="${userProfile.name} - ኣብ Meyda Market" />
        <meta property="og:description" content="${userProfile.bio || 'ድኳነይን ኣቕሑተይን ንምርኣይ ኣብዚ ጠውቑ!'}" />
        <meta property="og:image" content="${fullImageUrl}" />
        <meta property="og:url" content="https://meyda-app.onrender.com/profile/${userProfile._id}" />
        <meta property="og:site_name" content="Meyda - ማሕበራዊ ዕዳጋ" />

        <!-- 🐦 Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${userProfile.name} - Meyda" />
        <meta name="twitter:description" content="${userProfile.bio || 'ድኳነይን ኣቕሑተይን ንምርኣይ ኣብዚ ጠውቑ!'}" />
        <meta name="twitter:image" content="${fullImageUrl}" />

        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #f5f8fa; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #029eff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h2>ናብ ፕሮፋይል ${userProfile.name} ንወስደኩም ኣለና...</h2>
        <div class="loader"></div>
        <p>ኣፕሊኬሽንኩም ብኣውቶማቲክ እንተዘይተኸፊቱ፡ <a href="meyda://profile/${userProfile._id}" style="color: #029eff;">ኣብዚ ጠውቑ</a></p>

        <script>
          // 🚀 ማጂክ ሪዳይሬክት (Deep Linking)
          window.location.href = "meyda://profile/${userProfile._id}";
          
          setTimeout(function() {
             window.location.href = "https://play.google.com/store/apps/details?id=com.jentra.meyda";
          }, 3000);
        </script>
      </body>
      </html>
    `;

    res.send(html);

  } catch (error) {
    console.error("Profile Share Error:", error);
    res.status(500).send('Server Error');
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
        
        
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(); // ዲፎልት ባዕሉ ክሕዝ እዩ (ካብ Schema)
            await settings.save();
        }

        res.status(200).json({
            users: userCount,
            products: productCount,
            
            // 🚀 ሓዱሽ ማጂክ: ን ሞባይል (Dashboard) ዝኸይድ ሓዱሽ ሓበሬታ
            settings: {
               
                requireSellSub: settings.requireSellSub,
                requireProSub: settings.requireProSub,
                requireAdsSub: settings.requireAdsSub
            },
            packages: settings.packages
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

// 19.4 🚀 ማጂክ: ማስተር ስዊች ን 3ቲኦም ብሓንሳብ ሴቭ ዝገብር (Toggle Master Switches)
app.post('/api/admin/settings', async (req, res) => {
    try {
        const {  requireSellSub, requireProSub, requireAdsSub } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();
        
       
        if (requireSellSub !== undefined) settings.requireSellSub = requireSellSub;
        if (requireProSub !== undefined) settings.requireProSub = requireProSub;
        if (requireAdsSub !== undefined) settings.requireAdsSub = requireAdsSub;
        
        await settings.save();
        res.status(200).json({ message: "Settings updated successfully", settings });
    } catch (e) { 
        res.status(500).json({ message: "Error updating settings" }); 
    }
});

// 19.5 🚀 ማጂክ: ዋጋን ግዜን ናይ ፓኬጃት ሴቭ ዝገብር (Save Dynamic Packages)
app.post('/api/admin/packages', async (req, res) => {
    try {
        const newPackages = req.body; // ካብ ሞባይል {sell: {...}, pro: {...}, ads: {...}} ዝመጽእ
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();
        
        settings.packages = newPackages;
        await settings.save();
        
        res.status(200).json({ message: "Packages updated successfully", packages: settings.packages });
    } catch (e) {
        res.status(500).json({ message: "Error updating packages" });
    }
});



// 19.6 🚀 ማስተር ስዊች ን ክፍሊት (Check Status for sell.html)
app.get('/api/admin/settings/subscription-status', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        res.status(200).json({ require: settings ? settings.requireSubscription : false });
    } catch (e) { res.status(200).json({ require: false }); }
});
// 19.7 🚀 ማጂክ: ኩሎም ዝጽበዩ ዘለዉ ቨሪፊኬሽን ሕቶታት ምምጻእ (Get Pending Verifications)
app.get('/api/admin/verifications/pending', async (req, res) => {
    try {
        const pendingUsers = await User.find({ verificationStatus: 'pending' })
                                       .select('name email phone profilePic verificationData');
        res.status(200).json(pendingUsers);
    } catch (error) {
        res.status(500).json({ message: "ሕቶታት ክመጹ ኣይከኣሉን።" });
    }
});

// 19.8 🚀 ማጂክ: ቨሪፊኬሽን ምጽዳቕ (Approve) ወይ ምንጻግ (Reject)
app.put('/api/admin/verifications/:id/review', async (req, res) => {
    try {
        const { status, badgeType } = req.body; // status: 'approved' ወይ 'rejected', badgeType: 'blue' ወይ 'gold'

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            verificationStatus: status,
            isVerified: status === 'approved',
            badgeType: status === 'approved' ? badgeType : 'none'
        }, { new: true });

        res.status(200).json({ message: `ተጠቃሚ ብዓወት ${status} ኮይኑ ኣሎ!`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "ስጉምቲ ምውሳድ ኣይተኻእለን።" });
    }
});
// ==========================================================
// 19.9 🚀 API: ቨሪፊኬሽን ምልዓልን ብስም Meyda መልእኽቲ ምስዳድን (Revoke Badge)
// ==========================================================

app.post('/api/admin/users/:id/revoke-badge', async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን!" });
    }

    // 💡 1. ቨሪፊኬሽን ምልዓል (Get Verified በተን ንኽትምለስ)
    user.badgeType = "none";
    user.isVerified = false;
    user.verificationStatus = "rejected"; 
    await user.save();

    // 💡 2. ናይ Meyda Owner ኣካውንት ምድላይ (መልእኽቲ ዝሰድድ)
    const meydaAdmin = await User.findOne({ role: "owner" }) || await User.findOne({ name: "Meyda" });
    const senderId = meydaAdmin ? meydaAdmin._id : null; 

    const messageText = `ሰላም ${user.name}፣\n\nብሕግታትን ደንብታትን Meyda Market መሰረት፡ ናይ ቨሪፊኬሽን ባጅኩም ተላዒሉ ኣሎ።\n\nምኽንያት:\n"${reason}"\n\nተወሳኺ ሓበሬታ እንተደሊኹም ወይ ጌጋ እዩ ኢልኩም እንተኣሚንኩም፡ ዳግማይ ሕቶ (Get Verified) ክትልእኩ ትኽእሉ ኢኹም።\n\n- Meyda Team`;

    // 💡 3. ፍታሕ ናይ መልእኽቲ (Message) 
    if (senderId) {
        try {
          // ⚠️ ማጂክ: ሞዴልካ 'Message' እዩ ዝብል፣ 'Chat' ኣይኮነን!
          const systemMessage = new Message({
            senderId: senderId,
            senderName: "Meyda Market", // 👈 💡 ሞዴልካ senderName ግድን ይደሊ እዩ!
            receiverId: user._id,
            text: messageText,
            type: "system", // ስርዓታዊ መልእኽቲ ንምፍላይ
            createdAt: new Date(),
          });
          await systemMessage.save();
        } catch (msgErr) {
          console.log("⚠️ ጌጋ ኣብ Message:", msgErr.message);
        }
    } else {
        console.log("⚠️ ጌጋ: 'owner' ወይ 'Meyda' ኣካውንት ኣብ ዳታቤዝ ኣይተረኽበን።");
    }

    // መዘኻኸሪ: Notification ሞዴል ኣብ server.js ስለዘየለ ንግዚኡ ኣውጺእናዮ ኣለና። (ኣድለይነቱ እውን የለን መልእኽቲ ብ Inbox ስለዝኸይድ)

    res.status(200).json({ message: "ብዓወት ተላዒሉን መልእኽቲ ተላኢኹን ኣሎ!" });
  } catch (error) {
    console.error("Revoke Badge Error:", error);
    res.status(500).json({ message: "ጸገም ኣጋጢሙ ኣሎ።" });
  }
});
// =====================================================================
// 20. 🚀 ሓዱሽ ማጂክ: ተጠቃሚ ንምእጋድን (Block) ንምፍታሕን (Unblock)
// =====================================================================
app.post('/api/users/:userId/block', async (req, res) => {
    try {
        const { userId } = req.params; // ኣነ (እቲ ዝእግድ ዘሎ)
        const { blockUserId, action } = req.body; // እቲ ዝእገድ ዘሎን፣ እቲ ስጉምቲን (block/unblock)

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "ተጠቃሚ ኣይተረኽበን" });

        // ማህደር እንተዘይብሉ ሓዳስ ንፍጠረሉ
        if (!user.blockedUsers) user.blockedUsers = [];

        if (action === 'block' && !user.blockedUsers.includes(blockUserId)) {
            user.blockedUsers.push(blockUserId);
            await user.save();
            return res.status(200).json({ message: "ተጠቃሚ ብዓወት ተኣጊዱ ኣሎ።", blockedUsers: user.blockedUsers });
        } 
        else if (action === 'unblock') {
            user.blockedUsers = user.blockedUsers.filter(id => id !== blockUserId);
            await user.save();
            return res.status(200).json({ message: "ተጠቃሚ ብዓወት ተፈቲሑ ኣሎ።", blockedUsers: user.blockedUsers });
        }

        res.status(200).json({ message: "ምንም ለውጢ ኣይተገብረን።", blockedUsers: user.blockedUsers });
    } catch (error) {
        console.error("Block Error:", error);
        res.status(500).json({ message: "ስጉምቲ ምውሳድ ኣይተኻእለን。" });
    }
});
// =====================================================================
// 20.5 🚀 ሓዱሽ ማጂክ: ተጠቃሚ ቨሪፊኬሽን ዝሓተሉ (Request Verification)
// =====================================================================
// 💡 ማጂክ: ክልተ ስእልታት ብሓንሳብ ይቕበል (idImage ን selfieImage ን)
app.post('/api/users/:id/request-verification', upload.fields([{ name: 'idImage', maxCount: 1 }, { name: 'selfieImage', maxCount: 1 }]), async (req, res) => {
    try {
        const { idType, tinNumber, businessName } = req.body;
        
        let idImagePath = req.files && req.files['idImage'] ? req.files['idImage'][0].path : "";
        let selfieImagePath = req.files && req.files['selfieImage'] ? req.files['selfieImage'][0].path : "";

        if (!idImagePath || !selfieImagePath) {
            return res.status(400).json({ message: "ስእሊ መታወቂያን ላይቭ ሰልፊን ግድን እዩ።" });
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, {
            verificationStatus: 'pending',
            verificationData: {
                idType,
                idImage: idImagePath,
                selfieImage: selfieImagePath,
                tinNumber: tinNumber || "",
                businessName: businessName || "",
                submittedAt: new Date()
            }
        }, { new: true });

        res.status(200).json({ message: "ሕቶኹም ብዓወት ተቐቢልናዮ ኣለና! ኣድሚን ምስ ረኣዮ መልሲ ክንህበኩም ኢና።" });
    } catch (error) {
        console.error("Verification Request Error:", error);
        res.status(500).json({ message: "ሕቶኹም ክለኣኽ ኣይከኣለን።" });
    }
});

// =====================================================================
// 21. ሰርቨር ምጅማር (Start Server)
// =====================================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Meyda ሰርቨር ኣብ ፖርት ${PORT} ይሰርሕ ኣሎ...`);
});