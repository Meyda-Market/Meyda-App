const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
// =====================================================================
// ስእልታት መቐመጢ (Multer Setup)
// =====================================================================
// 'uploads' ዝበሃል ፎልደር እንተዘየለ ባዕሉ ክፈጥር
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// እዞም ስእልታት ንኹሉ ሰብ ክረኣዩ መታን (Static folder)
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // ስእልታት ኣብዚ ፎልደር ይዕቀቡ
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // ስም ናይቲ ስእሊ ምስ ግዜ ይሕወስ (ከይድገም)
    }
});
const upload = multer({ storage: storage });
app.use(cors());
app.use(express.json());

// ምስ ዳታቤዝካ (Local MongoDB) መራኸቢ ሊንክ
const DB_URI = 'mongodb://127.0.0.1:27017/meyda_database';

mongoose.connect(DB_URI)
  .then(() => console.log('✅ ብዓወት ምስ Local MongoDB ተራኺቡ ኣሎ!'))
  .catch((err) => console.log('❌ ምስ ዳታቤዝ ክራኸብ ኣይከኣለን: ', err));

// =====================================================================
// 1. መዋቕር ዳታቤዝ (Database Schema & Model)
// =====================================================================
// እዚ ማለት ሓደ ተጠቃሚ (User) ኣብ ዳታቤዝ Meyda እንታይ ዓይነት ሓበሬታ 
// ክህልዎ ከምዘለዎ ዝገልጽ ሕጊ (Blueprint) እዩ።
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true }, // ምሉእ ስም (ግድን ክኣቱ ዘለዎ)
    phone: { type: String, required: true, unique: true }, // ስልኪ ቁጽሪ (ግድን፣ ከምኡ'ውን ኣብ ዳታቤዝ ሓደ ጥራሕ ክኸውን ኣለዎ/unique)
    password: { type: String, required: true } // ፓስዎርድ (ንግዚኡ ከምዘለዎ ክንዕቅቦ ኢና፡ ንመጻኢ ግን ንጸጥታ ክንቅይሮ/Encrypt ክንገብሮ ኢና)
});

// ነዚ ኣብ ላዕሊ ዘሎ ሕጊ ተጠቒምና 'User' ዝበሃል ሞዴል (Model) ንፈጥር።
// በዚ ሞዴል ኣቢልና ኢና ዳታ እንዕቅብን እንድልን።
const User = mongoose.model('User', userSchema);


// =====================================================================
// 2. መቐበሊ መልእኽቲ (API Route ን Sign Up)
// =====================================================================
// ተጠቃሚ Sign Up ክገብር ከሎ፡ እቲ HTML ፎርም ናብዚ '/api/signup' ዝብል መንገዲ (Route) ዳታ ክሰድድ እዩ።
// 'app.post' ማለት ሓበሬታ ንምቕባል ዝተዳለወ መንገዲ ማለት እዩ።
app.post('/api/signup', async (req, res) => {
    try {
        // 1ይ ስጉምቲ፡ እቲ ካብ Front-end (index.html) ዝመጸ ሓበሬታ ንቕበሎ (Extract data from request body)
        const { fullName, phone, password } = req.body;

        // 2ይ ስጉምቲ፡ እዚ ቁጽሪ ስልኪ ቅድሚ ሕጂ ኣብ ዳታቤዝ እንተሎ ንፍተሽ
        const existingUser = await User.findOne({ phone: phone });
        
        if (existingUser) {
            // ተመዝጊቡ እንተጸኒሑ፡ ናይ ጌጋ መልእኽቲ ንመልሰሉ (Status 400 ማለት Bad Request እዩ)
            return res.status(400).json({ message: "እዚ ቁጽሪ ስልኪ ድሮ ተመዝጊቡ ኣሎ! በጃኹም Log In ግበሩ።" });
        }

        // 3ይ ስጉምቲ፡ ሓዱሽ ተጠቃሚ ስለዝኾነ፡ ነቲ ሓበሬታኡ ኣብ ዳታቤዝ ንምዝግቦ ዳታ ነዳሉ
        const newUser = new User({
            fullName: fullName, // ስም የኣቱ
            phone: phone,       // ስልኪ የኣቱ
            password: password  // ፓስዎርድ የኣቱ
        });

        // 4ይ ስጉምቲ፡ ኣብ ዳታቤዝ ብትኽክል ሴቭ (Save) ንገብሮ
        await newUser.save();

        // 5ይ ስጉምቲ፡ ሴቭ ምስ ኮነ፡ ናይ ዓወት መልእኽቲ (Success Message) ናብ Front-end ንመልስ
        // (Status 201 ማለት Created ወይ ብዓወት ተፈጢሩ ማለት እዩ)
        res.status(201).json({ message: "እንቋዕ ብደሓን መጻእኩም! ብዓወት ተመዝጊብኩም ኣለኹም።" });

    } catch (error) {
        // ዝኾነ ዘይተጸበናዮ ጌጋ (Error) እንተጋጢሙ፡ ናይ ጌጋ መልእኽቲ ንሰድድ (Status 500 ማለት Server Error)
        console.error("Sign Up Error:", error);
        res.status(500).json({ message: "ይቕሬታ! ናይ ሰርቨር ጸገም ኣጋጢሙ ኣሎ።" });
    }
});
// =====================================================================
// API መራኸቢ: ን Log In (እቶ) ዝኸውን ሎጂክ
// =====================================================================
app.post('/api/login', async (req, res) => {
    try {
        // 1. ካብ Front-end ዝመጸ ስልክን ፓስዎርድን ንቕበል
        const { phone, password } = req.body;

        // 2. እዚ ቁጽሪ ስልኪ ኣብ ዳታቤዝ (MongoDB) እንተሎ ንፍተሽ
        const user = await User.findOne({ phone: phone });

        if (!user) {
            // ተጠቃሚ እንተዘይተረኺቡ ናይ ጌጋ መልእኽቲ ንመልስ
            return res.status(400).json({ message: "እዚ ቁጽሪ ስልኪ ኣይተመዝገበን። በጃኹም Sign Up ግበሩ።" });
        }

        // 3. ቁጽሪ ስልኪ እንተተረኺቡ፡ ፓስዎርድ ትኽክል ምዃኑ ንፍተሽ
        if (user.password !== password) {
            return res.status(400).json({ message: "ዘእቶኹሞ ፓስዎርድ ጌጋ እዩ።" });
        }

        // 4. ኩሉ ትኽክል እንተኾይኑ፡ ናይ ዓወት መልእኽቲ ንሰድድ (Status 200)
        res.status(200).json({ message: "ብዓወት ኣቲኹም ኣለኹም!" });

    } catch (error) {
        console.error("Log In Error:", error);
        res.status(500).json({ message: "ይቕሬታ! ናይ ሰርቨር ጸገም ኣጋጢሙ ኣሎ።" });
    }
});
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
    images: [{ type: String }],
    icon: { type: String, default: 'fa-box' },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// =====================================================================
// 5. API መራኸቢ: ኣቕሑት ካብ ዳታቤዝ ንምምጻእ (GET Products) -> እዚኣ እያ ጠፊኣ ነይራ!
// =====================================================================
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "ኣቕሑት ክመጹ ኣይከኣሉን።" });
    }
});

// =====================================================================
// 6. API መራኸቢ: ሓዱሽ ንብረት ንምምዝጋብ (POST Product)
// =====================================================================
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        const { title, price, category, condition, location, description, icon } = req.body;
        const imagePaths = req.files ? req.files.map(file => '/uploads/' + file.filename) : [];

        const newProduct = new Product({
            title, price, category, condition, location, description, icon,
            images: imagePaths
        });

        await newProduct.save();
        res.status(201).json({ message: "ንብረትኩም ብዓወት ንዕዳጋ ቀሪቡ ኣሎ!" });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ message: "ንብረት ምምዝጋብ ኣይተኻእለን።" });
    }
});
// =====================================================================
// 3. ሰርቨር ምጅማር (Start Server)
// =====================================================================
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Meyda ሰርቨር ኣብ ፖርት ${PORT} ይሰርሕ ኣሎ...`);
});